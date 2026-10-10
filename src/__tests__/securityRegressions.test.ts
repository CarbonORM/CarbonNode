import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {buildTestConfig} from './fixtures/c6.fixture';
import {ExpressHandler} from '../handlers/ExpressHandler';
import {restOrm} from '../api/restOrm';
import {C6C} from '../constants/C6Constants';
import {SelectQueryBuilder} from '../orm/queries/SelectQueryBuilder';
import {DeleteQueryBuilder} from '../orm/queries/DeleteQueryBuilder';
import {apiRequestCache, checkCache, clearCache, setCache} from '../utils/cacheManager';
import {getEnv, getEnvDebug} from '../variables/getEnv';
import {reserveDependency} from '../utils/dependencyTraversal';
import logSql from '../utils/logSql';
import '../executors/SqlExecutor';
import {HttpExecutor} from '../executors/HttpExecutor';

function sqlFixture() {
    const conn = {connection: {stream: {prependListener: vi.fn(), removeListener: vi.fn(), destroy: vi.fn()}},
        query: vi.fn(async () => [[{actor_id: 5}], []]),
        beginTransaction: vi.fn(), commit: vi.fn(), rollback: vi.fn(), release: vi.fn(),
    };
    const config: any = {...buildTestConfig(), logLevel: 0, mysqlCancellation: async () => ({cancel: vi.fn(), close: vi.fn()}), mysqlPool: {getConnection: async () => conn}};
    return {config, conn, orm: restOrm<any>(() => config)};
}
async function handle(config: any, method: string, body: any, primary?: string) {
    const res: any = {status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis()};
    await ExpressHandler<any>(config)({method, params: {table: 'actor', primary}, query: method === 'GET' ? body : {}, body} as any, res);
    return res;
}

beforeEach(() => clearCache({ignoreWarning: true}));
afterEach(() => vi.restoreAllMocks());

describe('REST security boundary', () => {
    it.each(['GET', 'PUT', 'DELETE'])('binds the URL key as a literal for singular %s', async method => {
        const {config, conn} = sqlFixture();
        await handle(config, method, {actor_id: 6, 'actor.actor_id': 7, ...(method === 'PUT' ? {first_name: 'Changed'} : {})}, 'actor.actor_id');
        expect(conn.query).toHaveBeenCalledTimes(method === 'GET' ? 4 : 1);
        const [sql, params]: any = conn.query.mock.calls[method === 'GET' ? 2 : 0];
        expect(sql).toContain('WHERE');
        expect(params).toContain('actor.actor_id');
        expect(params).not.toContain(6);
        expect(params).not.toContain(7);
    });
    it('ANDs route identity with a client OR filter', async () => {
        const {config, conn} = sqlFixture();
        await handle(config, 'DELETE', {WHERE: {OR: [{'actor.actor_id': 6}, {'actor.actor_id': 7}]}}, '5');
        const [sql, params]: any = conn.query.mock.calls[0];
        expect(sql).toMatch(/WHERE.*OR.*AND/s);
        expect(params).toEqual([6, 7, '5']);
    });
    it('adds WHERE for complex PUT with a URL key', async () => {
        const {config, conn} = sqlFixture();
        await handle(config, 'PUT', {UPDATE: {first_name: 'Changed'}, 'actor.actor_id': 7}, '5');
        const [sql, params]: any = conn.query.mock.calls[0];
        expect(sql).toContain('WHERE');
        expect(params).toEqual(['Changed', '5']);
    });
    it('does not drop the key when a singular DELETE includes its marker', async () => {
        const {conn, orm} = sqlFixture();
        await orm.Delete({actor_id: 5, DELETE: true});
        const [sql, params]: any = conn.query.mock.calls[0];
        expect(sql).toContain('WHERE');
        expect(params).toEqual([5]);
    });
    it('hides SQL metadata and ignores client debug', async () => {
        const {config} = sqlFixture();
        const log = vi.spyOn(console, 'log').mockImplementation(() => {});
        const res = await handle(config, 'GET', {debug: true}, '5');
        expect(res.json.mock.calls[0][0]).toEqual({success: true, rest: [{actor_id: 5}]});
        expect(log).not.toHaveBeenCalled();
    });
    it('hides internal errors', async () => {
        const {config, conn} = sqlFixture();
        conn.query.mockRejectedValue(new Error('secret /private/allowlist.json') as never);
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const res = await handle(config, 'GET', {}, '5');
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({success: false, error: 'Request failed'});
    });
});

