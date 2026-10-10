import type {iCacheAPI, iCacheResponse} from "../types/ormInterfaces";
import {LogContext, LogLevel, logWithLevel, shouldLog} from "./logLevel";
import logSql, { SqlAllowListStatus } from "./logSql";
import {sortQueryValue} from "./sortAndSerializeQueryObject";

// -----------------------------------------------------------------------------
// Cache Storage
// -----------------------------------------------------------------------------
export const CACHE_LIMITS = Object.freeze({maxEntries: 1000, maxBytes: 16 * 1024 * 1024, maxEntryBytes: 1024 * 1024, ttlMs: 60000});
class BoundedRequestCache implements Map<string, iCacheAPI> {
    private storage = new Map<string, iCacheAPI>();
    readonly [Symbol.toStringTag] = 'Map';
    get size(): number {return this.storage.size;}
    has(key: string): boolean {return this.get(key) !== undefined;}
    keys() {return this.storage.keys();}
    values() {return this.storage.values();}
    entries() {return this.storage.entries();}
    [Symbol.iterator]() {return this.storage[Symbol.iterator]();}
    forEach(callback: (value: iCacheAPI, key: string, map: Map<string, iCacheAPI>) => void, thisArg?: any): void {
        this.storage.forEach((value, key) => callback.call(thisArg, value, key, this));
    }
    private metadata = new Map<string, {bytes: number; expires: number; timer: ReturnType<typeof setTimeout>}>();
    private bytes = 0;
    private expirations = new WeakMap<object, number>();
    delete(key: string): boolean {
        const meta = this.metadata.get(key);
        if (meta) {clearTimeout(meta.timer); this.bytes -= meta.bytes; this.metadata.delete(key);}
        return this.storage.delete(key);
    }
    clear(): void {for (const key of Array.from(this.metadata.keys())) this.delete(key); this.storage.clear();}
    get(key: string): iCacheAPI | undefined {
        const meta = this.metadata.get(key);
        if (meta && meta.expires <= Date.now()) {this.delete(key); return undefined;}
        const value = this.storage.get(key);
        if (value) {this.storage.delete(key); this.storage.set(key, value);}
        return value;
    }
    set(key: string, entry: iCacheAPI): this {
        const existing = this.metadata.get(key);
        // Updates and late promise completions cannot extend the original deadline.
        const expires = existing?.expires ?? this.expirations.get(entry.request) ?? Date.now() + CACHE_LIMITS.ttlMs;
        this.expirations.set(entry.request, expires);
        let size: number;
        try {size = new TextEncoder().encode(key + JSON.stringify(entry.response ?? null)).length;}
        catch {this.delete(key); return this;}
        this.delete(key);
        if (size > CACHE_LIMITS.maxEntryBytes || expires <= Date.now()) return this;
        while (this.size >= CACHE_LIMITS.maxEntries || this.bytes + size > CACHE_LIMITS.maxBytes) {
            const oldest = this.keys().next().value;
            if (oldest === undefined) break;
            this.delete(oldest);
        }
        const timer = setTimeout(() => this.delete(key), expires - Date.now());
        if (typeof timer === 'object' && 'unref' in timer) timer.unref();
        this.metadata.set(key, {bytes: size, expires, timer});
        this.bytes += size;
        this.storage.set(key, entry);
        // Both transports store promises. Failures must never remain cached.
        void entry.request.then(response => {
            if (this.storage.get(key)?.request !== entry.request) return;
            try {
                const settledBytes = new TextEncoder().encode(key + JSON.stringify(response)).length;
                const meta = this.metadata.get(key);
                if (!meta) return;
                if (settledBytes > CACHE_LIMITS.maxEntryBytes) {this.delete(key); return;}
                this.bytes += settledBytes - meta.bytes; meta.bytes = settledBytes;
                while (this.bytes > CACHE_LIMITS.maxBytes) this.delete(this.keys().next().value!);
            } catch {this.delete(key);}
        }, () => {if (this.storage.get(key)?.request === entry.request) this.delete(key);});
        return this;
    }
}
export const apiRequestCache = new BoundedRequestCache();
export const userCustomClearCache: (() => void)[] = [];

// -----------------------------------------------------------------------------
// Cache keys retain the complete canonical request to avoid hash collisions.
const backendIds = new WeakMap<object, number>();
let nextBackendId = 0;
export function scopedCacheRequest(config: any, request: unknown, transport: 'sql' | 'http'): unknown {
    const backend = transport === 'sql' ? (config.mysqlPool ?? config.postgresPool) : config.axios;
    if (backend && !backendIds.has(backend)) backendIds.set(backend, ++nextBackendId);
    return [transport, backend ? backendIds.get(backend) : null, config.restURL ?? '',
        config.cacheScope, config.sqlAllowListPath ?? '', config.cacheDatabaseKey ?? '',
        {queryLimits: config.queryLimits, maxPageSize: config.maxPageSize,
            maxPageOffset: config.maxPageOffset, maxResponseBytes: config.maxResponseBytes,
            statementTimeoutMs: config.statementTimeoutMs,
            enforceRestFunctionPolicy: config.enforceRestFunctionPolicy,
            enforceSqlTransportBudget: config.enforceSqlTransportBudget,
            restFunctionAllowlist: config.restFunctionAllowlist}, request];
}

function makeCacheKey(
    method: string,
    tableName: string | string[],
    requestData: unknown,
): string {
    const raw = JSON.stringify([method, tableName, sortQueryValue(requestData)]);
    return raw;
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
    logContext?: LogContext,
    allowListStatus?: SqlAllowListStatus,
): Promise<iCacheResponse<ResponseDataType>> | false {
    const key = makeCacheKey(method, tableName, requestData);
    const cached = apiRequestCache.get(key);

    if (!cached) {
        return false;
    }

    if (shouldLog(LogLevel.INFO, logContext)) {
        const sql = cached.response?.data?.sql?.sql ?? "";
        const sqlMethod = sql.trim().split(/\s+/, 1)[0]?.toUpperCase() || method;
        logSql({
            allowListStatus: cached.allowListStatus ?? allowListStatus ?? "not verified",
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

export function evictCacheEntry(
    method: string,
    tableName: string | string[],
    requestData: any,
    logContext?: LogContext,
    allowListStatus?: SqlAllowListStatus,
): boolean {
    const key = makeCacheKey(method, tableName, requestData);
    const cached = apiRequestCache.get(key);
    const deleted = apiRequestCache.delete(key);

    if (deleted && shouldLog(LogLevel.INFO, logContext)) {
        const sql = cached?.response?.data?.sql?.sql ?? "";
        const sqlMethod = sql.trim().split(/\s+/, 1)[0]?.toUpperCase() || method;
        logSql({
            allowListStatus: cached?.allowListStatus ?? allowListStatus ?? "not verified",
            cacheStatus: "evicted",
            context: logContext,
            method: sqlMethod,
            sql,
        });
    }

    return deleted;
}
