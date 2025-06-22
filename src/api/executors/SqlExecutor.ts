import { SqlBuilder } from "api/builders/sqlBuilder";
import {
    apiReturn,
    DetermineResponseDataType,
    iPostC6RestResponse,
    iPutC6RestResponse,
    iDeleteC6RestResponse,
    iRestMethods
} from "../types/ormInterfaces";
import { PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';

export class SqlExecutor<
    RequestMethod extends iRestMethods,
    RestShortTableName extends string = any,
    RestTableInterface extends Record<string, any> = any,
    PrimaryKey extends Extract<keyof RestTableInterface, string> = Extract<keyof RestTableInterface, string>,
    CustomAndRequiredFields extends Record<string, any> = any,
    RequestTableOverrides extends { [key in keyof RestTableInterface]: any } = { [key in keyof RestTableInterface]: any }
> extends SqlBuilder<
    RequestMethod,
    RestShortTableName,
    RestTableInterface,
    PrimaryKey,
    CustomAndRequiredFields,
    RequestTableOverrides
> {

    async execute(): Promise<apiReturn<DetermineResponseDataType<RequestMethod, RestTableInterface>>> {
        const { TABLE_NAME } = this.config.restModel;
        const method = this.config.requestMethod;

        console.log(`[SQL EXECUTOR] ▶️ Executing ${method} on table "${TABLE_NAME}"`);
        console.log(`[SQL EXECUTOR] 🧾 Request payload:`, this.request);

        switch (method) {
            case 'GET': {
                const rest = await this.select(TABLE_NAME, undefined, this.request);
                console.log(`[SQL EXECUTOR] ✅ GET result:`, rest);
                return { rest } as apiReturn<DetermineResponseDataType<RequestMethod, RestTableInterface>>;
            }

            case 'POST': {
                const result = await this.insert(TABLE_NAME, this.request);
                console.log(`[SQL EXECUTOR] ✅ POST result:`, result);
                const created: iPostC6RestResponse = { rest: result, created: true };
                return created as apiReturn<DetermineResponseDataType<RequestMethod, RestTableInterface>>;
            }

            case 'PUT': {
                const result = await this.update(TABLE_NAME, [], this.request);
                console.log(`[SQL EXECUTOR] ✅ PUT result:`, result);
                const updated: iPutC6RestResponse = {
                    rest: result,
                    updated: true,
                    rowCount: (result as ResultSetHeader).affectedRows
                };
                return updated as apiReturn<DetermineResponseDataType<RequestMethod, RestTableInterface>>;
            }

            case 'DELETE': {
                const result = await this.delete(TABLE_NAME, [], this.request);
                console.log(`[SQL EXECUTOR] ✅ DELETE result:`, result);
                const deleted: iDeleteC6RestResponse = {
                    rest: result,
                    deleted: true,
                    rowCount: (result as ResultSetHeader).affectedRows
                };
                return deleted as apiReturn<DetermineResponseDataType<RequestMethod, RestTableInterface>>;
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

    async select<TName extends string>(table: TName, primary: string | undefined, args: any) {
        const sql = this.buildSelectQuery<TName>(table, primary, args);
        console.log(`[SQL EXECUTOR] 🧠 Generated SELECT SQL:`, sql);
        const formatted = this.formatSQLWithParams(sql.sql, sql.params);
        console.log(`[SQL EXECUTOR] 🧠 Formatted SELECT SQL:`, formatted);

        return await this.withConnection(async (conn) => {
            const [rows] = await conn.query<RowDataPacket[]>(sql.sql, sql.params);
            console.log(`[SQL EXECUTOR] 📦 Rows fetched:`, rows);
            return rows;
        });
    }

    async insert<TName extends string>(table: TName, data: Record<string, any>) {
        const keys = Object.keys(data);
        const values = keys.map(k => data[k]);
        const placeholders = keys.map(() => '?').join(', ');
        const sql = `INSERT INTO \`${table}\` (${keys.join(', ')}) VALUES (${placeholders})`;

        console.log(`[SQL EXECUTOR] 🧠 Generated INSERT SQL:`, sql);
        console.log(`[SQL EXECUTOR] 🔢 Values:`, values);

        return await this.withConnection(async (conn) => {
            const [result] = await conn.execute<ResultSetHeader>(sql, values);
            return result;
        });
    }

    async update<TName extends string>(table: TName, primary: string[], data: Record<string, any>) {
        if (!primary?.length) throw new Error('Primary key is required for update');
        const keys = Object.keys(data);
        const values = keys.map(k => data[k]);
        const updates = keys.map(k => `\`${k}\` = ?`).join(', ');
        const sql = `UPDATE \`${table}\` SET ${updates} WHERE \`${primary[0]}\` = ?`;
        values.push(data[primary[0]]);

        console.log(`[SQL EXECUTOR] 🧠 Generated UPDATE SQL:`, sql);
        console.log(`[SQL EXECUTOR] 🔢 Values:`, values);

        return await this.withConnection(async (conn) => {
            const [result] = await conn.execute<ResultSetHeader>(sql, values);
            return result;
        });
    }

    async delete<TName extends string>(table: TName, primary: string[], args: Record<string, any>) {
        const key = primary?.[0];
        if (!key || !args?.[key]) throw new Error('Primary key and value required for delete');
        const sql = `DELETE FROM \`${table}\` WHERE \`${key}\` = ?`;

        console.log(`[SQL EXECUTOR] 🧠 Generated DELETE SQL:`, sql);
        console.log(`[SQL EXECUTOR] 🔢 Value:`, args[key]);

        return await this.withConnection(async (conn) => {
            const [result] = await conn.execute<ResultSetHeader>(sql, [args[key]]);
            return result;
        });
    }


    public formatSQLWithParams(sql: string, params: any[]): string {
        let index = 0;

        return sql.replace(/\?/g, () => {
            if (index >= params.length) return '?'; // fallback if params are missing
            const val = params[index++];
            if (val === null || val === undefined) return 'NULL';
            if (Buffer.isBuffer(val)) return `UNHEX('${val.toString('hex')}')`;
            if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
            if (typeof val === 'number') return val.toString();
            if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
            return `'${JSON.stringify(val)}'`;
        });
    }

}
