import { DeleteQueryBuilder } from "../orm/queries/DeleteQueryBuilder";
import { PostQueryBuilder } from "../orm/queries/PostQueryBuilder";
import { SelectQueryBuilder } from "../orm/queries/SelectQueryBuilder";
import { UpdateQueryBuilder } from "../orm/queries/UpdateQueryBuilder";
import { OrmGenerics } from "../types/ormGenerics";
import { C6Constants as C6C } from "../constants/C6Constants";
import {
    DetermineResponseDataType,
    iCacheResponse,
    iRestLifecycleResponse,
    iRestMethods,
    iRestSqlExecutionContext,
    iRestWebsocketPayload,
} from "../types/ormInterfaces";
import namedPlaceholders from 'named-placeholders';
import type { PoolConnection } from 'mysql2/promise';
import { Buffer } from 'buffer';
import { Executor } from "./Executor";
import {checkCache, evictCacheEntry, setCache} from "../utils/cacheManager";
import logSql, {
    SqlAllowListStatus,
} from "../utils/logSql";
import { normalizeSingularRequest } from "../utils/normalizeSingularRequest";
import {sortAndSerializeQueryObject} from "../utils/sortAndSerializeQueryObject";
import { loadSqlAllowList, normalizeSql } from "../utils/sqlAllowList";
import { getLogContext, LogLevel, logWithLevel } from "../utils/logLevel";

const SQL_ALLOWLIST_BLOCKED_CODE = "SQL_ALLOWLIST_BLOCKED";

const fillRandomBytes = (bytes: Uint8Array): void => {
    const cryptoRef = (globalThis as { crypto?: Crypto }).crypto;
    if (!cryptoRef || typeof cryptoRef.getRandomValues !== "function") {
        throw new Error("Secure random source unavailable: crypto.getRandomValues is required for UUID generation.");
    }
    cryptoRef.getRandomValues(bytes);
};

