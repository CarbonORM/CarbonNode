import { describe, it, expect, beforeAll, vi } from 'vitest';

// Import the generated C6.js from sakila-db folder (ESM)
// This file is generated from the Sakila schema and wired with restOrm
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - C6.js is JS, vitest/ts handles ESM imports fine
import { C6, GLOBAL_REST_PARAMETERS } from './sakila-db/C6.js';

function toPascalCase(name: string) {
  return name.replace(/(^|_)([a-z])/g, (_m, _u, c) => c.toUpperCase());
}

describe('sakila-db generated C6 bindings', () => {
  beforeAll(() => {
    // Provide a mocked MySQL pool so SqlExecutor path is used without a real DB
    const mockConn = {
      query: vi.fn().mockImplementation(async (_sql: string, _values?: any[]) => {
        // Return a result set shaped like mysql2/promise: [rows, fields]
        return [[{ ok: true }], []];
      }),
      release: vi.fn()
    };

    const mockPool = {
      getConnection: vi.fn().mockResolvedValue(mockConn)
    } as any;

    // Inject mocked pool into global rest parameters used by all table bindings
    GLOBAL_REST_PARAMETERS.mysqlPool = mockPool;
  });

  it('Get(...LIMIT...) returns array rest for every generated table', async () => {
    // Iterate over each table short name present in generated C6
    for (const [shortName] of Object.entries(C6.TABLES as Record<string, any>)) {
      const bindingName = toPascalCase(shortName);
      const restBinding = (C6.ORM as Record<string, any>)[bindingName];
      if (!restBinding || typeof restBinding.Get !== 'function') continue;

      const response = await restBinding.Get({ SELECT: ['*'], [C6.PAGINATION]: { [C6.LIMIT]: 1 } } as any);

      // HttpExecutor returns AxiosResponse, SqlExecutor returns plain object
      const data = (response as any)?.data ?? response;
      expect(Array.isArray((data as any)?.rest)).toBe(true);
    }
  });
  it('broadcasts websocket payloads for write operations', async () => {
    const broadcast = vi.fn();
    GLOBAL_REST_PARAMETERS.websocketBroadcast = broadcast;

    const Actor = (C6.ORM as Record<string, any>).Actor;
    const actorId = 9999;

    await Actor.Post({ actor_id: actorId, first_name: "Web", last_name: "Socket" } as any);
    expect(broadcast).toHaveBeenCalledTimes(1);
    const postPayload = broadcast.mock.calls[0][0];
    expect(postPayload.REST.TABLE_NAME).toBe("actor");
    expect(postPayload.REST.METHOD).toBe("POST");
    expect(postPayload.REST.REQUEST.first_name).toBe("Web");
    expect(postPayload.REST.REQUEST_PRIMARY_KEY).toEqual({ actor_id: actorId });

    broadcast.mockClear();
    await Actor.Put({ [Actor.ACTOR_ID]: actorId, [Actor.LAST_NAME]: "Update" } as any);
    expect(broadcast).toHaveBeenCalledTimes(1);
    const putPayload = broadcast.mock.calls[0][0];
    expect(putPayload.REST.METHOD).toBe("PUT");
    expect(putPayload.REST.REQUEST.last_name).toBe("Update");
    expect(putPayload.REST.REQUEST_PRIMARY_KEY).toEqual({ actor_id: actorId });

    broadcast.mockClear();
    await Actor.Delete({ [Actor.ACTOR_ID]: actorId } as any);
    expect(broadcast).toHaveBeenCalledTimes(1);
    const deletePayload = broadcast.mock.calls[0][0];
    expect(deletePayload.REST.METHOD).toBe("DELETE");
    expect(deletePayload.REST.REQUEST_PRIMARY_KEY).toEqual({ actor_id: actorId });
  });

});
