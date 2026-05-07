import { describe, it, expect, beforeAll, vi } from 'vitest';

// Import the generated C6 facade through the runtime JS specifier.
// Vitest resolves this to the generated TypeScript source.
import { C6, GLOBAL_REST_PARAMETERS } from './sakila-db/C6.js';

function toPascalCase(name: string) {
  return name.replace(/(^|_)([a-z])/g, (_m, _u, c) => c.toUpperCase());
}

describe('sakila-db generated C6 bindings', () => {
  beforeAll(() => {
    // Provide a mocked MySQL pool so SqlExecutor path is used without a real DB
    const mockConn = {
      query: vi.fn().mockImplementation(async (sql: string, _values?: any[]) => {
        const statement = sql.trim().toUpperCase();
        if (statement.startsWith("SELECT")) {
          // Return a result set shaped like mysql2/promise: [rows, fields]
          return [[{ ok: true }], []];
        }
        // Return a write result for POST/PUT/DELETE shaped like mysql2/promise
        return [{ affectedRows: 1, insertId: 9999 }, []];
      }),
      beginTransaction: vi.fn().mockResolvedValue(undefined),
      commit: vi.fn().mockResolvedValue(undefined),
      rollback: vi.fn().mockResolvedValue(undefined),
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

  it('supports generated C6.<database>.<Table>.Get(...) scoped usage', async () => {
    const pool = (GLOBAL_REST_PARAMETERS as any).mysqlPool;
    (GLOBAL_REST_PARAMETERS as any).databases = {
      app: pool,
    };

    const response = await (C6 as any).app.Actor.Get({
      [C6.PAGINATION]: { [C6.LIMIT]: 1 },
    } as any);
    const data = (response as any)?.data ?? response;
    expect(Array.isArray((data as any)?.rest)).toBe(true);

    expect(() =>
      (C6 as any).app.Actor.Get({
        [C6.DB]: 'billing',
      } as any)
    ).toThrow(/Conflicting database selection/i);
  });

  it('exposes scoped ORM bindings only for configured database keys', async () => {
    const globals = GLOBAL_REST_PARAMETERS as any;
    const pool = globals.mysqlPool;
    const originalDatabases = globals.databases;

    try {
      delete globals.databases;
      expect((C6 as any).billing).toBeUndefined();

      globals.databases = { billing: pool };
      const scoped = (C6 as any).billing;
      expect(scoped).toBeDefined();
      expect(typeof scoped.Actor.Get).toBe('function');
      expect(typeof scoped.ORM.Actor.Get).toBe('function');

      const tableResponse = await scoped.Actor.Get({
        [C6.PAGINATION]: { [C6.LIMIT]: 1 },
      } as any);
      const tableData = (tableResponse as any)?.data ?? tableResponse;
      expect(Array.isArray((tableData as any)?.rest)).toBe(true);

      const ormResponse = await scoped.ORM.Actor.Get({
        [C6.DB]: 'billing',
        [C6.PAGINATION]: { [C6.LIMIT]: 1 },
      } as any);
      const ormData = (ormResponse as any)?.data ?? ormResponse;
      expect(Array.isArray((ormData as any)?.rest)).toBe(true);
    } finally {
      globals.databases = originalDatabases;
    }
  });

  it('supports C6.app.Actor.Get and C6.stats.General.Post namespace usage', async () => {
    const globals = GLOBAL_REST_PARAMETERS as any;
    const pool = globals.mysqlPool;
    const originalDatabases = globals.databases;
    const orm = (C6 as any).ORM as Record<string, any>;
    const originalGeneral = orm.General;

    const generalPost = vi.fn(async (request: any) => ({
      rest: [],
      affected: 1,
      created: true,
      request,
    }));

    try {
      orm.General = {
        ...(orm.Actor ?? {}),
        Post: generalPost,
      };

      globals.databases = {
        app: pool,
        stats: pool,
      };

      const actorGet = await (C6 as any).app.Actor.Get({
        [C6.PAGINATION]: { [C6.LIMIT]: 1 },
      } as any);
      const actorData = (actorGet as any)?.data ?? actorGet;
      expect(Array.isArray((actorData as any)?.rest)).toBe(true);

      await (C6 as any).stats.General.Post({
        action: 'record',
      } as any);

      expect(generalPost).toHaveBeenCalledTimes(1);
      expect(generalPost.mock.calls[0][0][C6.DB]).toBe('stats');
    } finally {
      if (originalGeneral === undefined) {
        delete orm.General;
      } else {
        orm.General = originalGeneral;
      }
      globals.databases = originalDatabases;
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