const generateUuidV7 = (): string => {
    const bytes = new Uint8Array(16);
    const random = new Uint8Array(10);
    fillRandomBytes(random);

    const timestampMs = Date.now();
    bytes[0] = Math.floor(timestampMs / 1099511627776) & 0xff; // 2^40
    bytes[1] = Math.floor(timestampMs / 4294967296) & 0xff; // 2^32
    bytes[2] = Math.floor(timestampMs / 16777216) & 0xff; // 2^24
    bytes[3] = Math.floor(timestampMs / 65536) & 0xff; // 2^16
    bytes[4] = Math.floor(timestampMs / 256) & 0xff; // 2^8
    bytes[5] = timestampMs & 0xff;

    // RFC 9562 UUIDv7 layout
    bytes[6] = 0x70 | (random[0] & 0x0f); // version 7 + rand_a high bits
    bytes[7] = random[1]; // rand_a low bits
    bytes[8] = 0x80 | (random[2] & 0x3f); // variant + rand_b high bits
    bytes[9] = random[3];
    bytes[10] = random[4];
    bytes[11] = random[5];
    bytes[12] = random[6];
    bytes[13] = random[7];
    bytes[14] = random[8];
    bytes[15] = random[9];

    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

export type SqlAllowListBlockedError = Error & {
    code: typeof SQL_ALLOWLIST_BLOCKED_CODE;
    tableName?: string;
    method?: string;
    normalizedSql: string;
    allowListPath: string;
    sqlAllowList: {
        sql: string;
        table: string | null;
        method: string | null;
        allowListPath: string;
        canAdd: boolean;
    };
};

const createSqlAllowListBlockedError = (args: {
    tableName?: string;
    method?: string;
    normalizedSql: string;
    allowListPath: string;
}): SqlAllowListBlockedError => {
    const error = new Error(
        `SQL statement is not permitted by allowlist (${args.allowListPath}).`,
    ) as SqlAllowListBlockedError;

    error.name = "SqlAllowListBlockedError";
    error.code = SQL_ALLOWLIST_BLOCKED_CODE;
    error.tableName = args.tableName;
    error.method = args.method;
    error.normalizedSql = args.normalizedSql;
    error.allowListPath = args.allowListPath;
    error.sqlAllowList = {
        sql: args.normalizedSql,
        table: args.tableName ?? null,
        method: args.method ?? null,
        allowListPath: args.allowListPath,
        canAdd: true,
    };

    return error;
};

export class SqlExecutor<
    G extends OrmGenerics
> extends Executor<G> {
    private getPostRequestRows(): Record<string, any>[] {
        const request = this.request as any;
        if (!request) return [];

        if (Array.isArray(request)) {
            return request as Record<string, any>[];
        }

        if (
            Array.isArray(request.dataInsertMultipleRows)
            && request.dataInsertMultipleRows.length > 0
        ) {
            return request.dataInsertMultipleRows as Record<string, any>[];
        }

        const verb = C6C.REPLACE in request ? C6C.REPLACE : C6C.INSERT;
        if (verb in request && request[verb] && typeof request[verb] === "object") {
            return [request[verb] as Record<string, any>];
        }

        if (typeof request === "object") {
            return [request as Record<string, any>];
        }

        return [];
    }

    private getTypeValidationForColumn(shortKey: string, fullKey: string): Record<string, any> | undefined {
        const validation = (this.config.restModel as any)?.TYPE_VALIDATION;
        if (!validation || typeof validation !== "object") return undefined;
        return validation[shortKey] ?? validation[fullKey];
    }

    private isUuidLikePrimaryColumn(columnDef: Record<string, any> | undefined): boolean {
        if (!columnDef || typeof columnDef !== "object") return false;
        if (columnDef.AUTO_INCREMENT === true) return false;

        const mysqlType = String(columnDef.MYSQL_TYPE ?? "").toLowerCase();
        const maxLength = String(columnDef.MAX_LENGTH ?? "").trim();

        if (mysqlType.includes("uuid")) return true;

        const isBinary16 = mysqlType.includes("binary")
            && (maxLength === "16" || /\b16\b/.test(mysqlType) || mysqlType === "binary");
        const isUuidString = (mysqlType.includes("char") || mysqlType.includes("varchar"))
            && (maxLength === "32" || maxLength === "36");

        return isBinary16 || isUuidString;
    }

    private hasDefinedValue(value: unknown): boolean {
        if (value === undefined || value === null) return false;
        if (typeof value === "string" && value.trim() === "") return false;
        return true;
    }

    private generatePrimaryUuidValue(columnDef: Record<string, any>): string {
        const mysqlType = String(columnDef.MYSQL_TYPE ?? "").toLowerCase();
        const maxLength = String(columnDef.MAX_LENGTH ?? "").trim();
        const uuid = generateUuidV7();

        // BINARY(16) and CHAR/VARCHAR(32) commonly persist UUIDs as 32-hex.
        if (mysqlType.includes("binary") || maxLength === "32") {
            return uuid.replace(/-/g, "").toUpperCase();
        }

        return uuid;
    }

    private assignMissingPostPrimaryUuids(): void {
        if (this.config.requestMethod !== C6C.POST) return;

        const rows = this.getPostRequestRows();
        if (rows.length === 0) return;

        const columns = this.config.restModel.COLUMNS as Record<string, string>;
        const tableName = this.config.restModel.TABLE_NAME as string;
        const primaryShorts = this.config.restModel.PRIMARY_SHORT ?? [];

        const primaryColumns = primaryShorts
            .map((shortKey) => {
                const fullKey = Object.keys(columns).find((key) => columns[key] === shortKey)
                    ?? `${tableName}.${shortKey}`;
                const columnDef = this.getTypeValidationForColumn(shortKey, fullKey);
                return { shortKey, fullKey, columnDef };
            })
            .filter(({ columnDef }) => this.isUuidLikePrimaryColumn(columnDef));

        if (primaryColumns.length === 0) return;

        for (const row of rows) {
            if (!row || typeof row !== "object") continue;

            const useQualifiedKeyByDefault = Object.keys(row).some((key) => key.includes("."));

            for (const primaryColumn of primaryColumns) {
                const existing = row[primaryColumn.shortKey] ?? row[primaryColumn.fullKey];
                if (this.hasDefinedValue(existing)) continue;

                const generated = this.generatePrimaryUuidValue(primaryColumn.columnDef!);
                if (Object.prototype.hasOwnProperty.call(row, primaryColumn.shortKey)) {
                    row[primaryColumn.shortKey] = generated;
                    continue;
                }
                if (Object.prototype.hasOwnProperty.call(row, primaryColumn.fullKey)) {
                    row[primaryColumn.fullKey] = generated;
                    continue;
                }

                row[useQualifiedKeyByDefault ? primaryColumn.fullKey : primaryColumn.shortKey] = generated;
            }
        }
    }

    private buildPostResponseRows(insertId?: number | string): Record<string, unknown>[] {
        const rows = this.getPostRequestRows();
        if (rows.length === 0) return [];

        const columns = this.config.restModel.COLUMNS as Record<string, string>;
        const validColumns = new Set(Object.values(columns));
        const pkShorts = this.config.restModel.PRIMARY_SHORT ?? [];
        const now = new Date().toISOString();

        return rows.map((row, index) => {
            const normalized = this.normalizeRequestPayload(row ?? {});

            if (validColumns.has("changed_at") && normalized.changed_at === undefined) {
                normalized.changed_at = now;
            }
            if (validColumns.has("created_at") && normalized.created_at === undefined) {
                normalized.created_at = now;
            }
            if (validColumns.has("updated_at") && normalized.updated_at === undefined) {
                normalized.updated_at = now;
            }

            // When DB generated PK is numeric/autoincrement, expose it for the single-row insert.
            if (
                index === 0
                && insertId !== undefined
                && insertId !== null
                && pkShorts.length === 1
                && !this.hasDefinedValue(normalized[pkShorts[0]])
            ) {
                normalized[pkShorts[0]] = insertId;
            }

            return normalized;
        });
    }

    private resolveSqlLogMethod(method: iRestMethods, sql: string): string {
        const token = sql.trim().split(/\s+/, 1)[0]?.toUpperCase();
        if (token) return token;
        switch (method) {
            case C6C.GET:
                return "SELECT";
            case C6C.POST:
                return "INSERT";
            case C6C.PUT:
                return "UPDATE";
            default:
                return "DELETE";
        }
    }

    async execute(): Promise<DetermineResponseDataType<G['RequestMethod'], G['RestTableInterface']>> {
        const { TABLE_NAME } = this.config.restModel;
        const method = this.config.requestMethod;

        await this.runLifecycleHooks<"beforeProcessing">(
            "beforeProcessing",
            {
                config: this.config,
                request: this.request,
            },
        );

        // Normalize singular T-shaped requests into complex ORM shape (GET/PUT/DELETE)
        try {
            this.request = normalizeSingularRequest(
                method,
                this.request,
                this.config.restModel,
                undefined
            ) as typeof this.request;
        } catch (e) {
            // Surface normalization errors early
            throw e;
        }

        this.assignMissingPostPrimaryUuids();

        const logContext = getLogContext(this.config, this.request);
        logWithLevel(
            LogLevel.DEBUG,
            logContext,
            console.log,
            `[SQL EXECUTOR] ▶️ Executing ${method} on table "${TABLE_NAME}"`,
        );
        logWithLevel(
            LogLevel.DEBUG,
            logContext,
            console.log,
            `[SQL EXECUTOR] 🧩 Request:`,
            this.request,
        );

        let response:
            | DetermineResponseDataType<G['RequestMethod'], G['RestTableInterface']>;

        switch (method) {
            case 'GET': {
                const rest = await this.runQuery();
                if (this.config.reactBootstrap) {
                    const getResponse =
                        rest as unknown as DetermineResponseDataType<'GET', G['RestTableInterface']>;
                    const restRows = Array.isArray(getResponse.rest)
                        ? getResponse.rest
                        : [getResponse.rest];
                    this.config.reactBootstrap.updateRestfulObjectArrays({
                        dataOrCallback: restRows,
                        stateKey: this.config.restModel.TABLE_NAME,
                        uniqueObjectId:
                            this.config.restModel.PRIMARY_SHORT as unknown as (keyof G['RestTableInterface'])[],
                    });
                }
                response = rest as DetermineResponseDataType<G['RequestMethod'], G['RestTableInterface']>;
                break;
            }

            case 'POST': {
                const result = await this.runQuery();
                await this.broadcastWebsocketIfConfigured(result);
                response = result as DetermineResponseDataType<G['RequestMethod'], G['RestTableInterface']>;
                break;
            }

            case 'PUT': {
                const result = await this.runQuery();
                await this.broadcastWebsocketIfConfigured(result);
                response = result as DetermineResponseDataType<G['RequestMethod'], G['RestTableInterface']>;
                break;
            }

            case 'DELETE': {
                const result = await this.runQuery();
                await this.broadcastWebsocketIfConfigured(result);
                response = result as DetermineResponseDataType<G['RequestMethod'], G['RestTableInterface']>;
                break;
            }

            default:
                throw new Error(`Unsupported request method: ${method}`);
        }

        return response;
    }

    private async withConnection<T>(cb: (conn: PoolConnection) => Promise<T>): Promise<T> {
        const logContext = getLogContext(this.config, this.request);
        logWithLevel(
            LogLevel.DEBUG,
            logContext,
            console.log,
            `[SQL EXECUTOR] 📡 Getting DB connection`,
        );
        const conn = await this.config.mysqlPool!.getConnection();
        try {
            logWithLevel(
                LogLevel.DEBUG,
                logContext,
                console.log,
                `[SQL EXECUTOR] ✅ Connection acquired`,
            );
            return await cb(conn);
        } finally {
            logWithLevel(
                LogLevel.DEBUG,
                logContext,
                console.log,
                `[SQL EXECUTOR] 🔌 Releasing DB connection`,
            );
            conn.release();
        }
    }

    public serialize = (row: any) => Object.fromEntries(Object.entries(row).map(
        ([k, v]) => [k, Buffer.isBuffer(v) ? v.toString('hex').toUpperCase() : v]
    ));


    public formatSQLWithParams(sql: string, params: any[] | { [key: string]: any }): string {
        if (Array.isArray(params)) {
            let index = 0;
            return sql.replace(/\?/g, () => {
                if (index >= params.length) return '?';
                const val = params[index++];
                return this.formatValue(val);
            });
        } else {
            return sql.replace(/:([a-zA-Z0-9_]+)/g, (_, key) => {
                const val = params[key];
                return this.formatValue(val);
            });
        }
    }

    private formatValue(val: any): string {
        if (val === null || val === undefined) return 'NULL';
        if (Buffer.isBuffer(val)) return `UNHEX('${val.toString('hex')}')`;
        if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
        if (typeof val === 'number') return val.toString();
        if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
        return `'${JSON.stringify(val)}'`;
    }

    private stripRequestMetadata(source: Record<string, unknown>): Record<string, unknown> {
        const ignoredKeys = new Set<string>([
            C6C.SELECT,
            C6C.UPDATE,
            C6C.DELETE,
            C6C.WHERE,
            C6C.JOIN,
            C6C.PAGINATION,
            C6C.INSERT,
            C6C.REPLACE,
            "dataInsertMultipleRows",
            "cacheResults",
            "skipReactBootstrap",
            "fetchDependencies",
            "debug",
            "success",
            "error",
        ]);

        const filtered: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(source)) {
            if (!ignoredKeys.has(key)) {
                filtered[key] = value;
            }
        }
        return filtered;
    }

    private normalizeRequestPayload(source: Record<string, unknown>): Record<string, unknown> {
        const columns = this.config.restModel.COLUMNS as Record<string, string>;
        const validColumns = new Set(Object.values(columns));
        const normalized: Record<string, unknown> = {};

        for (const [key, value] of Object.entries(source)) {
            const shortKey = columns[key] ?? (key.includes(".") ? key.split(".").pop()! : key);
            if (validColumns.has(shortKey)) {
                normalized[shortKey] = value;
            }
        }

        return normalized;
    }


    private extractRequestBody() {
        const request = this.request;

        if (this.config.requestMethod === C6C.POST) {
            const insertRows = request.dataInsertMultipleRows;
            if (Array.isArray(insertRows) && insertRows.length > 0) {
                return insertRows[0] as Record<string, unknown>;
            }
            if (C6C.INSERT in request) {
                return request[C6C.INSERT] ?? {};
            }
            if (C6C.REPLACE in request) {
                return request[C6C.REPLACE] ?? {};
            }
            return this.stripRequestMetadata(request);
        }

        if (this.config.requestMethod === C6C.PUT) {
            if (request[C6C.UPDATE] && typeof request[C6C.UPDATE] === "object") {
                return request[C6C.UPDATE] as Record<string, unknown>;
            }
            return this.stripRequestMetadata(request);
        }

        return {};
    }

    private extractPrimaryKeyValues(): Record<string, any> | null {
        const request = this.request as Record<string, any>;
        const where = request?.[C6C.WHERE];
        const sources = [request, (where && typeof where === "object" && !Array.isArray(where)) ? where : undefined];
        const columns = this.config.restModel.COLUMNS as Record<string, string>;
        const primaryShorts = this.config.restModel.PRIMARY_SHORT ?? [];
        const primaryFulls = this.config.restModel.PRIMARY ?? [];
        const pkValues: Record<string, any> = {};

        for (const pkShort of primaryShorts) {
            let value: any = undefined;

            for (const source of sources) {
                if (source && pkShort in source) {
                    value = source[pkShort];
                    break;
                }
            }

            if (value === undefined) {
                const fullKey = primaryFulls.find((key: string) => key.endsWith("." + pkShort))
                    ?? Object.keys(columns).find((key) => columns[key] === pkShort);

                if (fullKey) {
                    for (const source of sources) {
                        if (source && fullKey in source) {
                            value = source[fullKey];
                            break;
                        }
                    }
                }
            }

            if (value !== undefined) {
                pkValues[pkShort] = this.unwrapPrimaryKeyValue(value);
            }
        }

        if (primaryShorts.length > 0 && Object.keys(pkValues).length < primaryShorts.length) {
            return null;
        }

        return Object.keys(pkValues).length > 0 ? pkValues : null;
    }

    private unwrapPrimaryKeyValue(value: any): any {
        if (!Array.isArray(value)) return value;

        if (value.length === 2) {
            const [head, tail] = value;
            if (head === C6C.EQUAL) {
                return this.unwrapPrimaryKeyValue(tail);
            }
            if (head === C6C.LIT || head === C6C.PARAM) {
                return tail;
            }
        }

        if (value.length === 3) {
            const [, operator, right] = value;
            if (operator === C6C.EQUAL) {
                return this.unwrapPrimaryKeyValue(right);
            }
        }

        return value;
    }

    private extractPrimaryKeyValuesFromData(data: any): Record<string, any> | null {
        if (!data) return null;
        const row = Array.isArray(data) ? data[0] : data;
        if (!row || typeof row !== "object") return null;

        const pkShorts = this.config.restModel.PRIMARY_SHORT;
        const columns = this.config.restModel.COLUMNS as Record<string, string>;
        const pkValues: Record<string, any> = {};

        for (const pk of pkShorts) {
            if (pk in row) {
                pkValues[pk] = (row as Record<string, any>)[pk];
                continue;
            }

            const fullKey = Object.keys(columns).find(
                (key) => columns[key] === pk,
            );

            if (fullKey && fullKey in row) {
                pkValues[pk] = (row as Record<string, any>)[fullKey];
            }
        }

        if (pkShorts.length > 0 && Object.keys(pkValues).length < pkShorts.length) {
            return null;
        }

        return Object.keys(pkValues).length > 0 ? pkValues : null;
    }

    private async broadcastWebsocketIfConfigured(
        response?: DetermineResponseDataType<G['RequestMethod'], G['RestTableInterface']>
    ): Promise<void> {
        const broadcast = this.config.websocketBroadcast;
        const logContext = getLogContext(this.config, this.request);
        logWithLevel(
            LogLevel.DEBUG,
            logContext,
            console.log,
            "[SQL EXECUTOR] 📣 broadcastWebsocketIfConfigured start",
            {
                method: this.config.requestMethod,
                hasBroadcast: Boolean(broadcast),
            },
        );
        if (!broadcast || this.config.requestMethod === C6C.GET) {
            logWithLevel(
                LogLevel.DEBUG,
                logContext,
                console.log,
                "[SQL EXECUTOR] 📣 websocket broadcast skipped",
                {
                    reason: !broadcast ? "no broadcast configured" : "GET request",
                },
            );
            return;
        }

        const normalizedRequest = this.normalizeRequestPayload(this.extractRequestBody());
        const pkShorts = this.config.restModel.PRIMARY_SHORT ?? [];
        const columns = this.config.restModel.COLUMNS as Record<string, string>;
        const validColumns = new Set(Object.values(columns));
        let responseRest = response?.rest;
        let responsePrimaryKey = this.extractPrimaryKeyValuesFromData(responseRest);

        logWithLevel(
            LogLevel.DEBUG,
            logContext,
            console.log,
            "[SQL EXECUTOR] 📣 websocket request payload",
            {
                normalizedRequest,
                requestPrimaryKey: this.extractPrimaryKeyValues(),
                pkShorts,
            },
        );
        logWithLevel(
            LogLevel.DEBUG,
            logContext,
            console.log,
            "[SQL EXECUTOR] 📣 websocket response payload",
            {
                responseRest,
                responsePrimaryKey,
            },
        );

        if (
            (responseRest === null || (Array.isArray(responseRest) && responseRest.length === 0))
            && this.config.requestMethod === C6C.POST
        ) {
            logWithLevel(
                LogLevel.DEBUG,
                logContext,
                console.log,
                "[SQL EXECUTOR] 📣 response rest empty, attempting synthesize",
                {
                    responseRest,
                },
            );
            const insertId = (response as DetermineResponseDataType<G['RequestMethod'], G['RestTableInterface']> & { insertId?: number | string | null })?.insertId;
            logWithLevel(
                LogLevel.DEBUG,
                logContext,
                console.log,
                "[SQL EXECUTOR] 📣 POST insertId lookup",
                {
                    insertId,
                },
            );
            if (insertId !== undefined && pkShorts.length === 1) {
                const synthesizedRequest = {
                    ...normalizedRequest,
                };
                const now = new Date().toISOString();
                if (validColumns.has("changed_at") && (synthesizedRequest as Record<string, unknown>).changed_at === undefined) {
                    synthesizedRequest.changed_at = now;
                }
                if (validColumns.has("created_at") && (synthesizedRequest as Record<string, unknown>).created_at === undefined) {
                    synthesizedRequest.created_at = now;
                }
                if (validColumns.has("updated_at") && (synthesizedRequest as Record<string, unknown>).updated_at === undefined) {
                    synthesizedRequest.updated_at = now;
                }

                const synthesized = {
                    ...synthesizedRequest,
                    [pkShorts[0]]: insertId,
                };
                // @ts-ignore - todo
                responseRest = [synthesized];
                responsePrimaryKey = {
                    [pkShorts[0]]: insertId,
                };
                logWithLevel(
                    LogLevel.DEBUG,
                    logContext,
                    console.log,
                    "[SQL EXECUTOR] 📣 synthesized response payload",
                    {
                        synthesized,
                        responsePrimaryKey,
                    },
                );
            }
        }

        const payload: iRestWebsocketPayload = {
            REST: {
                TABLE_NAME: this.config.restModel.TABLE_NAME as string,
                TABLE_PREFIX: this.config.C6?.PREFIX ?? "",
                METHOD: this.config.requestMethod,
                REQUEST: normalizedRequest,
                REQUEST_PRIMARY_KEY: this.extractPrimaryKeyValues(),
                RESPONSE: responseRest,
                RESPONSE_PRIMARY_KEY: responsePrimaryKey,
            },
        };

        logWithLevel(
            LogLevel.DEBUG,
            logContext,
            console.log,
            "[SQL EXECUTOR] 📣 websocket payload ready",
            payload,
        );

        try {
            logWithLevel(
                LogLevel.DEBUG,
                logContext,
                console.log,
                "[SQL EXECUTOR] 📣 websocket broadcast dispatch start",
            );
            await broadcast(payload);
            logWithLevel(
                LogLevel.DEBUG,
                logContext,
                console.log,
                "[SQL EXECUTOR] 📣 websocket broadcast dispatch complete",
            );
        } catch (error) {
            logWithLevel(
                LogLevel.ERROR,
                logContext,
                console.error,
                "[SQL EXECUTOR] websocketBroadcast failed",
                error,
            );
        }
    }
    async runQuery(): Promise<DetermineResponseDataType<G['RequestMethod'], G['RestTableInterface']>> {
        const method = this.config.requestMethod;
        const tableName = this.config.restModel.TABLE_NAME;
        const logContext = getLogContext(this.config, this.request);
        const cacheResults = method === C6C.GET
            && (this.request.cacheResults ?? true);
        const cacheAllowListStatus: SqlAllowListStatus = this.config.sqlAllowListPath
            ? "allowed"
            : "not verified";

        const cacheRequestData = cacheResults
            ? JSON.parse(JSON.stringify(this.request ?? {}))
            : undefined;

        const requestArgumentsSerialized = cacheResults
            ? sortAndSerializeQueryObject(tableName, cacheRequestData ?? {})
            : undefined;

        const evictFromCache =
            method === C6C.GET && cacheResults && cacheRequestData
                ? () => evictCacheEntry(
                    method,
                    tableName,
                    cacheRequestData,
                    logContext,
                    cacheAllowListStatus,
                )
                : undefined;

        if (cacheResults) {
            const cachedRequest = checkCache<DetermineResponseDataType<G['RequestMethod'], G['RestTableInterface']>>(
                method,
                tableName,
                cacheRequestData,
                logContext,
                cacheAllowListStatus,
            );
            if (cachedRequest) {
                const cachedData = (await cachedRequest).data;
                if (evictFromCache
                    && cachedData
                    && typeof cachedData === "object"
                    && Array.isArray((cachedData as DetermineResponseDataType<'GET', G['RestTableInterface']>).rest)) {
                    (cachedData as DetermineResponseDataType<'GET', G['RestTableInterface']>).evictFromCache = evictFromCache;
                }
                return cachedData;
            }
        }

        const sqlExecution = this.buildSqlExecutionContext(method, tableName, logContext);
        const sqlMethod = this.resolveSqlLogMethod(method, sqlExecution.sql);
        const queryPromise = this.withConnection(async (conn) =>
            this.executeQueryWithLifecycle(
                conn,
                method,
                sqlExecution,
                logContext,
                sqlMethod
            ),
        );

        if (!cacheResults || !cacheRequestData || !requestArgumentsSerialized) {
            return await queryPromise;
        }

        const cacheRequest = queryPromise.then((data) => {
            if (evictFromCache
                && data
                && typeof data === "object"
                && Array.isArray((data as DetermineResponseDataType<'GET', G['RestTableInterface']>).rest)) {
                (data as DetermineResponseDataType<'GET', G['RestTableInterface']>).evictFromCache = evictFromCache;
            }
            return this.createCacheResponseEnvelope(method, tableName, data);
        });

        setCache(method, tableName, cacheRequestData, {
            requestArgumentsSerialized,
            request: cacheRequest,
            allowListStatus: cacheAllowListStatus,
        });

        const cacheResponse = await cacheRequest;
        setCache(method, tableName, cacheRequestData, {
            requestArgumentsSerialized,
            request: cacheRequest,
            allowListStatus: cacheAllowListStatus,
            response: cacheResponse,
            final: true,
        });

        return cacheResponse.data;
    }

    private getQueryBuilder(
        method: iRestMethods,
    ): SelectQueryBuilder<G> | UpdateQueryBuilder<G> | DeleteQueryBuilder<G> | PostQueryBuilder<G> {
        switch (method) {
            case C6C.GET:
                return new SelectQueryBuilder(this.config, this.request);
            case C6C.PUT:
                return new UpdateQueryBuilder(this.config, this.request);
            case C6C.DELETE:
                return new DeleteQueryBuilder(this.config, this.request);
            case C6C.POST:
                return new PostQueryBuilder(this.config, this.request);
            default:
                throw new Error(`Unsupported query method: ${method}`);
        }
    }

    private buildSqlExecutionContext(
        method: iRestMethods,
        tableName: string,
        logContext: ReturnType<typeof getLogContext>,
    ): iRestSqlExecutionContext {
        const builder = this.getQueryBuilder(method);
        const queryResult = builder.build(tableName);

        logWithLevel(
            LogLevel.DEBUG,
            logContext,
            console.log,
            `[SQL EXECUTOR] 🧠 Generated ${method.toUpperCase()} SQL:`,
            queryResult,
        );

        const formatted = this.formatSQLWithParams(queryResult.sql, queryResult.params);
        logWithLevel(
            LogLevel.DEBUG,
            logContext,
            console.log,
            `[SQL EXECUTOR] 🧠 Formatted ${method.toUpperCase()} SQL:`,
            formatted,
        );

        const toUnnamed = namedPlaceholders();
        const [sql, values] = toUnnamed(queryResult.sql, queryResult.params);
        return { sql, values };
    }

    private createResponseFromQueryResult(
        method: iRestMethods,
        result: any,
        sqlExecution: iRestSqlExecutionContext,
        logContext: ReturnType<typeof getLogContext>,
    ): DetermineResponseDataType<G['RequestMethod'], G['RestTableInterface']> {
        if (method === C6C.GET) {
            return {
                rest: result.map(this.serialize),
                sql: { sql: sqlExecution.sql, values: sqlExecution.values },
            } as DetermineResponseDataType<G['RequestMethod'], G['RestTableInterface']>;
        }

        logWithLevel(
            LogLevel.DEBUG,
            logContext,
            console.log,
            `[SQL EXECUTOR] ✏️ Rows affected:`,
            result.affectedRows,
        );

        return {
            affected: result.affectedRows as number,
            insertId: result.insertId as number,
            rest: method === C6C.POST
                ? this.buildPostResponseRows(result.insertId as number | string | undefined)
                : [],
            sql: { sql: sqlExecution.sql, values: sqlExecution.values },
        } as DetermineResponseDataType<G['RequestMethod'], G['RestTableInterface']>;
    }

    private createLifecycleHookResponse(
        response: DetermineResponseDataType<G['RequestMethod'], G['RestTableInterface']>,
    ): iRestLifecycleResponse<G> {
        const data = Object.assign({ success: true }, response);
        return { data };
    }

    private createCacheResponseEnvelope(
        method: iRestMethods,
        tableName: string,
        data: DetermineResponseDataType<G['RequestMethod'], G['RestTableInterface']>,
    ): iCacheResponse<DetermineResponseDataType<G['RequestMethod'], G['RestTableInterface']>> {
        return {
            data,
            config: {
                method: method.toLowerCase(),
                url: `/rest/${tableName}`,
            },
        };
    }

    private async executeQueryWithLifecycle(
        conn: PoolConnection,
        method: iRestMethods,
        sqlExecution: iRestSqlExecutionContext,
        logContext: ReturnType<typeof getLogContext>,
        sqlMethod: string
    ): Promise<DetermineResponseDataType<G['RequestMethod'], G['RestTableInterface']>> {
        const useTransaction = method !== C6C.GET;
        let committed = false;

        try {
            if (useTransaction) {
                logWithLevel(
                    LogLevel.DEBUG,
                    logContext,
                    console.log,
                    `[SQL EXECUTOR] 🧾 Beginning transaction`,
                );
                await conn.beginTransaction();
            }

            let allowListStatus: SqlAllowListStatus = "not verified";
            try {
                allowListStatus = await this.validateSqlAllowList(sqlExecution.sql);
            } catch (error) {
                logSql({
                    method: sqlMethod,
                    sql: sqlExecution.sql,
                    context: logContext,
                    cacheStatus: this.request.cacheResults === false ? "ignored" : "miss",
                    allowListStatus: "denied",
                });
                throw error;
            }

            logSql({
                method: sqlMethod,
                sql: sqlExecution.sql,
                context: logContext,
                cacheStatus: this.request.cacheResults === false ? "ignored" : "miss",
                allowListStatus,
            });

            await this.runLifecycleHooks<"beforeExecution">(
                "beforeExecution",
                {
                    config: this.config,
                    request: this.request,
                    sqlExecution,
                },
            );
            const [result] = await conn.query<any>(sqlExecution.sql, sqlExecution.values);

            const response = this.createResponseFromQueryResult(
                method,
                result,
                sqlExecution,
                logContext,
            );
            const hookResponse = this.createLifecycleHookResponse(response);

            await this.runLifecycleHooks<"afterExecution">(
                "afterExecution",
                {
                    config: this.config,
                    request: this.request,
                    response: hookResponse,
                },
            );

            if (useTransaction) {
                await conn.commit();
                committed = true;
                logWithLevel(
                    LogLevel.DEBUG,
                    logContext,
                    console.log,
                    `[SQL EXECUTOR] 🧾 Transaction committed`,
                );
            }

            await this.runLifecycleHooks<"afterCommit">(
                "afterCommit",
                {
                    config: this.config,
                    request: this.request,
                    response: hookResponse,
                },
            );

            return response;
        } catch (err) {
            if (useTransaction && !committed) {
                try {
                    await conn.rollback();
                    logWithLevel(
                        LogLevel.WARN,
                        logContext,
                        console.warn,
                        `[SQL EXECUTOR] 🧾 Transaction rolled back`,
                    );
                } catch (rollbackErr) {
                    logWithLevel(
                        LogLevel.ERROR,
                        logContext,
                        console.error,
                        `[SQL EXECUTOR] Rollback failed`,
                        rollbackErr,
                    );
                }
            }
            throw err;
        }
    }

    private async validateSqlAllowList(sql: string): Promise<SqlAllowListStatus> {
        const allowListPath = this.config.sqlAllowListPath;
        if (!allowListPath) {
            return "not verified";
        }

        const allowList = await loadSqlAllowList(allowListPath);
        const normalized = normalizeSql(sql);
        if (!allowList.has(normalized)) {
            throw createSqlAllowListBlockedError({
                tableName:
                    typeof this.config.restModel?.TABLE_NAME === "string"
                        ? this.config.restModel.TABLE_NAME
                        : undefined,
                method:
                    typeof this.config.requestMethod === "string"
                        ? this.config.requestMethod
                        : undefined,
                normalizedSql: normalized,
                allowListPath,
            });
        }
        return "allowed";
    }


}
