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
import {checkCache, setCache} from "../utils/cacheManager";
import logSql, {
    SqlAllowListStatus,
} from "../utils/logSql";
import { normalizeSingularRequest } from "../utils/normalizeSingularRequest";
import {sortAndSerializeQueryObject} from "../utils/sortAndSerializeQueryObject";
import { loadSqlAllowList, normalizeSql } from "../utils/sqlAllowList";
import { getLogContext, LogLevel, logWithLevel } from "../utils/logLevel";

const SQL_ALLOWLIST_BLOCKED_CODE = "SQL_ALLOWLIST_BLOCKED";

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
                pkValues[pkShort] = value;
            }
        }

        if (primaryShorts.length > 0 && Object.keys(pkValues).length < primaryShorts.length) {
            return null;
        }

        return Object.keys(pkValues).length > 0 ? pkValues : null;
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

        const cacheRequestData = cacheResults
            ? JSON.parse(JSON.stringify(this.request ?? {}))
            : undefined;

        const requestArgumentsSerialized = cacheResults
            ? sortAndSerializeQueryObject(tableName, cacheRequestData ?? {})
            : undefined;

        if (cacheResults) {
            const cachedRequest = checkCache<DetermineResponseDataType<G['RequestMethod'], G['RestTableInterface']>>(
                method,
                tableName,
                cacheRequestData,
                logContext
            );
            if (cachedRequest) {
                return (await cachedRequest).data;
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

        const cacheRequest = queryPromise.then((data) =>
            this.createCacheResponseEnvelope(method, tableName, data),
        );

        setCache(method, tableName, cacheRequestData, {
            requestArgumentsSerialized,
            request: cacheRequest,
        });

        const cacheResponse = await cacheRequest;
        setCache(method, tableName, cacheRequestData, {
            requestArgumentsSerialized,
            request: cacheRequest,
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
            rest: [],
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
