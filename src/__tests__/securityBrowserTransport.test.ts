import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
vi.mock('../variables/isNode', () => ({default: () => false}));
import {buildTestConfig} from './fixtures/c6.fixture';
import restRequest from '../api/restRequest';
import {clearCache} from '../utils/cacheManager';
beforeEach(() => clearCache({ignoreWarning: true}));
afterEach(() => {clearCache({ignoreWarning: true}); vi.restoreAllMocks();});
function fixture(data: () => any, maxResponseBytes = 1024) {
    const get = vi.fn(async (..._args: any[]) => ({data: data()}));
    const config: any = {...buildTestConfig(), logLevel: 0, restURL: 'https://example.test/rest/', cacheScope: 'browser',
        axios: {get}, maxResponseBytes};
    return {get, config, request: restRequest<any>(config)};
}
function responseStream() {
    return new ReadableStream<Uint8Array>({start(c) {
        c.enqueue(new TextEncoder().encode('{"success":true,"rest":[{"actor_id":1}]}')); c.close();
    }});
}
describe('browser HTTP response safety', () => {
    it('selects fetch streams and shares only the bounded parsed response through cache', async () => {
        const {get, request} = fixture(responseStream);
        const first = request({actor_id: 1, cacheResults: true} as any);
        await vi.waitFor(() => expect(get).toHaveBeenCalledOnce());
        const [a, b] = await Promise.all([first, request({actor_id: 1, cacheResults: true} as any)]);
        expect(a.rest).toEqual([{actor_id: 1}]); expect(b.rest).toEqual(a.rest); expect(get).toHaveBeenCalledOnce();
        expect(get.mock.calls[0][1]).toMatchObject({adapter: 'fetch', responseType: 'stream'});
        expect((get.mock.calls[0][1] as any).signal).toBeInstanceOf(AbortSignal);
    });
    it('evicts overflowing streams so a later valid response can retry', async () => {
        const cancel = vi.fn(); let oversized = true;
        const {get, request} = fixture(() => oversized ? new ReadableStream<Uint8Array>({start(c) {
            c.enqueue(new Uint8Array(128));
        }, cancel}) : responseStream(), 64);
        await expect(request({actor_id: 1, cacheResults: true} as any)).rejects.toThrow('transport byte budget');
        expect(cancel).toHaveBeenCalledOnce(); oversized = false;
        const result = await request({actor_id: 1, cacheResults: true} as any); expect(result.rest).toEqual([{actor_id: 1}]);
        expect(get).toHaveBeenCalledTimes(2);
    });
    it.each(['PUT', 'DELETE'])('does not log or expose malformed %s payload values', async method => {
        const dispatch = vi.fn(), errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
        const config: any = {...buildTestConfig(), logLevel: 1, requestMethod: method, skipPrimaryCheck: false,
            restURL: 'https://example.test/rest/', axios: {[method.toLowerCase()]: dispatch}};
        config.restModel = config.C6.TABLES.film_actor;
        await expect(restRequest<any>(config)({secret: 'private-token'} as any)).rejects.toThrow('Mutation requires');
        expect(JSON.stringify(errorLog.mock.calls)).not.toContain('private-token'); expect(dispatch).not.toHaveBeenCalled();
    });
});
