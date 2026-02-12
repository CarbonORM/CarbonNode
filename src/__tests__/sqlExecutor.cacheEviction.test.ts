import { beforeEach, describe, expect, it, vi } from "vitest";
import { restOrm } from "../api/restOrm";
import { apiRequestCache, clearCache } from "../utils/cacheManager";
import { buildTestConfig } from "./fixtures/c6.fixture";

describe("SqlExecutor cache eviction", () => {
  const rows = [
    {
      actor_id: 1,
      first_name: "ALICE",
      last_name: "ONE",
    },
  ];

  const buildOrm = () => {
    const conn: any = {
      beginTransaction: vi.fn(async () => undefined),
      query: vi.fn(async () => [rows, []]),
      commit: vi.fn(async () => undefined),
      rollback: vi.fn(async () => undefined),
      release: vi.fn(),
    };

    const baseConfig = buildTestConfig() as any;

    const actorSql = restOrm<any>(() => ({
      ...baseConfig,
      mysqlPool: {
        getConnection: vi.fn(async () => conn),
      },
      verbose: false,
    }));

    return {
      actorSql,
      conn,
    };
  };

  beforeEach(() => {
    clearCache({ ignoreWarning: true });
  });

  it("adds evictFromCache for cached GET responses", async () => {
    const { actorSql, conn } = buildOrm();

    const response = await actorSql.Get({ actor_id: 1, cacheResults: true } as any);

    expect(conn.query).toHaveBeenCalledTimes(1);
    expect(typeof response.evictFromCache).toBe("function");
    expect(apiRequestCache.size).toBe(1);

    expect(response.evictFromCache?.()).toBe(true);
    expect(apiRequestCache.size).toBe(0);
    expect(response.evictFromCache?.()).toBe(false);
  });

  it("does not add evictFromCache when cacheResults is false", async () => {
    const { actorSql, conn } = buildOrm();

    const response = await actorSql.Get({ actor_id: 1, cacheResults: false } as any);

    expect(conn.query).toHaveBeenCalledTimes(1);
    expect(response.evictFromCache).toBeUndefined();
    expect(apiRequestCache.size).toBe(0);
  });

  it("keeps evictFromCache on cache hits", async () => {
    const { actorSql, conn } = buildOrm();

    await actorSql.Get({ actor_id: 1, cacheResults: true } as any);
    const cached = await actorSql.Get({ actor_id: 1, cacheResults: true } as any);

    expect(conn.query).toHaveBeenCalledTimes(1);
    expect(typeof cached.evictFromCache).toBe("function");
    expect(cached.evictFromCache?.()).toBe(true);
    expect(apiRequestCache.size).toBe(0);
  });
});
