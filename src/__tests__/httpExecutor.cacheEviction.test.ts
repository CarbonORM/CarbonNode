import { beforeEach, describe, expect, it, vi } from "vitest";
import { C6C, restOrm, apiRequestCache, clearCache } from "@carbonorm/carbonnode";
import { buildTestConfig } from "./fixtures/c6.fixture";

describe("HttpExecutor cache eviction", () => {
  const makeResponsePayload = () => ({
    rest: [
      {
        actor_id: 1,
        first_name: "ALICE",
        last_name: "ONE",
      },
    ],
  });

  const buildOrm = (get: ReturnType<typeof vi.fn>) => {
    const baseConfig = buildTestConfig() as any;

    return restOrm<any>(() => ({
      ...baseConfig,
      requestMethod: C6C.GET,
      restURL: "http://127.0.0.1:9999/rest/",
      axios: { get },
      verbose: false,
    }));
  };

  beforeEach(() => {
    clearCache({ ignoreWarning: true });
  });

  it("adds evictFromCache for cached GET responses", async () => {
    const get = vi.fn().mockResolvedValue({ data: makeResponsePayload() });
    const actorHttp = buildOrm(get);

    const response = await actorHttp.Get({ actor_id: 1, cacheResults: true } as any);

    expect(get).toHaveBeenCalledTimes(1);
    expect(typeof response.evictFromCache).toBe("function");
    expect(apiRequestCache.size).toBe(1);

    expect(response.evictFromCache?.()).toBe(true);
    expect(apiRequestCache.size).toBe(0);
    expect(response.evictFromCache?.()).toBe(false);
  });

  it("does not add evictFromCache when cacheResults is false", async () => {
    const get = vi.fn().mockResolvedValue({ data: makeResponsePayload() });
    const actorHttp = buildOrm(get);

    const response = await actorHttp.Get({ actor_id: 1, cacheResults: false } as any);

    expect(get).toHaveBeenCalledTimes(1);
    expect(response.evictFromCache).toBeUndefined();
    expect(apiRequestCache.size).toBe(0);
  });

  it("keeps evictFromCache on cache hits", async () => {
    const get = vi.fn().mockResolvedValue({ data: makeResponsePayload() });
    const actorHttp = buildOrm(get);

    await actorHttp.Get({ actor_id: 1, cacheResults: true } as any);
    const cached = await actorHttp.Get({ actor_id: 1, cacheResults: true } as any);

    expect(get).toHaveBeenCalledTimes(1);
    expect(typeof cached.evictFromCache).toBe("function");
    expect(cached.evictFromCache?.()).toBe(true);
    expect(apiRequestCache.size).toBe(0);
  });
});
