import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
	makeDeclarationsPortable,
	rewriteDeclaration,
} from "./portable-declarations.mjs";

const ts = createRequire(import.meta.url)(
	process.env.SHARED_TYPESCRIPT_MODULE || "typescript",
);
const rejected = (suffix) => (error) =>
	error.code === `PORTABLE_DECLARATIONS_${suffix}` &&
	!String(error).includes("private");
function fixture(t) {
	const directory = fs.realpathSync(
			fs.mkdtempSync(path.join(os.tmpdir(), "carbonnode-portable-")),
		),
		root = path.join(directory, "node_modules/@carbonorm/carbonnode");
	t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
	fs.mkdirSync(root, { recursive: true });
	fs.writeFileSync(
		path.join(root, "package.json"),
		JSON.stringify({
			name: "@carbonorm/carbonnode",
			version: "7.1.0",
			type: "module",
			types: "dist/index.d.ts",
			exports: {
				".": {
					types: "./dist/index.d.ts",
					import: "./dist/index.esm.js",
					require: "./dist/index.cjs",
				},
			},
		}),
	);
	fs.writeFileSync(
		path.join(root, "tsconfig.json"),
		JSON.stringify({
			compilerOptions: { baseUrl: "./src/", declarationDir: "dist" },
		}),
	);
	const write = (relative, text) => {
		const target = path.join(root, "dist", relative);
		fs.mkdirSync(path.dirname(target), { recursive: true });
		fs.writeFileSync(target, text);
	};
	write(
		"index.d.ts",
		'export type { ToastOptions } from "./utils/toastRuntime";\nexport { ToastOwner } from "./variables/toastOptions";\n',
	);
	write(
		"utils/toastRuntime.d.ts",
		'import type { ToastOwner } from "variables/toastOptions";\nexport type ToastOptions = { owner: ToastOwner };\n',
	);
	write(
		"variables/toastOptions.d.ts",
		"export declare class ToastOwner { private brand; readonly value: string; }\n",
	);
	write(
		"index.esm.js",
		"// exact runtime bytes remain untouched\nexport {};\n",
	);
	write(
		"index.cjs",
		"// exact runtime bytes remain untouched\nmodule.exports={};\n",
	);
	const read = (relative) =>
		fs.readFileSync(path.join(root, "dist", relative), "utf8");
	return {
		directory,
		root,
		write,
		read,
		run: () => makeDeclarationsPortable({ root, ts }),
	};
}
function diagnostics(file, options) {
	return ts
		.getPreEmitDiagnostics(
			ts.createProgram([file], {
				noEmit: true,
				strict: true,
				skipLibCheck: false,
				target: ts.ScriptTarget.ES2022,
				...options,
			}),
		)
		.map((item) => item.code);
}

test("range edits correct actual bare-variable and relative declaration edges without changing payload", () => {
	const text =
		'// preserved comment: variables/toastOptions\nimport type { ToastOwner } from "variables/toastOptions";\nexport { ToastOwner as Owner } from "../variables/toastOptions";\nexport type Shape = import("../variables/toastOptions.ts").ToastOwner;\nimport Imported = require("../variables/toastOptions.js");\nexport type Named = Imported.ToastOwner;\nexport type Literal = "variables/toastOptions";\n';
	const result = rewriteDeclaration({
		ts,
		file: "utils/toastRuntime.d.ts",
		text,
		declarationFiles: [
			"utils/toastRuntime.d.ts",
			"variables/toastOptions.d.ts",
		],
		localRoots: ["variables"],
	});
	assert.equal(result.rewrittenEdges, 3);
	assert.equal(
		result.text,
		text
			.replace(
				'from "variables/toastOptions"',
				'from "../variables/toastOptions.js"',
			)
			.replace(
				'from "../variables/toastOptions"',
				'from "../variables/toastOptions.js"',
			)
			.replace(
				'import("../variables/toastOptions.ts")',
				'import("../variables/toastOptions.js")',
			),
	);
});

test("same original package declaration identity passes strict NodeNext and Bundler after real emitted graph correction", (t) => {
	const f = fixture(t),
		witness = path.join(f.directory, "consumer.mts");
	fs.writeFileSync(
		witness,
		'import type {ToastOptions,ToastOwner} from "@carbonorm/carbonnode";\ntype IsAny<T>=0 extends(1&T)?true:false;type IsNever<T>=[T]extends[never]?true:false;type Check<T extends false>=T;type A=Check<IsAny<ToastOptions["owner"]>>;type N=Check<IsNever<ToastOptions["owner"]>>;declare let indirect:ToastOptions["owner"],direct:ToastOwner;indirect=direct;direct=indirect;\n',
	);
	const options = {
		module: ts.ModuleKind.NodeNext,
		moduleResolution: ts.ModuleResolutionKind.NodeNext,
	};
	assert.ok(diagnostics(witness, options).length > 0);
	const metadata = fs.readFileSync(path.join(f.root, "package.json")),
		declaration = f.read("variables/toastOptions.d.ts"),
		runtime = [f.read("index.esm.js"), f.read("index.cjs")];
	const result = f.run();
	assert.equal(result.files, 3);
	assert.equal(result.rewrittenEdges, 3);
	assert.equal(result.changedFiles, 2);
	assert.deepEqual(diagnostics(witness, options), []);
	assert.deepEqual(
		diagnostics(witness, {
			module: ts.ModuleKind.ESNext,
			moduleResolution: ts.ModuleResolutionKind.Bundler,
		}),
		[],
	);
	assert.equal(f.read("variables/toastOptions.d.ts"), declaration);
	assert.deepEqual(
		fs.readFileSync(path.join(f.root, "package.json")),
		metadata,
	);
	assert.deepEqual([f.read("index.esm.js"), f.read("index.cjs")], runtime);
	const again = f.run();
	assert.equal(again.changedFiles, 0);
	assert.equal(again.rewrittenEdges, 0);
	assert.equal(again.memberManifestSha256, result.memberManifestSha256);
});

