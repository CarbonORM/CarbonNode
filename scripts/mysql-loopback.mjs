import { fork } from "node:child_process";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(import.meta.url);
const WAIT_MS = 10000;
const refuse = (code) =>
	Object.assign(Error("MySQL loopback fixture refused"), { code });

export async function openLoopback({
	upstreamHost,
	upstreamPort,
	port = 3306,
}) {
	const sockets = new Set();
	const forwarded = new Set();
	const server = net.createServer({ allowHalfOpen: true }, (incoming) => {
		const outgoing = net.createConnection({
			host: upstreamHost,
			port: upstreamPort,
			allowHalfOpen: true,
		});
		sockets.add(incoming);
		sockets.add(outgoing);
		const end = () => {
			incoming.destroy();
			outgoing.destroy();
		};
		incoming.on("error", end);
		outgoing.on("error", end);
		incoming.on("close", () => {
			sockets.delete(incoming);
			outgoing.destroy();
		});
		outgoing.on("close", (hadError) => {
			sockets.delete(outgoing);
			if (hadError || !outgoing.readableEnded) incoming.destroy();
		});
		outgoing.once("connect", () => {
			for (const resolve of forwarded) resolve(incoming.remotePort);
		});
		incoming.pipe(outgoing);
		outgoing.pipe(incoming);
	});
	await new Promise((resolve, reject) => {
		server.once("error", reject);
		server.listen({ host: "127.0.0.1", port, exclusive: true }, resolve);
	});
	server.on("error", () => {
		for (const socket of sockets) socket.destroy();
	});
	const close = async () => {
		for (const socket of sockets) socket.destroy();
		await new Promise((resolve, reject) =>
			server.close((error) => (error ? reject(error) : resolve())),
		);
	};
	const ready = async () => {
		let probe;
		let timer;
		let notify;
		try {
			await new Promise((resolve, reject) => {
				notify = (remotePort) => {
					if (probe.localPort === remotePort) resolve();
				};
				forwarded.add(notify);
				probe = net.createConnection({
					host: "127.0.0.1",
					port: server.address().port,
				});
				probe.on("error", () => reject(refuse("MYSQL_LOOPBACK_PROBE")));
				probe.on("close", () => reject(refuse("MYSQL_LOOPBACK_UPSTREAM")));
				probe.resume();
				timer = setTimeout(
					() => reject(refuse("MYSQL_LOOPBACK_DEADLINE")),
					WAIT_MS,
				);
			});
		} finally {
			clearTimeout(timer);
			forwarded.delete(notify);
			probe?.destroy();
		}
	};
	return Object.freeze({ port: server.address().port, ready, close });
}

function ownedRoot(root) {
	if (!path.isAbsolute(root)) throw refuse("MYSQL_LOOPBACK_STATE");
	const stat = fs.lstatSync(root);
	if (
		!stat.isDirectory() ||
		stat.isSymbolicLink() ||
		(stat.mode & 0o777) !== 0o700 ||
		stat.uid !== process.getuid()
	)
		throw refuse("MYSQL_LOOPBACK_STATE");
}

async function serve(root, nonce, settings) {
	ownedRoot(root);
	if (
		!settings ||
		!["mysql", "127.0.0.1"].includes(settings.upstreamHost) ||
		!Number.isInteger(settings.upstreamPort) ||
		settings.upstreamPort < 1 ||
		settings.upstreamPort > 65535 ||
		!Number.isInteger(settings.port) ||
		settings.port < 0 ||
		settings.port > 65535
	)
		throw refuse("MYSQL_LOOPBACK_ARGS");
	const bridge = await openLoopback(settings);
	let control;
	let stopping = false;
	const stop = async () => {
		if (stopping) return;
		stopping = true;
		await bridge.close();
		control?.close();
		for (const name of ["state.json", "control.sock"]) {
			try {
				fs.unlinkSync(path.join(root, name));
			} catch (error) {
				if (error.code !== "ENOENT") throw error;
			}
		}
		fs.rmdirSync(root);
	};
	try {
		await bridge.ready();
		control = net.createServer((socket) => {
			let text = "";
			socket.setTimeout(WAIT_MS, () => socket.destroy());
			socket.on("error", () => {});
			socket.on("data", (bytes) => {
				text += bytes.toString("utf8");
				if (Buffer.byteLength(text) > 256) return socket.destroy();
				if (!text.endsWith("\n")) return;
				if (text !== `${nonce}\n`) return socket.destroy();
				socket.pause();
				stop().then(
					() => socket.end("STOPPED\n"),
					() => {
						socket.destroy();
						process.exitCode = 1;
					},
				);
			});
		});
		await new Promise((resolve, reject) => {
			control.once("error", reject);
			control.listen(path.join(root, "control.sock"), resolve);
		});
		fs.writeFileSync(
			path.join(root, "state.json"),
			`${JSON.stringify({ schemaVersion: 1, pid: process.pid, nonce })}\n`,
			{ flag: "wx", mode: 0o600 },
		);
		process.once("SIGTERM", () => {
			void stop().catch(() => {
				process.exitCode = 1;
			});
		});
		process.once("SIGINT", () => {
			void stop().catch(() => {
				process.exitCode = 1;
			});
		});
		process.send?.({ ready: true, port: bridge.port });
		process.disconnect?.();
	} catch {
		await stop();
		throw refuse("MYSQL_LOOPBACK_START");
	}
}

