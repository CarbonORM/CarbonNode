import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const errors = new WeakSet();
const LIMIT = Object.freeze({
	files: 4096,
	entries: 16384,
	fileBytes: 4 * 1024 ** 2,
	totalBytes: 64 * 1024 ** 2,
});
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const fail = (suffix) => {
	const error = Object.freeze(
		Object.assign(Error("Portable declarations refused"), {
			code: `PORTABLE_DECLARATIONS_${suffix}`,
		}),
	);
	errors.add(error);
	throw error;
};
const need = (condition, suffix) => {
	if (!condition) fail(suffix);
};
const safe = (value) =>
	typeof value === "string" &&
	value.length <= 512 &&
	value
		.split("/")
		.every(
			(part) =>
				/^[A-Za-z0-9_][A-Za-z0-9_.-]*$/.test(part) &&
				part !== "." &&
				part !== "..",
		);
function record(value, keys) {
	need(
		value !== null &&
			typeof value === "object" &&
			!Array.isArray(value) &&
			[Object.prototype, null].includes(Object.getPrototypeOf(value)),
		"INPUT",
	);
	const fields = Object.getOwnPropertyDescriptors(value);
	need(
		Reflect.ownKeys(fields).length === keys.length &&
			keys.every(
				(key) =>
					Object.hasOwn(fields, key) && Object.hasOwn(fields[key], "value"),
			),
		"INPUT",
	);
	return Object.fromEntries(keys.map((key) => [key, fields[key].value]));
}
function array(value, maximum) {
	need(Array.isArray(value), "INPUT");
	const fields = Object.getOwnPropertyDescriptors(value),
		count = fields.length?.value;
	need(
		Number.isInteger(count) &&
			count >= 0 &&
			count <= maximum &&
			Reflect.ownKeys(fields).length === count + 1,
		"INPUT",
	);
	return Array.from({ length: count }, (_, index) => {
		need(Object.hasOwn(fields[index] ?? {}, "value"), "INPUT");
		return fields[index].value;
	});
}