describe('SQL query integrity', () => {
    it.each([{}, {'actor.last_name': [C6C.LIT, 'X']}, {OR: []}])('rejects malformed column conditions %j', value => {
        expect(() => new DeleteQueryBuilder(buildTestConfig() as any, {WHERE: {'actor.actor_id': value}} as any).build('actor')).toThrow();
    });
    it.each(['actor.actor_id.extra', 'actor.actor_id.`x`) OR 1=1 --', 'actor.toString'])('rejects suffixed/inherited references %s', ref => {
        expect(() => new SelectQueryBuilder(buildTestConfig() as any, {SELECT: [ref]} as any).build('actor')).toThrow();
    });
    it('rejects malicious JOIN aliases', () => {
        expect(() => new SelectQueryBuilder(buildTestConfig() as any, {JOIN: {INNER: {'film_actor 1)OR/**/1=1#': {}}}} as any).build('actor')).toThrow();
    });
    it('rejects unknown subselect tables and raw GROUP_BY', () => {
        const config = buildTestConfig() as any;
        expect(() => new SelectQueryBuilder(config, {SELECT: [[C6C.SUBSELECT, {FROM: 'secret` UNION SELECT 1 --'}]]} as any).build('actor')).toThrow();
        expect(() => new SelectQueryBuilder(config, {GROUP_BY: 'actor.actor_id; SELECT 1'} as any).build('actor')).toThrow();
    });
    it('renumbers PostgreSQL subquery binds after parent and sibling binds', () => {
        const config: any = {...buildTestConfig(), sqlDialect: 'postgresql'};
        const result = new SelectQueryBuilder(config, {SELECT: [
            [C6C.LIT, 'parent'],
            [C6C.SUBSELECT, {FROM: 'actor', SELECT: [[C6C.LIT, 'child1']]}],
            [C6C.SUBSELECT, {FROM: 'actor', SELECT: [[C6C.LIT, 'child2']]}],
        ]} as any).build('actor');
        expect(result.params).toEqual(['parent', 'child1', 'child2']);
        expect(result.sql.match(/\$\d+/g)).toEqual(['$1', '$2', '$3']);
    });
    it('rechecks the allowlist after hooks rewrite SQL', async () => {
        const {config, conn, orm} = sqlFixture();
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'carbonnode-allow-'));
        try {
            const sql = new SelectQueryBuilder(config, {SELECT: ['*']} as any).build('actor').sql;
            config.sqlAllowListPath = path.join(dir, 'allowed.json');
            fs.writeFileSync(config.sqlAllowListPath, JSON.stringify([sql]));
            config.restModel.LIFECYCLE_HOOKS.GET.beforeExecution = {
                rewrite: ({sqlExecution}: any) => {sqlExecution.sql = 'SELECT * FROM secret';},
            };
            await expect(orm.Get({SELECT: ['*']})).rejects.toThrow(/allowlist/i);
            expect(conn.query).not.toHaveBeenCalled();
        } finally {fs.rmSync(dir, {recursive: true, force: true});}
    });
});

