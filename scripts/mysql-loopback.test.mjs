import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import net from "node:net";
import { once } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { openLoopback, startFixture, stopFixture } from "./mysql-loopback.mjs";

async function upstream(t, listener = (socket) => socket.pipe(socket)) {
	const sockets = new Set();
	const server = net.createServer((socket) => {
		sockets.add(socket);
		socket.on("error", () => {});
		socket.on("close", () => sockets.delete(socket));
		listener(socket);
	});
	server.listen(0, "127.0.0.1");
	await once(server, "listening");
	t.after(async () => {
		for (const socket of sockets) socket.destroy();
		if (server.listening) await new Promise((resolve) => server.close(resolve));
	});
	return server;
}

test("real loopback readiness and opaque binary forwarding preserve backpressure and EOF", {
	timeout: 15000,
}, async (t) => {
	const target = await upstream(t);
	const bridge = await openLoopback({
		upstreamHost: "127.0.0.1",
		upstreamPort: target.address().port,
		port: 0,
	});
	t.after(() => bridge.close());
	await bridge.ready();
	const payload = randomBytes(2 * 1024 * 1024 + 19);
	const received = [];
	const socket = net.createConnection({ host: "127.0.0.1", port: bridge.port });
	socket.on("data", (data) => received.push(data));
	socket.end(payload);
	await once(socket, "close");
	assert.equal(Buffer.concat(received).length, payload.length);
	assert.equal(
		createHash("sha256").update(Buffer.concat(received)).digest("hex"),
		createHash("sha256").update(payload).digest("hex"),
	);
});

test("occupied loopback port refuses without reusing or closing the existing listener", async (t) => {
	const target = await upstream(t);
	const port = target.address().port;
	await assert.rejects(
		openLoopback({ upstreamHost: "127.0.0.1", upstreamPort: port, port }),
		{ code: "EADDRINUSE" },
	);
	assert.equal(target.listening, true);
	const socket = net.createConnection({ host: "127.0.0.1", port });
	await once(socket, "connect");
	socket.destroy();
});

test("unreachable service cannot nominate readiness and owned cleanup releases only the fixture", {
	timeout: 15000,
}, async (t) => {
	const target = await upstream(t);
	const port = target.address().port;
	await new Promise((resolve) => target.close(resolve));
	const bridge = await openLoopback({
		upstreamHost: "127.0.0.1",
		upstreamPort: port,
		port: 0,
	});
	await assert.rejects(bridge.ready(), { code: "MYSQL_LOOPBACK_UPSTREAM" });
	const ownedPort = bridge.port;
	await bridge.close();
	const replacement = net.createServer();
	replacement.listen(ownedPort, "127.0.0.1");
	await once(replacement, "listening");
	await new Promise((resolve) => replacement.close(resolve));
});

test("normal cleanup closes active owned streams and preserves the separate upstream listener", async (t) => {
	const target = await upstream(t);
	const bridge = await openLoopback({
		upstreamHost: "127.0.0.1",
		upstreamPort: target.address().port,
		port: 0,
	});
	await bridge.ready();
	const socket = net.createConnection({ host: "127.0.0.1", port: bridge.port });
	socket.on("error", () => {});
	await once(socket, "connect");
	const closed = new Promise((resolve) => socket.once("close", resolve));
	await bridge.close();
	await closed;
	assert.equal(target.listening, true);
});

test("actual forked fixture readiness, private control shutdown and child reaping are owned", {
	timeout: 15000,
}, async (t) => {
	const target = await upstream(t);
	const parent = fs.mkdtempSync(path.join(os.tmpdir(), "mysql-loopback-"));
	t.after(() => fs.rmSync(parent, { recursive: true, force: true }));
	const root = path.join(parent, "owned");
	const owned = await startFixture({
		root,
		upstreamHost: "127.0.0.1",
		upstreamPort: target.address().port,
		port: 0,
	});
	assert.equal(fs.statSync(root).mode & 0o777, 0o700);
	assert.equal(fs.statSync(path.join(root, "state.json")).mode & 0o777, 0o600);
	const socket = net.createConnection({ host: "127.0.0.1", port: owned.port });
	await once(socket, "connect");
	socket.destroy();
	await stopFixture(root);
	await owned.closed;
	assert.equal(fs.existsSync(root), false);
	assert.equal(target.listening, true);
});

test("forked startup refuses occupied port and retains unrelated server and owned state", {
	timeout: 15000,
}, async (t) => {
	const target = await upstream(t);
	const parent = fs.mkdtempSync(path.join(os.tmpdir(), "mysql-loopback-"));
	t.after(() => fs.rmSync(parent, { recursive: true, force: true }));
	const root = path.join(parent, "occupied");
	await assert.rejects(
		startFixture({
			root,
			upstreamHost: "127.0.0.1",
			upstreamPort: target.address().port,
			port: target.address().port,
		}),
		{ code: "MYSQL_LOOPBACK_START" },
	);
	assert.equal(target.listening, true);
	assert.equal(fs.existsSync(path.join(root, "state.json")), false);
});