test("complete graph validation refuses missing, ambiguous and escaping edges before any declaration rewrite", (t) => {
	for (const [edge, extra, code] of [
		["variables/missing", null, "EDGE_MISSING"],
		[
			"../variables/toastOptions",
			["variables/toastOptions/index.d.ts", "export interface Other {}"],
			"EDGE_AMBIGUOUS",
		],
		["../../private", null, "EDGE_ESCAPE"],
	]) {
		const f = fixture(t);
		f.write(
			"utils/toastRuntime.d.ts",
			`export * from ${JSON.stringify(edge)};\n`,
		);
		if (extra) f.write(...extra);
		const before = f.read("index.d.ts");
		assert.throws(f.run, rejected(code));
		assert.equal(f.read("index.d.ts"), before);
	}
});

test("nonlocal dependencies and ordinary literals stay external; directory indexes and import types become portable", () => {
	const text =
		'import type {Pool} from "mysql2/promise";\nexport type { Item } from "./shape";\nexport type Import = import("./shape/index.tsx").Item;\nexport type Literal = "./shape";\n';
	const result = rewriteDeclaration({
		ts,
		file: "index.d.ts",
		text,
		declarationFiles: ["index.d.ts", "shape/index.d.ts"],
		localRoots: ["variables"],
	});
	assert.equal(result.rewrittenEdges, 2);
	assert.ok(result.text.includes('from "mysql2/promise"'));
	assert.ok(result.text.includes('Literal = "./shape"'));
	assert.equal((result.text.match(/\.\/shape\/index\.js/g) ?? []).length, 2);
});

test("symlinks, hardlinks, invalid declarations and fake providers cannot modify output or expose private errors", (t) => {
	for (const mode of ["symlink", "hardlink", "parse"]) {
		const f = fixture(t);
		const original = path.join(f.root, "dist/variables/toastOptions.d.ts"),
			target = path.join(f.root, "dist/private.d.ts");
		if (mode === "symlink") fs.symlinkSync(original, target);
		else if (mode === "hardlink") fs.linkSync(original, target);
		else f.write("private.d.ts", "export interface {\n");
		const before = f.read("index.d.ts");
		assert.throws(f.run, rejected(mode === "parse" ? "PARSE" : "FILE"));
		assert.equal(f.read("index.d.ts"), before);
	}
	let calls = 0;
	const provider = Object.create(ts);
	Object.defineProperty(provider, "createSourceFile", {
		value: () => {
			throw Object.defineProperty({}, "code", {
				get() {
					calls++;
					throw Error("private");
				},
			});
		},
	});
	assert.throws(
		() =>
			rewriteDeclaration({
				ts: provider,
				file: "index.d.ts",
				text: "export interface A {}",
				declarationFiles: ["index.d.ts"],
				localRoots: ["variables"],
			}),
		rejected("UNAVAILABLE"),
	);
	assert.equal(calls, 0);
});

test("graph input arrays reject getters without calling them and paths cannot alias by case", () => {
	let calls = 0;
	const files = ["index.d.ts"];
	Object.defineProperty(files, "0", {
		get() {
			calls++;
			return "private";
		},
		enumerable: true,
	});
	assert.throws(
		() =>
			rewriteDeclaration({
				ts,
				file: "index.d.ts",
				text: "export interface A {}",
				declarationFiles: files,
				localRoots: ["variables"],
			}),
		rejected("INPUT"),
	);
	assert.equal(calls, 0);
	assert.throws(
		() =>
			rewriteDeclaration({
				ts,
				file: "index.d.ts",
				text: "export interface A {}",
				declarationFiles: ["index.d.ts", "INDEX.d.ts"],
				localRoots: ["variables"],
			}),
		rejected("GRAPH"),
	);
});

test("original build and Vitest test gates retain declaration regression in their normal lifecycle", () => {
	const pkg = JSON.parse(
		fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"),
	);
	assert.equal(
		pkg.scripts.build,
		"rm -rf src/api/rest && npm run build:index && npm run build:generateRestBindings && rollup -c && node scripts/portable-declarations.mjs",
	);
	assert.equal(
		pkg.scripts.test,
		"node --test scripts/portable-declarations.test.mjs scripts/setup-git-hooks.test.mjs && vitest run --reporter=dot",
	);
});