describe('cache security', () => {
    it('does not enable shared SQL caching from a request control alone', async () => {
        const {conn, orm} = sqlFixture();
        await orm.Get({actor_id: 5, cacheResults: true});
        await orm.Get({actor_id: 5, cacheResults: true});
        expect(conn.query).toHaveBeenCalledTimes(2);
        expect(apiRequestCache.size).toBe(0);
    });
    it('separates principals and database pools', async () => {
        const one = sqlFixture(); const two = sqlFixture();
        one.config.cacheScope = two.config.cacheScope = 'principal-one';
        await one.orm.Get({actor_id: 5});
        await two.orm.Get({actor_id: 5});
        expect(two.conn.query).toHaveBeenCalledOnce();
        one.config.cacheScope = 'principal-two';
        await one.orm.Get({actor_id: 5});
        expect(one.conn.query).toHaveBeenCalledTimes(2);
    });
    it('does not bypass lifecycle authorization on cache hits', async () => {
        const {config, conn, orm} = sqlFixture();
        config.cacheScope = 'principal';
        const authorize = vi.fn();
        config.restModel.LIFECYCLE_HOOKS.GET.beforeExecution = {authorize};
        await orm.Get({actor_id: 5}); await orm.Get({actor_id: 5});
        expect(authorize).toHaveBeenCalledTimes(2);
        expect(conn.query).toHaveBeenCalledTimes(2);
    });
    it('keeps separate entries for requests colliding under the old 32-bit hash', async () => {
        function hash(value: any) {
            let h = 0x811c9dc5;
            for (const c of JSON.stringify(['GET', 'actor', {id: value}])) {h ^= c.charCodeAt(0); h = (h * 0x01000193) >>> 0;}
            return h;
        }
        const seen = new Map<number, number>(); let pair: number[] = [];
        for (let n = 0; n < 200000; n++) {
            const key = hash(n);
            if (seen.has(key)) {pair = [seen.get(key)!, n]; break;}
            seen.set(key, n);
        }
        expect(pair).toHaveLength(2);
        for (const id of pair) setCache('GET', 'actor', {id}, {requestArgumentsSerialized: String(id), request: Promise.resolve({data: id})} as any);
        const first: any = await checkCache('GET', 'actor', {id: pair[0]});
        expect(first.data).toBe(pair[0]);
        expect(apiRequestCache.size).toBe(2);
    });
});

describe('bounded client behavior', () => {
    it('stops repeated dependencies and caps recursion depth', () => {
        const root: any = {};
        expect(reserveDependency(root, 'actor', {WHERE: {id: 1}})).toBe(true);
        expect(reserveDependency(root, 'actor', {WHERE: {id: 1}})).toBe(false);
        let parent = root;
        for (let n = 2; n <= 9; n++) {
            const child = {WHERE: {id: n}};
            expect(reserveDependency(parent, 'actor', child)).toBe(true);
            parent = child;
        }
        expect(() => reserveDependency(parent, 'actor', {WHERE: {id: 10}})).toThrow(/limit/);
    });
    it('advances next() to the next page and terminates on a short page', async () => {
        const get = vi.fn().mockResolvedValueOnce({data: {rest: [{actor_id: 1}, {actor_id: 2}]}})
            .mockResolvedValueOnce({data: {rest: [{actor_id: 3}]}});
        const config: any = {...buildTestConfig(), C6: {...buildTestConfig().C6, ...C6C}, axios: {get}, restURL: '/rest/', logLevel: 0};
        const first: any = await new HttpExecutor(config, {PAGINATION: {PAGE: 1, LIMIT: 2}} as any).execute();
        const second = await first.next();
        expect(get.mock.calls[1][1].params.PAGINATION.PAGE).toBe(2);
        expect(second.next).toBeUndefined();
    });
    it('keeps environment debug resolution aligned with process precedence', () => {
        const prior = process.env.CARBON_SECURITY_TEST;
        process.env.CARBON_SECURITY_TEST = 'process';
        try {
            expect(getEnv('CARBON_SECURITY_TEST')).toBe('process');
            expect(getEnvDebug('CARBON_SECURITY_TEST')).toMatchObject({value: 'process', source: 'process'});
            expect(getEnvDebug('CARBON_MISSING_TEST').source).toBe('missing');
        } finally {
            if (prior === undefined) delete process.env.CARBON_SECURITY_TEST;
            else process.env.CARBON_SECURITY_TEST = prior;
        }
    });
    it('omits SQL text at INFO while retaining verification status', () => {
        const log = vi.spyOn(console, 'log').mockImplementation(() => {});
        logSql({method: 'SELECT', sql: 'SELECT secret FROM users', context: {logLevel: 3}, cacheStatus: 'miss', allowListStatus: 'allowed'});
        expect(log.mock.calls[0][0]).toContain('[VERIFIED]');
        expect(log.mock.calls[0][0]).not.toContain('secret');
    });
});

