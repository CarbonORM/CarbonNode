import {apiReturn} from "@carbonorm/carbonnode";
import { PoolConnection, RowDataPacket } from 'mysql2/promise';
import {buildSelectQuery} from "../builders/sqlBuilder";
import {Executor} from "./Executor";


export class SqlExecutor<CustomAndRequiredFields extends object, RestTableInterfaces extends object, RequestTableOverrides extends object, ResponseDataType, RestShortTableNames extends string>
    extends Executor<CustomAndRequiredFields, RestTableInterfaces, RequestTableOverrides, ResponseDataType, RestShortTableNames> {

    public execute():  Promise<apiReturn<ResponseDataType>> {
        switch (this.config.requestMethod) {
            case 'GET':
                return (this.select(
                    this.config.tableName as RestShortTableNames,
                    undefined,
                    this.request
                ) as Promise<any>).then(rows => ({rest: rows})) as any;
            case 'POST':
                return this.insert(this.config.tableName as RestShortTableNames, this.request) as any;
            case 'PUT':
                return this.update(this.config.tableName as RestShortTableNames, undefined, this.request) as any;
            case 'DELETE':
                return this.delete(this.config.tableName as RestShortTableNames, undefined, this.request) as any;
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

    async select<RestShortTableNames>(table: RestShortTableNames, primary: string | undefined, args: any) {
        const sql = buildSelectQuery<RestShortTableNames>(table, primary, args);
        return await this.withConnection(async (conn) => {
            console.log(sql)
            const [rows] = await conn.query<RowDataPacket[]>(sql);
            return rows;
        });
    }

    async insert<RestShortTableNames>(table: RestShortTableNames, data: any) {
        const keys = Object.keys(data);
        const values = keys.map(k => data[k]);
        const placeholders = keys.map(() => '?').join(', ');
        const sql = `INSERT INTO \`${table}\` (${keys.join(', ')}) VALUES (${placeholders})`;
        return await this.withConnection(async (conn) => {
            const [result] = await conn.execute(sql, values);
            return result;
        });
    }

    async update<RestShortTableNames>(table: RestShortTableNames, primary: string | undefined, data: any) {
        if (!primary) {
            throw new Error('Primary key is required for update');
        }

        const keys = Object.keys(data);
        const values = keys.map(k => data[k]);
        const updates = keys.map(k => `\`${k}\` = ?`).join(', ');
        const sql = `UPDATE \`${table}\` SET ${updates} WHERE \`${primary}\` = ?`;
        values.push(data[primary]);

        return await this.withConnection(async (conn) => {
            const [result] = await conn.execute(sql, values);
            return result;
        });
    }

    async delete<RestShortTableNames>(table: RestShortTableNames, primary: string | undefined, args: any) {
        if (!primary || !args?.[primary]) {
            throw new Error('Primary key and value required for delete');
        }

        const sql = `DELETE FROM \`${table}\` WHERE \`${primary}\` = ?`;
        return await this.withConnection(async (conn) => {
            const [result] = await conn.execute(sql, [args[primary]]);
            return result;
        });
    }

}





