import type {iCacheAPI, iCacheResponse} from "../types/ormInterfaces";
import {LogLevel, logWithLevel, shouldLog} from "./logLevel";

// -----------------------------------------------------------------------------
// Cache Storage
// -----------------------------------------------------------------------------
export const apiRequestCache = new Map<string, iCacheAPI>();
export const userCustomClearCache: (() => void)[] = [];

// -----------------------------------------------------------------------------
// Cache Key Generator (safe, fixed-size ~40 chars)
// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------
// Browser-safe deterministic hash (FNV-1a)
// -----------------------------------------------------------------------------
function fnv1a(str: string): string {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = (h * 0x01000193) >>> 0;
    }
    return h.toString(16);
}

function makeCacheKey(
    method: string,
    tableName: string | string[],
    requestData: unknown,
): string {
    const raw = JSON.stringify([method, tableName, requestData]);
    return fnv1a(raw);
}

// -----------------------------------------------------------------------------
// Clear Cache (no shared-array bugs)
// -----------------------------------------------------------------------------
export function clearCache(props?: { ignoreWarning?: boolean }): void {
    if (!props?.ignoreWarning) {
        logWithLevel(
            LogLevel.WARN,
            undefined,
            console.warn,
            "The REST API clearCache should only be used with extreme care!",
        );
    }

    for (const fn of userCustomClearCache) {
        try {
            fn();
        } catch {}
    }

    apiRequestCache.clear();
}

// -----------------------------------------------------------------------------
// Check Cache (dedupe via hashed key)
// -----------------------------------------------------------------------------
export function checkCache<ResponseDataType = any>(
    method: string,
    tableName: string | string[],
    requestData: any,
): Promise<iCacheResponse<ResponseDataType>> | false {
    const key = makeCacheKey(method, tableName, requestData);
    const cached = apiRequestCache.get(key);

    if (!cached) return false;

    if (shouldLog(LogLevel.INFO, undefined)) {
        console.groupCollapsed(
            `%c API cache hit for ${method} ${tableName}`,
            "color:#0c0",
        );
        console.log("Request Data:", requestData);
        console.groupEnd();
    }

    return cached.request;
}

// -----------------------------------------------------------------------------
// Store Cache Entry (drop-in compatible)
// -----------------------------------------------------------------------------
export function setCache<ResponseDataType = any>(
    method: string,
    tableName: string | string[],
    requestData: any,
    cacheEntry: iCacheAPI<ResponseDataType>,
): void {
    const key = makeCacheKey(method, tableName, requestData);
    apiRequestCache.set(key, cacheEntry);
}
