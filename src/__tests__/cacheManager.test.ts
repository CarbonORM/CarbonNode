import type { AxiosPromise } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  apiRequestCache,
  checkCache,
  clearCache,
  evictCacheEntry,
  setCache,
} from "../utils/cacheManager";
import { checkAllRequestsComplete } from "../utils/testHelpers";

describe("cacheManager with map storage", () => {
  const requestData = { id: 1 } as const;

  beforeEach(() => {
    clearCache({ ignoreWarning: true });
  });

  it("stores and returns cached requests", () => {
    const mockRequest = Promise.resolve({ data: { rest: [] } }) as AxiosPromise;

    setCache("GET", "table", requestData, {
      requestArgumentsSerialized: "serialized",
      request: mockRequest,
    });

    const cached = checkCache("GET", "table", { ...requestData });
    expect(cached).toBe(mockRequest);
  });

  it("clears cache entries", () => {
    const mockRequest = Promise.resolve({ data: { rest: [] } }) as AxiosPromise;

    setCache("GET", "table", requestData, {
      requestArgumentsSerialized: "serialized",
      request: mockRequest,
    });

    clearCache({ ignoreWarning: true });

    expect(apiRequestCache.size).toBe(0);
    expect(checkCache("GET", "table", requestData)).toBe(false);
  });

  it("reports pending and completed requests via helper", () => {
    const originalDocument = (global as any).document;
    (global as any).document = {};

    setCache("GET", "table", requestData, {
      requestArgumentsSerialized: "pending",
      request: Promise.resolve({ data: null }) as AxiosPromise,
    });

    expect(checkAllRequestsComplete()).toEqual(["pending"]);

    setCache("GET", "table", requestData, {
      requestArgumentsSerialized: "pending",
      request: Promise.resolve({ data: null }) as AxiosPromise,
      response: {} as any,
      final: true,
    });

    expect(checkAllRequestsComplete()).toBe(true);

    (global as any).document = originalDocument;
  });

  it("logs SQL details when evicting a cached entry", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const mockRequest = Promise.resolve({ data: { rest: [] } }) as AxiosPromise;

    setCache("GET", "table", requestData, {
      requestArgumentsSerialized: "serialized",
      request: mockRequest,
      response: {
        data: {
          sql: {
            sql: "SELECT * FROM table WHERE id = 1",
          },
        },
      } as any,
      final: true,
    });

    expect(evictCacheEntry("GET", "table", requestData, { verbose: true })).toBe(true);
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(String(logSpy.mock.calls[0]?.[0] ?? "")).toContain("[CACHE EVICTED]");
    expect(String(logSpy.mock.calls[0]?.[0] ?? "")).toContain("[SELECT]");

    logSpy.mockRestore();
  });
});