export async function startFixture({
	root,
	upstreamHost = "mysql",
	upstreamPort = 3306,
	port = 3306,
}) {
	if (!path.isAbsolute(root)) throw refuse("MYSQL_LOOPBACK_STATE");
	fs.mkdirSync(root, { mode: 0o700 });
	const nonce = randomBytes(32).toString("hex");
	const child = fork(SCRIPT, ["serve", "--state", root, nonce], {
		detached: true,
		env: {},
		stdio: ["ignore", "ignore", "ignore", "ipc"],
	});
	const closed = new Promise((resolve) => child.once("exit", resolve));
	try {
		const actualPort = await new Promise((resolve, reject) => {
			const timer = setTimeout(
				() => reject(refuse("MYSQL_LOOPBACK_DEADLINE")),
				WAIT_MS + 2000,
			);
			child.once("message", (message) => {
				setImmediate(() => {
					clearTimeout(timer);
					message?.ready === true &&
					Number.isInteger(message.port) &&
					child.exitCode === null &&
					child.signalCode === null
						? resolve(message.port)
						: reject(refuse("MYSQL_LOOPBACK_START"));
				});
			});
			child.once("error", () => {
				clearTimeout(timer);
				reject(refuse("MYSQL_LOOPBACK_START"));
			});
			child.once("exit", () => {
				clearTimeout(timer);
				reject(refuse("MYSQL_LOOPBACK_START"));
			});
			child.send({ upstreamHost, upstreamPort, port }, (error) => {
				if (error) {
					clearTimeout(timer);
					reject(refuse("MYSQL_LOOPBACK_START"));
				}
			});
		});
		child.unref();
		return Object.freeze({ port: actualPort, closed });
	} catch (error) {
		child.kill("SIGTERM");
		const wait = async () => {
			let timer;
			try {
				return await Promise.race([
					closed.then(() => true),
					new Promise((resolve) => {
						timer = setTimeout(() => resolve(false), 1000);
					}),
				]);
			} finally {
				clearTimeout(timer);
			}
		};
		if (!(await wait())) {
			child.kill("SIGKILL");
			if (!(await wait())) {
				child.disconnect();
				child.unref();
				throw refuse("MYSQL_LOOPBACK_CLEANUP_UNKNOWN");
			}
		}
		throw error;
	}
}

export async function stopFixture(root) {
	if (!fs.existsSync(root)) return;
	ownedRoot(root);
	const stateFile = path.join(root, "state.json");
	const stat = fs.lstatSync(stateFile);
	if (
		!stat.isFile() ||
		stat.isSymbolicLink() ||
		stat.nlink !== 1 ||
		stat.uid !== process.getuid() ||
		stat.size > 1024 ||
		(stat.mode & 0o777) !== 0o600
	)
		throw refuse("MYSQL_LOOPBACK_STATE");
	const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
	if (
		state.schemaVersion !== 1 ||
		!Number.isSafeInteger(state.pid) ||
		!/^[a-f0-9]{64}$/.test(state.nonce)
	)
		throw refuse("MYSQL_LOOPBACK_STATE");
	await new Promise((resolve, reject) => {
		const socket = net.createConnection(path.join(root, "control.sock"));
		let reply = "";
		socket.setTimeout(WAIT_MS, () => {
			socket.destroy();
			reject(refuse("MYSQL_LOOPBACK_DEADLINE"));
		});
		socket.once("connect", () => socket.write(`${state.nonce}\n`));
		socket.on("data", (bytes) => {
			reply += bytes.toString("utf8");
			if (reply.length > 32) socket.destroy();
		});
		socket.once("error", () => reject(refuse("MYSQL_LOOPBACK_STOP")));
		socket.once("close", () =>
			reply === "STOPPED\n" && !fs.existsSync(root)
				? resolve()
				: reject(refuse("MYSQL_LOOPBACK_STOP")),
		);
	});
}

async function main() {
	const [mode, flag, root, nonce, ...extra] = process.argv.slice(2);
	if (
		flag !== "--state" ||
		extra.length ||
		!["start", "stop", "serve"].includes(mode) ||
		(mode !== "serve" && nonce !== undefined)
	)
		throw refuse("MYSQL_LOOPBACK_ARGS");
	if (mode === "serve") {
		if (!process.send || !/^[a-f0-9]{64}$/.test(nonce ?? ""))
			throw refuse("MYSQL_LOOPBACK_ARGS");
		const settings = await new Promise((resolve) =>
			process.once("message", resolve),
		);
		await serve(root, nonce, settings);
	} else if (mode === "start") await startFixture({ root });
	else await stopFixture(root);
}

if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT) {
	main().catch(() => {
		process.stderr.write("MYSQL_LOOPBACK_FAILED\n");
		process.exitCode = 1;
	});
}
