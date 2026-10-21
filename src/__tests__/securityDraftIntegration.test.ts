import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {buildTestConfig} from './fixtures/c6.fixture';
import {ExpressHandler} from '../handlers/ExpressHandler';
import restRequest from '../api/restRequest';
import {C6C} from '../constants/C6Constants';
import {apiRequestCache, clearCache} from '../utils/cacheManager';
import {PostQueryBuilder} from '../orm/queries/PostQueryBuilder';
import {UpdateQueryBuilder} from '../orm/queries/UpdateQueryBuilder';
import {resolveDatabaseSelection} from '../api/databaseResolver';

beforeEach(() => clearCache({ignoreWarning: true}));
afterEach(() => vi.restoreAllMocks());

function fixture() {
    const conn = {connection: {stream: {prependListener: vi.fn(), removeListener: vi.fn(), destroy: vi.fn()}},query: vi.fn(async () => [[{actor_id: 1}], []]),
        beginTransaction: vi.fn(), commit: vi.fn(), rollback: vi.fn(), release: vi.fn()};
    const config: any = {...buildTestConfig(), logLevel: 0, cacheScope: 'principal',
        mysqlPool: {getConnection: vi.fn(async () => conn)}};
    config.C6.TABLES.actor_info = {...config.restModel, TABLE_NAME: 'actor_info',
        RELATION_TYPE: 'VIEW', READ_ONLY: true, PRIMARY: [], PRIMARY_SHORT: [],
        COLUMNS: {'actor_info.actor_id': 'actor_id'}};
    return {config, conn};
}
async function get(config: any, table: string, query: any = {}) {
    const res: any = {status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis()};
    await ExpressHandler<any>(config)({method: 'GET', params: {table}, query} as any, res);
    return res;
}

describe('holistic Security Cloud draft integration', () => {
    it('blocks unapproved view routes and ignores client opt-in', async () => {
        const {config, conn} = fixture();
        const res = await get(config, 'actor_info', {restViewAllowlist: ['actor_info']});
        expect(res.status).toHaveBeenCalledWith(400);
        expect(conn.query).not.toHaveBeenCalled();
        expect(config.C6.TABLES.actor_info).toBeDefined();
    });
    it.each([
        {JOIN: {INNER: {'actor_info ai': {'ai.actor_id': [C6C.EQUAL, 'actor.actor_id']}}}},
        {SELECT: [[C6C.SUBSELECT, {FROM: 'actor_info', SELECT: ['actor_info.actor_id']}]]},
    ])('blocks view access through expressions and selected database schemas: %j', async payload => {
        const {config, conn} = fixture();
        config.databases = {app: {C6: config.C6, mysqlPool: config.mysqlPool}};
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const res = await get(config, 'actor', {...payload, DB: 'app'});
        expect(res.status).toHaveBeenCalledWith(500);
        expect(conn.query).not.toHaveBeenCalled();
    });
    it('allows explicitly approved read-only views through REST', async () => {
        const {config, conn} = fixture();
        config.restViewAllowlist = ['actor_info'];
        const res = await get(config, 'actor_info');
        expect(res.status).toHaveBeenCalledWith(200);
        expect(conn.query).toHaveBeenCalledTimes(4);
    });
    it('keeps database aliases isolated even when they share a transport', async () => {
        const {config, conn} = fixture();
        config.databases = {one: config.mysqlPool, two: config.mysqlPool};
        const request = restRequest<any>(config);
        await request({DB: 'one', actor_id: 1, cacheResults: true} as any);
        await request({DB: 'two', actor_id: 1, cacheResults: true} as any);
        await request({DB: 'one', actor_id: 1, cacheResults: true} as any);
        expect(conn.query).toHaveBeenCalledTimes(2);
        expect(apiRequestCache.size).toBe(2);
    });
    it.each(['__proto__', 'toString', 'constructor'])('rejects inherited database selectors: %s', key => {
        const {config} = fixture();
        config.databases = {app: config.mysqlPool};
        expect(() => resolveDatabaseSelection(config, {DB: key})).toThrow(/Unknown database key/);
    });
    it.each(['first_name` = (SELECT SLEEP(5)) -- ', 'actor.first_name.extra', 'not_a_column'])('rejects invalid mutation columns: %s', column => {
        const {config} = fixture();
        expect(() => new PostQueryBuilder(config, {INSERT: {[column]: 'X'}} as any).build('actor')).toThrow(/column/);
        expect(() => new PostQueryBuilder(config, {INSERT: {first_name: 'X'}, UPDATE: [column]} as any).build('actor')).toThrow(/column/);
        expect(() => new UpdateQueryBuilder(config, {UPDATE: {[column]: 'X'}, WHERE: {'actor.actor_id': 1}} as any).build('actor')).toThrow(/column/);
    });
});
