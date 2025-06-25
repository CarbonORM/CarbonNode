import {SelectQueryBuilder} from "../orm/queries/SelectQueryBuilder";
import {OrmGenerics} from "../types/ormGenerics";
import {
    apiReturn,
    DetermineResponseDataType,
    iPostC6RestResponse,
    iPutC6RestResponse,
    iDeleteC6RestResponse
} from "../types/ormInterfaces";
import namedPlaceholders from 'named-placeholders';
import {PoolConnection, RowDataPacket, ResultSetHeader} from 'mysql2/promise';
import {Buffer} from 'buffer';
import {Executor} from "./Executor";

export class SqlExecutor<
    G extends OrmGenerics
> extends Executor<G>{

    async execute(): Promise<apiReturn<DetermineResponseDataType<G['RequestMethod'], G['RestTableInterface']>>> {
        const {TABLE_NAME} = this.config.restModel;
        const method = this.config.requestMethod;

        console.log(`[SQL EXECUTOR] ▶️ Executing ${method} on table "${TABLE_NAME}"`);
        console.log(`[SQL EXECUTOR] 🧾 Request payload:`, this.request);

        switch (method) {
            case 'GET': {
                const rest = await this.select(TABLE_NAME, undefined, this.request);
                console.log(`[SQL EXECUTOR] ✅ GET result:`, rest);
                return rest as apiReturn<DetermineResponseDataType<G['RequestMethod'], G['RestTableInterface']>>;
            }

            case 'POST': {
                const result = await this.insert(TABLE_NAME, this.request);
                console.log(`[SQL EXECUTOR] ✅ POST result:`, result);
                const created: iPostC6RestResponse = {rest: result, created: true};
                return created as apiReturn<DetermineResponseDataType<G['RequestMethod'], G['RestTableInterface']>>;
            }

            case 'PUT': {
                const result = await this.update(TABLE_NAME, [], this.request);
                console.log(`[SQL EXECUTOR] ✅ PUT result:`, result);
                const updated: iPutC6RestResponse = {
                    ...result,
                    updated: true,
                    rowCount: result.rest.affectedRows
                };
                return updated as apiReturn<DetermineResponseDataType<G['RequestMethod'], G['RestTableInterface']>>;
            }

            case 'DELETE': {
                const result = await this.delete(TABLE_NAME, [], this.request);
                console.log(`[SQL EXECUTOR] ✅ DELETE result:`, result);
                const deleted: iDeleteC6RestResponse = {
                    rest: result,
                    deleted: true,
                    rowCount: result.rest.affectedRows
                };
                return deleted as apiReturn<DetermineResponseDataType<G['RequestMethod'], G['RestTableInterface']>>;
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

    async select(table: G['RestShortTableName'], primary: string | undefined, args: any) {
        const QueryResult = (new SelectQueryBuilder(this.config, this.request)).build(table, args, primary);
        console.log(`[SQL EXECUTOR] 🧠 Generated SELECT SQL:`, QueryResult);
        const formatted = this.formatSQLWithParams(QueryResult.sql, QueryResult.params);
        console.log(`[SQL EXECUTOR] 🧠 Formatted SELECT SQL:`, formatted);
        const toUnnamed = namedPlaceholders();
        const [sql, values] = toUnnamed(QueryResult.sql, QueryResult.params);
        return await this.withConnection(async (conn) => {
            const [rows] = await conn.query<RowDataPacket[]>(sql, values);
            console.log(`[SQL EXECUTOR] 📦 Rows fetched:`, rows);
            return {
                rest: rows.map(this.serialize),
                sql: {
                    sql, values
                }
            };
        });
    }

    async insert(table: G['RestShortTableName'], data: Record<string, any>) {
        const keys = Object.keys(data);
        const values = keys.map(k => data[k]);
        const placeholders = keys.map(() => '?').join(', ');
        const sql = `INSERT INTO \`${table}\` (${keys.join(', ')})
                     VALUES (${placeholders})`;

        console.log(`[SQL EXECUTOR] 🧠 Generated INSERT SQL:`, sql);
        console.log(`[SQL EXECUTOR] 🔢 Values:`, values);

        return await this.withConnection(async (conn) => {
            const [result] = await conn.execute<ResultSetHeader>(sql, values);
            return {
                rest: result,
                sql: {
                    sql, placeholders
                }
            };
        });
    }

    async update(table: G['RestShortTableName'], primary: string[], data: Record<string, any>) {
        if (!primary?.length) throw new Error('Primary key is required for update');
        const keys = Object.keys(data);
        const values = keys.map(k => data[k]);
        const updates = keys.map(k => `\`${k}\` = ?`).join(', ');
        const sql = `UPDATE \`${table}\`
                     SET ${updates}
                     WHERE \`${primary[0]}\` = ?`;
        values.push(data[primary[0]]);

        console.log(`[SQL EXECUTOR] 🧠 Generated UPDATE SQL:`, sql);
        console.log(`[SQL EXECUTOR] 🔢 Values:`, values);

        return await this.withConnection(async (conn) => {
            const [result] = await conn.execute<ResultSetHeader>(sql, values);
            return {
                rest:result,
                sql: {
                    sql, values
                }
            };
        });
    }

    async delete(table: G['RestShortTableName'], primary: string[], args: Record<string, any>) {
        const key = primary?.[0];
        if (!key || !args?.[key]) throw new Error('Primary key and value required for delete');
        const sql = `DELETE
                     FROM \`${table}\`
                     WHERE \`${key}\` = ?`;

        console.log(`[SQL EXECUTOR] 🧠 Generated DELETE SQL:`, sql);
        console.log(`[SQL EXECUTOR] 🔢 Value:`, args[key]);

        return await this.withConnection(async (conn) => {
            const [result] = await conn.execute<ResultSetHeader>(sql, [args[key]]);
            return {
                rest: result,
                sql: {
                    sql, args
                }
            };
        });
    }

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


}
