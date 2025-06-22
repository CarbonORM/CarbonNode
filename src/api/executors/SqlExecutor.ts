import {
    apiReturn,
    DetermineResponseDataType,
    iPostC6RestResponse,
    iPutC6RestResponse,
    iDeleteC6RestResponse,
    iRestMethods
} from "@carbonorm/carbonnode";
import { PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { buildSelectQuery } from "../builders/sqlBuilder";
import { Executor } from "./Executor";

export class SqlExecutor<
    RequestMethod extends iRestMethods,
    RestShortTableName extends string = any,
    RestTableInterface extends Record<string, any> = any,
    PrimaryKey extends Extract<keyof RestTableInterface, string> = Extract<keyof RestTableInterface, string>,
    CustomAndRequiredFields extends Record<string, any> = any,
    RequestTableOverrides extends{ [key in keyof RestTableInterface]: any; } = { [key in keyof RestTableInterface]: any }
> extends Executor<
    RequestMethod,
    RestShortTableName,
    RestTableInterface,
    PrimaryKey,
    CustomAndRequiredFields,
    RequestTableOverrides
> {
    async execute(): Promise<apiReturn<DetermineResponseDataType<RequestMethod, RestTableInterface>>> {
        const { TABLE_NAME, PRIMARY } = this.config.restModel;

        switch (this.config.requestMethod) {
            case 'GET': {
                const rest = await this.select(TABLE_NAME, undefined, this.request);
                return { rest } as apiReturn<DetermineResponseDataType<RequestMethod, RestTableInterface>>;
            }
            case 'POST': {
                const result = await this.insert(TABLE_NAME, this.request);
                const created: iPostC6RestResponse = { rest: result, created: true };
                return created as apiReturn<DetermineResponseDataType<RequestMethod, RestTableInterface>>;
            }
            case 'PUT': {
                const result = await this.update(TABLE_NAME, PRIMARY, this.request);
                const updated: iPutC6RestResponse = { rest: result, updated: true, rowCount: (result as ResultSetHeader).affectedRows };
                return updated as apiReturn<DetermineResponseDataType<RequestMethod, RestTableInterface>>;
            }
            case 'DELETE': {
                const result = await this.delete(TABLE_NAME, PRIMARY, this.request);
                const deleted: iDeleteC6RestResponse = { rest: result, deleted: true, rowCount: (result as ResultSetHeader).affectedRows };
                return deleted as apiReturn<DetermineResponseDataType<RequestMethod, RestTableInterface>>;
            }
            default:
                throw new Error(`Unsupported request method: ${this.config.requestMethod}`);
        }
    }

    private async withConnection<T>(cb: (conn: PoolConnection) => Promise<T>): Promise<T> {
        const conn = await this.config.mysqlPool!.getConnection();
        try {
            return await cb(conn);
        } finally {
            conn.release();
        }
    }

    async select<TName extends string>(table: TName, primary: string | undefined, args: any) {
        const sql = buildSelectQuery<TName>(table, primary, args);
        return await this.withConnection(async (conn) => {
            console.log(sql);
            const [rows] = await conn.query<RowDataPacket[]>(sql);
            return rows;
        });
    }

    async insert<TName extends string>(table: TName, data: Record<string, any>) {
        const keys = Object.keys(data);
        const values = keys.map(k => data[k]);
        const placeholders = keys.map(() => '?').join(', ');
        const sql = `INSERT INTO \`${table}\` (${keys.join(', ')}) VALUES (${placeholders})`;
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
        return await this.withConnection(async (conn) => {
            const [result] = await conn.execute<ResultSetHeader>(sql, values);
            return result;
        });
    }

    async delete<TName extends string>(table: TName, primary: string[], args: Record<string, any>) {
        const key = primary?.[0];
        if (!key || !args?.[key]) throw new Error('Primary key and value required for delete');
        const sql = `DELETE FROM \`${table}\` WHERE \`${key}\` = ?`;
        return await this.withConnection(async (conn) => {
            const [result] = await conn.execute<ResultSetHeader>(sql, [args[key]]);
            return result;
        });
    }
}
