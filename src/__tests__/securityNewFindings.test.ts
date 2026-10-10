import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {buildTestConfig} from './fixtures/c6.fixture';
import {restOrm} from '../api/restOrm';
import restRequest from '../api/restRequest';
import {ExpressHandler} from '../handlers/ExpressHandler';
import {C6C} from '../constants/C6Constants';
import {SelectQueryBuilder} from '../orm/queries/SelectQueryBuilder';
import '../executors/SqlExecutor';
import {CACHE_LIMITS, apiRequestCache, checkCache, clearCache, setCache} from '../utils/cacheManager';
import {DEFAULT_QUERY_LIMITS, validateQueryRequest} from '../utils/querySafety';

beforeEach(() => clearCache({ignoreWarning: true}));
afterEach(() => {clearCache({ignoreWarning: true}); vi.useRealTimers(); vi.restoreAllMocks();});
function sqlFixture() {
    const conn = {connection: {stream: {prependListener: vi.fn(), removeListener: vi.fn(), destroy: vi.fn()}},query: vi.fn(async () => [[{actor_id: 1}], []]), beginTransaction: vi.fn(),
        commit: vi.fn(), rollback: vi.fn(), release: vi.fn()};
    const pool = {getConnection: vi.fn(async () => conn)};
    const config: any = {...buildTestConfig(), mysqlPool: pool, logLevel: 0, cacheScope: 'one'};
    return {config, conn, pool};
}
async function handle(config: any, method: string, payload: any, table = 'actor', primary?: string) {
    const res: any = {status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis()};
    await ExpressHandler<any>(config)({method, params: {table, primary},
        query: method === 'GET' ? payload : (payload.METHOD ? {METHOD: payload.METHOD} : {}), body: payload} as any, res);
    return res;
}
function httpFixture(method: string) {
    const dispatch = vi.fn(async () => ({data: {success: true, rest: [{actor_id: 1}]}}));
    const config: any = {...buildTestConfig(), requestMethod: method, logLevel: 0,
        restURL: 'https://example.test/rest/', axios: {[method.toLowerCase()]: dispatch}, cacheScope: 'one'};
    return {config, dispatch, request: restRequest<any>(() => config)};
}

describe('HTTP lifecycle authorization and URL identity', () => {
    it.each(['GET', 'POST', 'PUT', 'DELETE'])('awaits rejecting authorization before %s dispatch', async method => {
        for (const asynchronous of [false, true]) {
            const {config, dispatch, request} = httpFixture(method);
            config.restModel.LIFECYCLE_HOOKS[method].beforeExecution = {authorize: () => {
                if (asynchronous) return Promise.reject(new Error('Denied'));
                throw new Error('Denied');
            }};
            await expect(request({actor_id: 1, first_name: 'A'} as any)).rejects.toThrow('Denied');
            expect(dispatch).not.toHaveBeenCalled();
        }
    });
    it('awaits successful lifecycle phases in dispatch order', async () => {
        const {config, dispatch, request} = httpFixture('GET'); const order: string[] = [];
        for (const phase of ['beforeExecution', 'afterExecution', 'afterCommit']) {
            config.restModel.LIFECYCLE_HOOKS.GET[phase] = {check: async () => {await Promise.resolve(); order.push(phase);}};
        }
        dispatch.mockImplementation(async () => {order.push('dispatch'); return {data: {success: true, rest: [{actor_id: 1}]}};});
        await request({actor_id: 1} as any);
        expect(order).toEqual(['beforeExecution', 'dispatch', 'afterExecution', 'afterCommit']);
    });
    it.each(['GET', 'PUT', 'DELETE'])('keeps %s keys in one safe URL segment', async method => {
        for (const key of ['.', '..', '../staff/1', 'a/b', 'a\\b', '?x=1', '#x', '%2fstaff', '%252e%252e', 'a\nb']) {
            const {dispatch, request} = httpFixture(method);
            await expect(request({actor_id: key, first_name: 'A'} as any)).rejects.toThrow(/HTTP primary/);
            expect(dispatch).not.toHaveBeenCalled();
        }
        const {dispatch, request} = httpFixture(method);
        await request({actor_id: 'A B@é', first_name: 'A'} as any);
        expect(dispatch.mock.calls[0][0]).toBe('https://example.test/rest/actor/A%20B%40%C3%A9/');
    });
    it.each(['GET', 'PUT', 'DELETE'])('rejects ambiguous composite %s routes despite complete body keys', async method => {
        const {config, pool} = sqlFixture();
        const res = await handle(config, method, {WHERE: {'film_actor.actor_id': 2, 'film_actor.film_id': 3}}, 'film_actor', '1');
        expect(res.status).toHaveBeenCalledWith(400); expect(pool.getConnection).not.toHaveBeenCalled();
    });
    it.each(['GET', 'PUT', 'DELETE'])('sends complete composite %s identities as payload data without a path identity', async method => {
        const {config, dispatch} = httpFixture(method);
        config.restModel = config.C6.TABLES.film_actor;
        await restRequest<any>(config)({actor_id: 1, film_id: 2} as any);
        expect(dispatch.mock.calls[0][0]).toBe('https://example.test/rest/film_actor/');
    });
});