describe('write scope', () => {
    it.each([{UPDATE: {first_name: 'Changed'}}, {UPDATE: {first_name: 'Changed'}, WHERE: {}}])('rejects unfiltered PUT %j', async request => {
        const {conn, orm} = sqlFixture();
        await expect(orm.Put(request)).rejects.toThrow(/WHERE/);
        expect(conn.query).not.toHaveBeenCalled();
    });
    it('honors root primary keys in direct complex PUT calls', async () => {
        const {conn, orm} = sqlFixture();
        await orm.Put({UPDATE: {first_name: 'Changed'}, 'actor.actor_id': 5});
        const [sql, params]: any = conn.query.mock.calls[0];
        expect(sql).toContain('WHERE');
        expect(params).toEqual(['Changed', 5]);
    });
    it('allows deliberate bulk UPDATE only through trusted config', async () => {
        const {config, conn, orm} = sqlFixture();
        config.allowUnfilteredWrites = true;
        await orm.Put({UPDATE: {first_name: 'Changed'}});
        expect(conn.query).toHaveBeenCalledOnce();
    });
});

describe('security configuration changes', () => {
    it('revalidates allowlist changes before serving cached SQL results', async () => {
        const {config, conn, orm} = sqlFixture();
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'carbonnode-cache-allow-'));
        try {
            config.cacheScope = 'principal';
            config.sqlAllowListPath = path.join(dir, 'allowed.json');
            fs.writeFileSync(config.sqlAllowListPath, JSON.stringify([new SelectQueryBuilder(config, {SELECT: ['*']} as any).build('actor').sql]));
            await orm.Get({SELECT: ['*']});
            fs.writeFileSync(config.sqlAllowListPath, '[]');
            await expect(orm.Get({SELECT: ['*']})).rejects.toThrow(/allowlist/i);
            expect(conn.query).toHaveBeenCalledOnce();
        } finally {fs.rmSync(dir, {recursive: true, force: true});}
    });
    it('separates HTTP scopes and endpoints, and ignores client cache requests without a trusted scope', async () => {
        const get = vi.fn(async () => ({data: {rest: [{actor_id: 5}]}}));
        const config: any = {...buildTestConfig(), C6: {...buildTestConfig().C6, ...C6C}, axios: {get}, restURL: '/rest/', logLevel: 0};
        const run = () => new HttpExecutor(config, {cacheResults: true} as any).execute();
        await run(); await run(); expect(get).toHaveBeenCalledTimes(2);
        config.cacheScope = 'one';
        await run(); await run(); expect(get).toHaveBeenCalledTimes(3);
        config.cacheScope = 'two';
        await run(); expect(get).toHaveBeenCalledTimes(4);
        config.restURL = '/other/';
        await run(); expect(get).toHaveBeenCalledTimes(5);
    });
    it('allows full websocket rows only through trusted opt-in', async () => {
        const {config, conn, orm} = sqlFixture();
        config.websocketBroadcast = vi.fn();
        config.websocketIncludeRows = true;
        conn.query.mockResolvedValue([{affectedRows: 1, insertId: 5}, []] as any);
        await orm.Post({actor_id: 5, first_name: 'Explicit'});
        expect(config.websocketBroadcast.mock.calls[0][0].REST.REQUEST.first_name).toBe('Explicit');
    });
    it('allows intentional unfiltered DELETE only with trusted configuration', async () => {
        const {config, conn, orm} = sqlFixture();
        await expect(orm.Delete({DELETE: true, allowUnfilteredWrites: true})).rejects.toThrow(/WHERE/);
        expect(conn.query).not.toHaveBeenCalled();
        config.allowUnfilteredWrites = true;
        await orm.Delete({DELETE: true});
        expect(conn.query).toHaveBeenCalledOnce();
    });
});
