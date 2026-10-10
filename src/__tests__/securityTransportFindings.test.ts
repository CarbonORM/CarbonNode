import {EventEmitter} from 'node:events';
import mysql from 'mysql2/promise';
import {describe, it, expect, vi} from 'vitest';
import {withSqlWireBudget, withMySqlMutationDeadline} from '../utils/sqlTransportSafety';
import {readHttpResponseStream} from '../utils/httpResponseStream';

function wireFixture() {
    const stream = Object.assign(new EventEmitter(), {pause: vi.fn(), destroy: vi.fn()});
    const conn = {connection: {stream}, destroy: vi.fn()};
    return {stream, conn, retire: vi.fn()};
}
describe('response transport boundaries', () => {
    it('retires oversized SQL transport before accumulated rows are returned, and removes its listener', async () => {
        const {stream, conn, retire} = wireFixture();
        const result = withSqlWireBudget(conn, {maxResponseBytes: 4, enforceSqlTransportBudget: true}, () => {
            stream.emit('data', Buffer.from('abc'));
            stream.emit('data', Buffer.from('def'));
            return new Promise<void>(() => {});
        }, retire);
        await expect(result).rejects.toThrow('transport byte budget');
        expect(retire).toHaveBeenCalledOnce();
        expect(stream.destroy).toHaveBeenCalledOnce(); expect(conn.destroy).toHaveBeenCalledOnce();
        expect(stream.listenerCount('data')).toBe(0);
    });
    it('cleans up a small response and fails closed for unsupported or compressed native transports', async () => {
        const {stream, conn, retire} = wireFixture();
        await expect(withSqlWireBudget(conn, {maxResponseBytes: 4}, async () => {
            stream.emit('data', Buffer.from('abc')); return 3;
        }, retire)).resolves.toBe(3);
        expect(stream.listenerCount('data')).toBe(0); expect(retire).not.toHaveBeenCalled();
        const run = vi.fn();
        await expect(withSqlWireBudget({}, {enforceSqlTransportBudget: true}, run, retire)).rejects.toThrow('bounded response transport');
        await expect(withSqlWireBudget({connection: {stream, config: {compress: true}}}, {}, run, retire)).rejects.toThrow('Compressed');
        expect(run).not.toHaveBeenCalled();
    });
    it('bounds browser receipt before parsing and cancels the stream on overflow', async () => {
        const cancel = vi.fn(), controller = new AbortController();
        const reader = {read: vi.fn().mockResolvedValueOnce({done: false, value: new TextEncoder().encode('123')})
            .mockResolvedValueOnce({done: false, value: new TextEncoder().encode('456')})
            .mockResolvedValueOnce({done: false, value: new TextEncoder().encode('789')}), cancel, releaseLock: vi.fn()};
        await expect(readHttpResponseStream({getReader: () => reader} as any, {maxResponseBytes: 4}, controller)).rejects.toThrow('transport byte budget');
        expect(reader.read).toHaveBeenCalledTimes(2); expect(cancel).toHaveBeenCalledOnce();
        expect(controller.signal.aborted).toBe(true); expect(reader.releaseLock).toHaveBeenCalledOnce();
    });
    it('decodes split multibyte UTF-8 only inside the budget', async () => {
        const bytes = new TextEncoder().encode('{"name":"é"}');
        const stream = new ReadableStream<Uint8Array>({start(c) {
            for (const byte of bytes) c.enqueue(Uint8Array.of(byte)); c.close();
        }});
        await expect(readHttpResponseStream(stream, {maxResponseBytes: bytes.length}, new AbortController())).resolves.toEqual({name: 'é'});
    });
    it('fails closed when cancellation cannot be reserved or fails at the deadline', async () => {
        const run = vi.fn(), retire = vi.fn(), conn = {destroy: vi.fn()};
        await expect(withMySqlMutationDeadline(conn, 10, {mysqlCancellation: async () => {
            throw new Error('No cancellation channel');
        }}, run, retire)).rejects.toThrow('No cancellation channel');
        expect(run).not.toHaveBeenCalled();
        const close = vi.fn();
        await expect(withMySqlMutationDeadline(conn, 10, {mysqlCancellation: async () => ({
            cancel: async () => {throw new Error('Server rejected cancellation');}, close,
        })}, () => new Promise<void>(() => {}), retire)).rejects.toThrow('Unable to cancel');
        expect(retire).toHaveBeenCalledOnce(); expect(close).toHaveBeenCalledOnce();
    });
    it('reserves server cancellation before writes and rejects even a late driver success', async () => {
        const events: string[] = [], cancel = vi.fn(async () => {events.push('kill');}), close = vi.fn();
        const conn = {destroy: vi.fn()}, retire = vi.fn();
        await expect(withMySqlMutationDeadline(conn, 10, {mysqlCancellation: async () => {
            events.push('reserve'); return {cancel, close};
        }}, async () => {events.push('write'); await new Promise(r => setTimeout(r, 30)); return 'late';}, retire)).rejects.toThrow('deadline exceeded');
        expect(events).toEqual(['reserve', 'write', 'kill']); expect(close).toHaveBeenCalledOnce();
        expect(retire).toHaveBeenCalledOnce(); expect(conn.destroy).toHaveBeenCalledOnce();
    });
});

describe('live MySQL cancellation and wire budgets', () => {
    it('kills a lock-blocked mutation and prevents it committing after the lock is released', async () => {
        const pool = mysql.createPool({host: '127.0.0.1', user: 'root', password: 'password', database: 'sakila', connectionLimit: 2});
        const table = `carbonnode_deadline_${process.pid}_${Date.now()}`;
        let blocker: mysql.PoolConnection | undefined, target: mysql.PoolConnection | undefined;
        const retire = vi.fn();
        try {
            await pool.query(`CREATE TABLE ${table} (id INT PRIMARY KEY, value INT) ENGINE=InnoDB`);
            await pool.query(`INSERT INTO ${table} VALUES (1, 0)`);
            blocker = await pool.getConnection(); await blocker.beginTransaction();
            await blocker.query(`SELECT * FROM ${table} WHERE id=1 FOR UPDATE`);
            target = await pool.getConnection(); await target.beginTransaction();
            await expect(withMySqlMutationDeadline(target, 100, {}, async () => {
                await target!.query(`UPDATE ${table} SET value=1 WHERE id=1`); await target!.commit();
            }, retire)).rejects.toThrow('deadline exceeded');
            expect(retire).toHaveBeenCalledOnce();
            await blocker.rollback(); blocker.release(); blocker = undefined;
            const [rows]: any = await pool.query(`SELECT value FROM ${table} WHERE id=1`);
            expect(rows[0].value).toBe(0);
        } finally {
            if (blocker) {await blocker.rollback(); blocker.release();}
            target?.destroy();
            await pool.query(`DROP TABLE IF EXISTS ${table}`); await pool.end();
        }
    }, 15000);
    it('aborts an oversized native driver result and allows a fresh pooled connection', async () => {
        const pool = mysql.createPool({host: '127.0.0.1', user: 'root', password: 'password', database: 'sakila', connectionLimit: 1});
        const conn = await pool.getConnection(), retire = vi.fn();
        try {
            await expect(withSqlWireBudget(conn, {maxResponseBytes: 4096, enforceSqlTransportBudget: true},
                () => conn.query("SELECT REPEAT('x', 1048576) AS payload"), retire)).rejects.toThrow();
            expect(retire).toHaveBeenCalledOnce();
            const [rows]: any = await pool.query('SELECT 1 AS healthy'); expect(rows[0].healthy).toBe(1);
        } finally {conn.destroy(); await pool.end();}
    }, 15000);
});
