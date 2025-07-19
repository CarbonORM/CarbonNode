import {DeleteQueryBuilder} from "../orm/queries/DeleteQueryBuilder";
import {PostQueryBuilder} from "../orm/queries/PostQueryBuilder";
import {SelectQueryBuilder} from "../orm/queries/SelectQueryBuilder";
import {UpdateQueryBuilder} from "../orm/queries/UpdateQueryBuilder";
import {OrmGenerics} from "../types/ormGenerics";
import {
    DetermineResponseDataType,
    iPostC6RestResponse,
    iPutC6RestResponse,
    iDeleteC6RestResponse
} from "../types/ormInterfaces";
import namedPlaceholders from 'named-placeholders';
import {PoolConnection} from 'mysql2/promise';
import {Buffer} from 'buffer';
import {Executor} from "./Executor";

export class SqlExecutor<
    G extends OrmGenerics
> extends Executor<G> {

    async execute(): Promise<DetermineResponseDataType<G['RequestMethod'], G['RestTableInterface']>> {
        const {TABLE_NAME} = this.config.restModel;
        const method = this.config.requestMethod;

        console.log(`[SQL EXECUTOR] ▶️ Executing ${method} on table "${TABLE_NAME}"`);
        console.log(`[SQL EXECUTOR] 🧾 Request payload:`, this.request);

        switch (method) {
            case 'GET': {
                const rest = await this.runQuery();
                console.log(`[SQL EXECUTOR] ✅ GET result:`, rest);
                return rest as DetermineResponseDataType<G['RequestMethod'], G['RestTableInterface']>;
            }

            case 'POST': {
                const result = await this.runQuery();
                console.log(`[SQL EXECUTOR] ✅ POST result:`, result);
                const created: iPostC6RestResponse = {rest: result, created: true};
                return created as DetermineResponseDataType<G['RequestMethod'], G['RestTableInterface']>;
            }

            case 'PUT': {
                const result = await this.runQuery();
                const updated: iPutC6RestResponse = {
                    ...result,
                    updated: true,
                    rowCount: result.rest.affectedRows
                };
                return updated as DetermineResponseDataType<G['RequestMethod'], G['RestTableInterface']>;
            }

            case 'DELETE': {
                const result = await this.runQuery();
                console.log(`[SQL EXECUTOR] ✅ DELETE result:`, result);
                const deleted: iDeleteC6RestResponse = {
                    rest: result,
                    deleted: true,
                    rowCount: result.rest.affectedRows
                };
                return deleted as DetermineResponseDataType<G['RequestMethod'], G['RestTableInterface']>;
            }

            default:
                throw new Error(`Unsupported request method: ${method}`);
        }
    }

    private async withConnection<T>(cb: (conn: PoolConnection) => Promise<T>): Promise<T> {
        console.log(`[SQL EXECUTOR] 📡 Getting DB connection`);
        const conn = await this.config.mysqlPool!.getConnection();
        try {
            console.log(`[SQL EXECUTOR] ✅ Connection acquired`);
            return await cb(conn);
        } finally {
            console.log(`[SQL EXECUTOR] 🔌 Releasing DB connection`);
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

    async runQuery() {
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

        console.log(`[SQL EXECUTOR] 🧠 Generated ${method.toUpperCase()} SQL:`, QueryResult);

        const formatted = this.formatSQLWithParams(QueryResult.sql, QueryResult.params);
        console.log(`[SQL EXECUTOR] 🧠 Formatted ${method.toUpperCase()} SQL:`, formatted);

        const toUnnamed = namedPlaceholders();
        const [sql, values] = toUnnamed(QueryResult.sql, QueryResult.params);

        return await this.withConnection(async (conn) => {
            const [result] = await conn.query<any>(sql, values);

            if (method === 'GET') {
                console.log(`[SQL EXECUTOR] 📦 Rows fetched:`, result);
                return {
                    rest: result.map(this.serialize),
                    sql: {sql, values}
                };
            } else {
                console.log(`[SQL EXECUTOR] ✏️ Rows affected:`, result.affectedRows);
                return {
                    affected: result.affectedRows,
                    rest: [],
                    sql: {sql, values}
                };
            }
        });
    }


}
