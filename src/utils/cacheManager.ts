import type {iCacheAPI, iCacheResponse} from "../types/ormInterfaces";
import {LogContext, LogLevel, logWithLevel, shouldLog} from "./logLevel";
import logSql from "./logSql";

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
    logContext: LogContext,
): Promise<iCacheResponse<ResponseDataType>> | false {
    const key = makeCacheKey(method, tableName, requestData);
    const cached = apiRequestCache.get(key);

    if (!cached) {
        console.log('apiRequestCache.size', apiRequestCache.size)
        return false;
    }

    if (shouldLog(LogLevel.INFO, logContext)) {
        const sql = cached.response?.data?.sql?.sql ?? "";
        const sqlMethod = sql.trim().split(/\s+/, 1)[0]?.toUpperCase() || method;
        logSql({
            allowListStatus: "not verified",
            cacheStatus: "hit",
            context: logContext,
            method: sqlMethod,
            sql
        });
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