// Shared pure AST/range-edit contract. All non-module-literal declaration bytes
// (including private class members) remain exactly as emitted by TypeScript.
export function rewriteDeclaration(options) {
	try {
		const { ts, file, text, declarationFiles, localRoots } = record(options, [
			"ts",
			"file",
			"text",
			"declarationFiles",
			"localRoots",
		]);
		need(
			typeof ts?.createSourceFile === "function" &&
				/^5\.(?:8|9)\.\d+$/.test(ts.version),
			"TYPESCRIPT",
		);
		const files = array(declarationFiles, LIMIT.files),
			roots = array(localRoots, 64),
			known = new Set(),
			folded = new Set();
		for (const name of files) {
			need(
				safe(name) && name.endsWith(".d.ts") && !folded.has(name.toLowerCase()),
				"GRAPH",
			);
			known.add(name);
			folded.add(name.toLowerCase());
		}
		need(
			known.has(file) &&
				typeof text === "string" &&
				Buffer.byteLength(text) <= LIMIT.fileBytes &&
				!text.includes("\0") &&
				roots.every((name) => safe(name) && !name.includes("/")),
			"INPUT",
		);
		const parsed = ts.createSourceFile(
			file,
			text,
			ts.ScriptTarget.Latest,
			true,
			ts.ScriptKind.TS,
		);
		need(
			parsed.isDeclarationFile &&
				parsed.parseDiagnostics.length === 0 &&
				parsed.referencedFiles.length === 0 &&
				!parsed.hasNoDefaultLib,
			"PARSE",
		);
		const edits = [];
		const resolve = (specifier) => {
			need(
				typeof specifier === "string" &&
					specifier.length <= 512 &&
					!/[\\%?#\s\0]/.test(specifier),
				"EDGE",
			);
			const relative = specifier.startsWith("."),
				local = roots.some(
					(root) => specifier === root || specifier.startsWith(`${root}/`),
				);
			if (!relative && !local) {
				need(
					/^(?:node:[A-Za-z0-9_./-]+|(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*(?:\/[A-Za-z0-9_][A-Za-z0-9_.-]*)*)$/.test(
						specifier,
					),
					"EXTERNAL_EDGE",
				);
				return null;
			}
			need(!relative || /^(?:\.\/|\.\.\/)/.test(specifier), "EDGE");
			const base = path.posix.normalize(
				relative
					? path.posix.join(path.posix.dirname(file), specifier)
					: specifier,
			);
			need(safe(base), "EDGE_ESCAPE");
			let candidates;
			if (base.endsWith(".d.ts")) candidates = [base];
			else if (base.endsWith(".js")) candidates = [`${base.slice(0, -3)}.d.ts`];
			else if (/\.tsx?$/.test(base))
				candidates = [`${base.replace(/\.tsx?$/, "")}.d.ts`];
			else candidates = [`${base}.d.ts`, `${base}/index.d.ts`];
			const matches = candidates.filter((candidate) => known.has(candidate));
			need(
				matches.length === 1,
				matches.length ? "EDGE_AMBIGUOUS" : "EDGE_MISSING",
			);
			let target = path.posix.relative(
				path.posix.dirname(file),
				`${matches[0].slice(0, -5)}.js`,
			);
			if (!target.startsWith(".")) target = `./${target}`;
			return target;
		};
		const visit = (node) => {
			if (ts.isImportTypeNode(node))
				need(
					ts.isLiteralTypeNode(node.argument) &&
						ts.isStringLiteral(node.argument.literal),
					"EDGE",
				);
			const parent = node.parent;
			const edge =
				ts.isStringLiteral(node) &&
				parent &&
				(((ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent)) &&
					parent.moduleSpecifier === node) ||
					(ts.isLiteralTypeNode(parent) &&
						ts.isImportTypeNode(parent.parent) &&
						parent.parent.argument === parent) ||
					(ts.isExternalModuleReference(parent) &&
						parent.expression === node) ||
					(ts.isModuleDeclaration(parent) && parent.name === node));
			if (edge) {
				const target = resolve(node.text);
				if (target !== null && target !== node.text)
					edits.push({
						start: node.getStart(parsed),
						end: node.end,
						text: JSON.stringify(target),
					});
			}
			ts.forEachChild(node, visit);
		};
		visit(parsed);
		edits.sort((a, b) => b.start - a.start);
		let output = text,
			last = text.length;
		for (const edit of edits) {
			need(edit.end <= last, "EDGE_OVERLAP");
			output = output.slice(0, edit.start) + edit.text + output.slice(edit.end);
			last = edit.start;
		}
		return Object.freeze({ text: output, rewrittenEdges: edits.length });
	} catch (error) {
		if (errors.has(error)) throw error;
		fail("UNAVAILABLE");
	}
}

const signature = (stat) =>
	[
		stat.dev,
		stat.ino,
		stat.mode,
		stat.nlink,
		stat.size,
		stat.mtimeNs,
		stat.ctimeNs,
	]
		.map(String)
		.join(":");
function regular(file, maximum) {
	const stat = fs.lstatSync(file, { bigint: true });
	need(
		stat.isFile() &&
			!stat.isSymbolicLink() &&
			stat.nlink === 1n &&
			stat.size <= BigInt(maximum),
		"FILE",
	);
	const fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
	try {
		need(
			signature(fs.fstatSync(fd, { bigint: true })) === signature(stat),
			"FILE_CHANGED",
		);
		const bytes = Buffer.alloc(Number(stat.size) + 1);
		let offset = 0;
		while (offset < bytes.length) {
			const count = fs.readSync(
				fd,
				bytes,
				offset,
				bytes.length - offset,
				offset,
			);
			if (!count) break;
			offset += count;
		}
		need(
			offset === Number(stat.size) &&
				signature(fs.fstatSync(fd, { bigint: true })) === signature(stat) &&
				signature(fs.lstatSync(file, { bigint: true })) === signature(stat),
			"FILE_CHANGED",
		);
		return { bytes: bytes.subarray(0, offset), stat };
	} finally {
		fs.closeSync(fd);
	}
}
export function makeDeclarationsPortable(options) {
	try {
		const { root, ts } = record(options, ["root", "ts"]);
		need(typeof root === "string" && path.isAbsolute(root), "ROOT");
		const original = fs.lstatSync(root);
		need(original.isDirectory() && !original.isSymbolicLink(), "ROOT");
		const directory = fs.realpathSync(root),
			dist = path.join(directory, "dist");
		const pkg = JSON.parse(
			regular(path.join(directory, "package.json"), 1024 ** 2).bytes.toString(
				"utf8",
			),
		);
		const config = JSON.parse(
			regular(path.join(directory, "tsconfig.json"), 1024 ** 2).bytes.toString(
				"utf8",
			),
		);
		need(
			pkg.name === "@carbonorm/carbonnode" &&
				path.resolve(directory, config.compilerOptions?.baseUrl ?? "") ===
					path.join(directory, "src") &&
				path.resolve(
					directory,
					config.compilerOptions?.declarationDir ?? "",
				) === dist,
			"PACKAGE_CONFIG",
		);
		const files = new Map(),
			directories = new Map();
		let count = 0,
			total = 0;
		const scan = (relative, depth = 0) => {
			need(depth <= 32, "DEPTH");
			const at = path.join(dist, relative),
				stat = fs.lstatSync(at, { bigint: true });
			need(stat.isDirectory() && !stat.isSymbolicLink(), "DIRECTORY");
			directories.set(at, signature(stat));
			for (const name of fs.readdirSync(at).sort()) {
				need(++count <= LIMIT.entries, "SIZE");
				const member = relative ? `${relative}/${name}` : name;
				need(safe(member), "PATH");
				const child = fs.lstatSync(path.join(dist, member));
				need(!child.isSymbolicLink(), "FILE");
				if (child.isDirectory()) scan(member, depth + 1);
				else {
					need(child.isFile() && child.nlink === 1, "FILE");
					if (member.endsWith(".d.ts")) {
						const read = regular(path.join(dist, member), LIMIT.fileBytes);
						total += read.bytes.length;
						need(files.size < LIMIT.files && total <= LIMIT.totalBytes, "SIZE");
						const text = new TextDecoder("utf-8", { fatal: true }).decode(
							read.bytes,
						);
						files.set(member, { ...read, text });
					}
				}
			}
		};
		scan("");
		need(files.size > 0, "EMPTY");
		const declarationFiles = [...files.keys()],
			changes = [],
			inventory = [];
		let rewrittenEdges = 0;
		for (const [file, input] of files) {
			const rewritten = rewriteDeclaration({
				ts,
				file,
				text: input.text,
				declarationFiles,
				localRoots: ["variables"],
			});
			rewrittenEdges += rewritten.rewrittenEdges;
			if (rewritten.text !== input.text)
				changes.push({ file, input, output: Buffer.from(rewritten.text) });
			inventory.push({
				path: file,
				bytes: Buffer.byteLength(rewritten.text),
				sha256: hash(rewritten.text),
			});
		}
		// Validate the entire emitted graph before changing any declaration.
		for (const [at, before] of directories)
			need(
				signature(fs.lstatSync(at, { bigint: true })) === before,
				"FILE_CHANGED",
			);
		for (const change of changes) {
			const absolute = path.join(dist, change.file),
				fd = fs.openSync(
					absolute,
					fs.constants.O_WRONLY | fs.constants.O_NOFOLLOW,
				);
			try {
				need(
					signature(fs.fstatSync(fd, { bigint: true })) ===
						signature(change.input.stat) &&
						signature(fs.lstatSync(absolute, { bigint: true })) ===
							signature(change.input.stat),
					"FILE_CHANGED",
				);
				fs.ftruncateSync(fd, 0);
				fs.writeFileSync(fd, change.output);
				fs.fsyncSync(fd);
			} finally {
				fs.closeSync(fd);
			}
			need(
				hash(regular(absolute, LIMIT.fileBytes).bytes) === hash(change.output),
				"WRITE_CHANGED",
			);
		}
		return Object.freeze({
			status: "portable-declarations",
			files: files.size,
			changedFiles: changes.length,
			rewrittenEdges,
			memberManifestSha256: hash(JSON.stringify(inventory)),
		});
	} catch (error) {
		if (errors.has(error)) throw error;
		fail("UNAVAILABLE");
	}
}
if (
	process.argv[1] &&
	path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
	try {
		need(process.argv.length === 2, "ARGUMENTS");
		const imported = await import("typescript");
		const result = makeDeclarationsPortable({
			root: process.cwd(),
			ts: imported.default ?? imported,
		});
		process.stdout.write(`${JSON.stringify(result)}\n`);
	} catch (error) {
		process.stderr.write(
			`${errors.has(error) ? error.code : "PORTABLE_DECLARATIONS_UNAVAILABLE"}\n`,
		);
		process.exitCode = 1;
	}
}