describe('shared query and pagination budgets', () => {
    it.each([false, true])('bounds deep arrays without recursive token coercion (REST policy %s)', enforceRestFunctionPolicy => {
        let deep: unknown = 1;
        for (let i = 0; i < 20000; i++) deep = [deep];
        expect(() => validateQueryRequest({SELECT: [deep]}, {enforceRestFunctionPolicy})).toThrow('Query complexity budget exceeded');
        expect(() => validateQueryRequest({SELECT: [[C6C.CALL, deep]]}, {enforceRestFunctionPolicy}))
            .toThrow(enforceRestFunctionPolicy ? 'Database function is not approved' : 'Query complexity budget exceeded');
    });
    it.each([{}, {ORDER: [['actor.actor_id', 'DESC']]}, {LIMIT: null}])('preserves a default limit for %j', pagination => {
        const sql = new SelectQueryBuilder(buildTestConfig() as any, {PAGINATION: pagination} as any).build('actor').sql;
        expect(sql).toContain('LIMIT 100');
    });
    it.each([0, -1, NaN, Infinity, 1001, Number.MAX_SAFE_INTEGER + 1, '1x', '1e3'])('rejects invalid or excessive LIMIT %s before acquisition', async LIMIT => {
        const {config, pool} = sqlFixture();
        await expect(restRequest<any>(config)({PAGINATION: {LIMIT}} as any)).rejects.toThrow(/Pagination/);
        expect(pool.getConnection).not.toHaveBeenCalled();
    });
    it('enforces trusted caps and offset limits while permitting documented overrides', () => {
        const config: any = {...buildTestConfig(), maxPageSize: 10, maxPageOffset: 20};
        expect(new SelectQueryBuilder(config, {} as any).build('actor').sql).toContain('LIMIT 10');
        expect(() => new SelectQueryBuilder(config, {PAGINATION: {LIMIT: 10, PAGE: 4}} as any).build('actor')).toThrow(/limits/);
        config.maxPageSize = 2000;
        expect(new SelectQueryBuilder(config, {PAGINATION: {LIMIT: 1500}} as any).build('actor').sql).toContain('LIMIT 1500');
    });
    it('checks depth iteratively, detects cycles, and permits repeated references', () => {
        let nested: any = 1;
        for (let i = 0; i < DEFAULT_QUERY_LIMITS.maxDepth + 1; i++) nested = [nested];
        expect(() => validateQueryRequest(nested)).toThrow(/complexity/);
        const literal = [C6C.LIT, 'data'];
        expect(() => validateQueryRequest({SELECT: [literal, literal]})).not.toThrow();
        const cyclic: any = {}; cyclic.loop = cyclic;
        expect(() => validateQueryRequest(cyclic)).toThrow(/acyclic/);
    });
    it('bounds complete nested trees, node count, lists, and input bytes', () => {
        expect(() => validateQueryRequest({SELECT: [[C6C.SUBSELECT, {SELECT: [1, 2, 3]}]]}, {queryLimits: {maxNodes: 8}})).toThrow(/budget/);
        expect(() => validateQueryRequest([1, 2, 3], {queryLimits: {maxListItems: 2}})).toThrow(/budget/);
        expect(() => validateQueryRequest([C6C.LIT, 'é'.repeat(100)], {queryLimits: {maxInputBytes: 100}})).toThrow(/budget/);
    });
    it.each([{maxSqlBytes: 20}, {maxParams: 1}])('rejects oversized SQL/parameter sets before acquisition: %j', async queryLimits => {
        const {config, pool} = sqlFixture(); config.queryLimits = queryLimits;
        await expect(restRequest<any>(config)({WHERE: {'actor.actor_id': [C6C.IN, [1, 2]]}} as any)).rejects.toThrow(/budget/);
        expect(pool.getConnection).not.toHaveBeenCalled();
    });
    it('bounds SQL and HTTP response bytes', async () => {
        const {config, conn} = sqlFixture(); config.maxResponseBytes = 10;
        await expect(restRequest<any>(config)({} as any)).rejects.toThrow(/Response byte budget/);
        expect(conn.release).toHaveBeenCalledOnce();
        const http = httpFixture('GET'); http.config.maxResponseBytes = 10;
        await expect(http.request({actor_id: 1} as any)).rejects.toThrow(/Response byte budget/);
        expect(http.dispatch.mock.calls[0][1]).toMatchObject({maxContentLength: 10, timeout: 30000});
    });
});

