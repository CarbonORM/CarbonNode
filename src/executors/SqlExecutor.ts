import {DeleteQueryBuilder} from "../orm/queries/DeleteQueryBuilder";
import {PostQueryBuilder} from "../orm/queries/PostQueryBuilder";
import {SelectQueryBuilder} from "../orm/queries/SelectQueryBuilder";
import {UpdateQueryBuilder} from "../orm/queries/UpdateQueryBuilder";
import {OrmGenerics} from "../types/ormGenerics";
import {C6Constants as C6C} from "../constants/C6Constants";
import {
    DetermineResponseDataType,
    iRestWebsocketPayload,
} from "../types/ormInterfaces";
import namedPlaceholders from 'named-placeholders';
import type {PoolConnection} from 'mysql2/promise';
import {Buffer} from 'buffer';
import {Executor} from "./Executor";
import { normalizeSingularRequest } from "../utils/normalizeSingularRequest";
import {loadSqlAllowList, normalizeSql} from "../utils/sqlAllowList";

export class SqlExecutor<
    G extends OrmGenerics
> extends Executor<G> {

    async execute(): Promise<DetermineResponseDataType<G['RequestMethod'], G['RestTableInterface']>> {
        const {TABLE_NAME} = this.config.restModel;
        const method = this.config.requestMethod;

        // Normalize singular T-shaped requests into complex ORM shape (GET/PUT/DELETE)
        try {
            this.request = normalizeSingularRequest(
                method as any,
                this.request as any,
                this.config.restModel as any,
                undefined
            ) as typeof this.request;
        } catch (e) {
            // Surface normalization errors early
            throw e;
        }

        this.config.verbose && console.log(`[SQL EXECUTOR] ▶️ Executing ${method} on table "${TABLE_NAME}"`);
        this.config.verbose && console.log(`[SQL EXECUTOR] 🧩 Request:`, this.request);

        switch (method) {
            case 'GET': {
                const rest = await this.runQuery();
                return rest as DetermineResponseDataType<G['RequestMethod'], G['RestTableInterface']>;
            }

            case 'POST': {
                const result = await this.runQuery();
                await this.broadcastWebsocketIfConfigured(result);
                return result as DetermineResponseDataType<G['RequestMethod'], G['RestTableInterface']>;
            }

            case 'PUT': {
                const result = await this.runQuery();
                await this.broadcastWebsocketIfConfigured(result);
                return result as DetermineResponseDataType<G['RequestMethod'], G['RestTableInterface']>;
            }

            case 'DELETE': {
                const result = await this.runQuery();
                await this.broadcastWebsocketIfConfigured(result);
                return result as DetermineResponseDataType<G['RequestMethod'], G['RestTableInterface']>;
            }

            default:
                throw new Error(`Unsupported request method: ${method}`);
        }
    }

    private async withConnection<T>(cb: (conn: PoolConnection) => Promise<T>): Promise<T> {
        this.config.verbose && console.log(`[SQL EXECUTOR] 📡 Getting DB connection`);
        const conn = await this.config.mysqlPool!.getConnection();
        try {
            this.config.verbose && console.log(`[SQL EXECUTOR] ✅ Connection acquired`);
            return await cb(conn);
        } finally {
            this.config.verbose && console.log(`[SQL EXECUTOR] 🔌 Releasing DB connection`);
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
        const primaryFulls = (this.config.restModel as any).PRIMARY ?? [];
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
                pkValues[pk] = (row as any)[pk];
                continue;
            }

            const fullKey = Object.keys(columns).find(
                (key) => columns[key] === pk,
            );

            if (fullKey && fullKey in row) {
                pkValues[pk] = (row as any)[fullKey];
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
        this.config.verbose && console.log("[SQL EXECUTOR] 📣 broadcastWebsocketIfConfigured start", {
            method: this.config.requestMethod,
            hasBroadcast: Boolean(broadcast),
        });
        if (!broadcast || this.config.requestMethod === C6C.GET) {
            this.config.verbose && console.log("[SQL EXECUTOR] 📣 websocket broadcast skipped", {
                reason: !broadcast ? "no broadcast configured" : "GET request",
            });
            return;
        }

        const normalizedRequest = this.normalizeRequestPayload(this.extractRequestBody());
        const pkShorts = this.config.restModel.PRIMARY_SHORT ?? [];
        const columns = this.config.restModel.COLUMNS as Record<string, string>;
        const validColumns = new Set(Object.values(columns));
        let responseRest = response?.rest;
        let responsePrimaryKey = this.extractPrimaryKeyValuesFromData(responseRest);

        this.config.verbose && console.log("[SQL EXECUTOR] 📣 websocket request payload", {
            normalizedRequest,
            requestPrimaryKey: this.extractPrimaryKeyValues(),
            pkShorts,
        });
        this.config.verbose && console.log("[SQL EXECUTOR] 📣 websocket response payload", {
            responseRest,
            responsePrimaryKey,
        });

        if (
            (responseRest === null || (Array.isArray(responseRest) && responseRest.length === 0))
            && this.config.requestMethod === C6C.POST
        ) {
            this.config.verbose && console.log("[SQL EXECUTOR] 📣 response rest empty, attempting synthesize", {
                responseRest,
            });
            const insertId = (response as DetermineResponseDataType<G['RequestMethod'], G['RestTableInterface']> & { insertId?: number | string | null })?.insertId;
            this.config.verbose && console.log("[SQL EXECUTOR] 📣 POST insertId lookup", {
                insertId,
            });
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
                this.config.verbose && console.log("[SQL EXECUTOR] 📣 synthesized response payload", {
                    synthesized,
                    responsePrimaryKey,
                });
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

        this.config.verbose && console.log("[SQL EXECUTOR] 📣 websocket payload ready", payload);

        try {
            this.config.verbose && console.log("[SQL EXECUTOR] 📣 websocket broadcast dispatch start");
            await broadcast(payload);
            this.config.verbose && console.log("[SQL EXECUTOR] 📣 websocket broadcast dispatch complete");
        } catch (error) {
            if (this.config.verbose) {
                console.error("[SQL EXECUTOR] websocketBroadcast failed", error);
            }
        }
    }
    async runQuery(): Promise<DetermineResponseDataType<G['RequestMethod'], G['RestTableInterface']>> {
        const {TABLE_NAME} = this.config.restModel;
        const method = this.config.requestMethod;
        let builder: SelectQueryBuilder<G> | UpdateQueryBuilder<G> | DeleteQueryBuilder<G> | PostQueryBuilder<G>;

        switch (method) {
            case 'GET':
                builder = new SelectQueryBuilder(this.config, this.request);
                break;
            case 'PUT':
                builder = new UpdateQueryBuilder(this.config, this.request);
                break;
            case 'DELETE':
                builder = new DeleteQueryBuilder(this.config, this.request);
                break;
            case 'POST':
                builder = new PostQueryBuilder(this.config, this.request);
                break;
            default:
                throw new Error(`Unsupported query method: ${method}`);
        }

        const QueryResult = builder.build(TABLE_NAME);

        this.config.verbose && console.log(`[SQL EXECUTOR] 🧠 Generated ${method.toUpperCase()} SQL:`, QueryResult);

        const formatted = this.formatSQLWithParams(QueryResult.sql, QueryResult.params);
        this.config.verbose && console.log(`[SQL EXECUTOR] 🧠 Formatted ${method.toUpperCase()} SQL:`, formatted);

        const toUnnamed = namedPlaceholders();
        const [sql, values] = toUnnamed(QueryResult.sql, QueryResult.params);

        await this.validateSqlAllowList(sql);

        return await this.withConnection(async (conn) => {
            const [result] = await conn.query<any>(sql, values);

            if (method === 'GET') {
                return {
                    rest: result.map(this.serialize),
                    sql: {sql, values}
                } as DetermineResponseDataType<G['RequestMethod'], G['RestTableInterface']>;
            } else {
                this.config.verbose &&  console.log(`[SQL EXECUTOR] ✏️ Rows affected:`, result.affectedRows);
                return {
                    affected: result.affectedRows as number,
                    insertId: result.insertId as number,
                    rest: [], // TODO - remove rest empty array from non-GET responses?
                    sql: {sql, values}
                } as DetermineResponseDataType<G['RequestMethod'], G['RestTableInterface']>;
            }
        });
    }

    private async validateSqlAllowList(sql: string): Promise<void> {
        const allowListPath = this.config.sqlAllowListPath;
        if (!allowListPath) {
            return;
        }

        const allowList = await loadSqlAllowList(allowListPath);
        const normalized = normalizeSql(sql);
        if (!allowList.has(normalized)) {
            throw new Error(`SQL statement is not permitted by allowlist (${allowListPath}).`);
        }
    }


}