describe('REST database function policy and deadlines', () => {
    it('normalizes CALL tokens and function names exactly like the serializer', () => {
        expect(() => validateQueryRequest({SELECT: [[' call ', ' sleep ', [C6C.LIT, 1]]]},
            {enforceRestFunctionPolicy: true, restFunctionAllowlist: [' sleep ']})).toThrow(/not approved/);
        expect(() => validateQueryRequest({SELECT: [[' sleep ', 1]]}, {enforceRestFunctionPolicy: true})).toThrow(/not approved/);
        expect(() => validateQueryRequest({SELECT: [[C6C.LIT, [C6C.CALL, 'SLEEP', 1]]]}, {enforceRestFunctionPolicy: true})).not.toThrow();
    });
    it.each(['SLEEP', 'pg_sleep', 'LOAD_FILE', 'COALESCE'])('blocks unapproved CALL %s before acquisition and ignores request opt-in', async name => {
        const {config, pool} = sqlFixture(); vi.spyOn(console, 'error').mockImplementation(() => {});
        const res = await handle(config, 'GET', {SELECT: [[C6C.CALL, name, [C6C.LIT, 1]]], restFunctionAllowlist: [name]});
        expect(res.status).toHaveBeenCalledWith(500); expect(pool.getConnection).not.toHaveBeenCalled();
    });
    it('permits trusted pure CALLs with bound arguments and restores MySQL deadline', async () => {
        const {config, conn} = sqlFixture(); config.restFunctionAllowlist = ['COALESCE'];
        conn.query.mockImplementation(async (sql: any) => [[{...(String(sql).includes('@@SESSION') ? {timeout: 42} : {actor_id: 1})}], []] as any);
        const res = await handle(config, 'GET', {SELECT: [[C6C.CALL, 'COALESCE', 'actor.actor_id', [C6C.LIT, 'fallback']]]});
        expect(res.status).toHaveBeenCalledWith(200);
        expect(conn.query.mock.calls[1]).toEqual(['SET SESSION max_execution_time = ?', [5000]]);
        expect(conn.query.mock.calls[2][1]).toEqual(['fallback']);
        expect(conn.query.mock.calls[3]).toEqual(['SET SESSION max_execution_time = ?', [42]]);
    });
    it('restores PostgreSQL read deadline after a failing statement', async () => {
        const {config} = sqlFixture(); delete config.mysqlPool; config.sqlDialect = 'postgresql'; config.statementTimeoutMs = 10;
        const query = vi.fn(async (sql: string) => {
            if (sql === 'SHOW statement_timeout') return {rows: [{statement_timeout: '1s'}]};
            if (sql.includes('set_config')) return {rows: []};
            throw new Error('statement timeout');
        });
        const release = vi.fn(); config.postgresPool = {connect: async () => ({query, release})};
        await expect(restRequest<any>(config)({} as any)).rejects.toThrow('statement timeout');
        expect(query.mock.calls[3]).toEqual(["SELECT set_config('statement_timeout', $1, false)", ['1s']]);
        expect(release).toHaveBeenCalledOnce();
    });
});

describe('bounded shared response cache', () => {
    it('applies a stricter trusted response policy instead of returning an earlier cached response', async () => {
        const {config, conn} = sqlFixture();
        conn.query.mockResolvedValue([[{actor_id: 1, first_name: 'large response'}], []] as never);
        const request = restRequest<any>(config);
        await request({actor_id: 1, cacheResults: true} as any);
        config.maxResponseBytes = 1;
        await expect(request({actor_id: 1, cacheResults: true} as any)).rejects.toThrow('Response byte budget exceeded');
        expect(conn.query).toHaveBeenCalledTimes(2);
    });
    const store = (key: unknown, data: any = {rest: []}) => {
        const request = Promise.resolve({data});
        setCache('GET', 'actor', key, {requestArgumentsSerialized: String(key), request} as any);
        return request;
    };
    it('evicts least-recently-used entries and retains scope isolation', async () => {
        store(['one', 0]); store(['two', 0]);
        for (let i = 1; i < CACHE_LIMITS.maxEntries - 1; i++) store(['one', i]);
        expect(checkCache('GET', 'actor', ['one', 0])).toBeTruthy();
        store(['one', 'new']);
        expect(apiRequestCache.size).toBe(CACHE_LIMITS.maxEntries);
        expect(checkCache('GET', 'actor', ['two', 0])).toBe(false);
        expect(checkCache('GET', 'actor', ['one', 0])).toBeTruthy();
        await Promise.resolve();
    });
    it('bounds retained bytes and rejects oversized entries', async () => {
        for (let i = 0; i < 40; i++) store(i, 'x'.repeat(800000));
        await Promise.resolve();
        expect(apiRequestCache.size).toBeLessThanOrEqual(20);
        store('large', 'x'.repeat(CACHE_LIMITS.maxEntryBytes)); await Promise.resolve();
        expect(checkCache('GET', 'actor', 'large')).toBe(false);
    });
    it('expires pending and complete entries without lookup or deadline renewal', async () => {
        vi.useFakeTimers(); const request = store(1);
        await Promise.resolve(); vi.advanceTimersByTime(CACHE_LIMITS.ttlMs - 1);
        setCache('GET', 'actor', 1, {requestArgumentsSerialized: '1', request, response: {data: {rest: []}}} as any);
        vi.advanceTimersByTime(1); expect(apiRequestCache.size).toBe(0);
        setCache('GET', 'actor', 1, {requestArgumentsSerialized: '1', request, response: {data: {rest: []}}} as any);
        expect(apiRequestCache.size).toBe(0);
    });
    it('evicts rejected SQL and HTTP promises so a retry executes', async () => {
        const {config, conn} = sqlFixture(); conn.query.mockRejectedValueOnce(new Error('SQL failure') as never);
        await expect(restRequest<any>(config)({actor_id: 1, cacheResults: true} as any)).rejects.toThrow('SQL failure');
        expect(apiRequestCache.size).toBe(0);
        await restRequest<any>(config)({actor_id: 1, cacheResults: true} as any);
        expect(conn.query).toHaveBeenCalledTimes(2);
        clearCache({ignoreWarning: true});
        const http = httpFixture('GET'); http.dispatch.mockRejectedValueOnce(new Error('HTTP failure') as never);
        await expect(http.request({actor_id: 1, cacheResults: true} as any)).rejects.toThrow('HTTP failure');
        expect(apiRequestCache.size).toBe(0);
        await http.request({actor_id: 1, cacheResults: true} as any); expect(http.dispatch).toHaveBeenCalledTimes(2);
    });
});

describe('remote log values', () => {
    it.each(['METHOD', 'DB'])('encodes controls in %s while keeping response errors generic', async key => {
        const {config} = sqlFixture(); const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});
        const payload = {[key]: 'fake\nforged\r\u001b[2J\u2028record'};
        const res = await handle(config, key === 'METHOD' ? 'POST' : 'GET', payload);
        const records = [...warning.mock.calls, ...error.mock.calls].flat().map(String);
        expect(records.length).toBeGreaterThan(0);
        expect(records.join('')).not.toMatch(/[\r\n\u001b\u2028]/);
        expect(records.join('')).toContain('\\u');
        expect(res.json.mock.calls[0][0]).not.toHaveProperty('sql');
    });
});
