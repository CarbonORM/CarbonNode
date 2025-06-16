import {iC6Object} from "@carbonorm/carbonnode";
import { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import { Request, Response, NextFunction } from 'express';
// import { validatePayloadAgainstSchema } from './validator'; // C6 schema validator


export class CarbonSqlExecutor {

    constructor(private pool: Pool, private C6 : iC6Object ) {}

    private async withConnection<T>(cb: (conn: PoolConnection) => Promise<T>): Promise<T> {
        const conn = await this.pool.getConnection();
        try {
            return await cb(conn);
        } finally {
            conn.release();
        }
    }

    public async handle(req: Request, res: Response, next: NextFunction) {
        try {
            const method = req.method.toUpperCase();
            const table = req.params.table;
            const primary = req.params.primary;
            const payload = method === 'GET' ? req.query : req.body;

            if (!(table in this.C6.TABLES)){
                res.status(400).json({ error: `Invalid table: ${table}` });
                return;
            }

            let result: unknown;

            switch (method) {
                case 'GET':
                case 'OPTIONS':
                    result = await this.select(table, primary, payload);
                    break;
                case 'POST':
                    result = await this.insert(table, payload);
                    break;
                case 'PUT':
                    result = await this.update(table, primary, payload);
                    break;
                case 'DELETE':
                    result = await this.delete(table, primary, payload);
                    break;
                default:
                    throw new Error(`Unsupported method: ${method}`);
            }

            res.status(200).json({ success: true, result });
        } catch (err) {
            next(err);
        }
    }

    private buildBooleanJoinedConditions(set: any, andMode = true): string {
        const booleanOperator = andMode ? 'AND' : 'OR';
        let sql = '';

        const OPERATORS = ['=', '!=', '<', '<=', '>', '>=', 'LIKE', 'NOT LIKE', 'IN', 'NOT IN', 'IS', 'IS NOT'];

        const isAggregateArray = (value: any) => Array.isArray(value) && typeof value[0] === 'string' && OPERATORS.includes(value[0]);

        const isNumericKeyed = (obj: any) => Array.isArray(obj) && Object.keys(obj).every(k => /^\d+$/.test(k));

        // todo - we should be doing something with value no????
        const addCondition = (column: string, op: string, _value: any): string => {
            const paramName = column.replace(/\W+/g, '_');
            return `(${column} ${op} :${paramName})`;
        };

        if (isNumericKeyed(set)) {
            switch (set.length) {
                case 2:
                    sql += addCondition(set[0], '=', set[1]);
                    break;
                case 3:
                    if (!OPERATORS.includes(set[1])) {
                        throw new Error(`Invalid operator: ${set[1]}`);
                    }
                    sql += addCondition(set[0], set[1], set[2]);
                    break;
                default:
                    throw new Error(`Invalid array condition: ${JSON.stringify(set)}`);
            }
        } else {
            const parts: string[] = [];
            for (const [key, value] of Object.entries(set)) {
                if (/^\d+$/.test(key)) {
                    parts.push(this.buildBooleanJoinedConditions(value, !andMode));
                    continue;
                }

                if (!Array.isArray(value) || isAggregateArray(value)) {
                    parts.push(addCondition(key, '=', value));
                    continue;
                }

                if (value.length === 2 && OPERATORS.includes(value[0])) {
                    parts.push(addCondition(key, value[0], value[1]));
                } else if (value.length === 1 && isAggregateArray(value[0])) {
                    parts.push(addCondition(key, '=', value[0]));
                } else {
                    throw new Error(`Invalid condition for ${key}: ${JSON.stringify(value)}`);
                }
            }

            sql = parts.join(` ${booleanOperator} `);
        }

        return `(${sql})`;
    }

    private buildAggregateField(field: string | any[]): string {
        if (typeof field === 'string') return field;

        if (!Array.isArray(field)) throw new Error('Invalid SELECT entry: must be string or array');

        const [agg, ...args] = field;

        switch (agg) {
            case 'COUNT':
                return `COUNT(${args[0] || '*'})`;
            case 'SUM':
            case 'AVG':
            case 'MIN':
            case 'MAX':
                return `${agg}(${args[0]})${args[1] ? ` AS ${args[1]}` : ''}`;
            case 'DISTINCT':
                return `DISTINCT(${args[0]})${args[1] ? ` AS ${args[1]}` : ''}`;
            case 'GROUP_CONCAT': {
                const [col, alias, sortCol, sortType] = args;
                const order = sortCol ? ` ORDER BY ${sortCol} ${sortType || 'ASC'}` : '';
                return `GROUP_CONCAT(DISTINCT ${col}${order} SEPARATOR ',')${alias ? ` AS ${alias}` : ''}`;
            }
            case 'AS': {
                const [col, alias] = args;
                return `${col} AS ${alias}`;
            }
            case 'CONVERT_TZ': {
                const [ts, fromTz, toTz] = args;
                return `CONVERT_TZ(${ts}, ${fromTz}, ${toTz})`;
            }
            case 'NOW':
                return 'NOW()';
            default:
                throw new Error(`Unsupported aggregate: ${agg}`);
        }
    }

    private buildSelectQuery<RestShortTableNames>(table: RestShortTableNames, primary: string | undefined, args: any, isSubSelect = false): string {
        const selectList = args?.[this.C6.SELECT] ?? ['*'];
        const selectFields = Array.isArray(selectList)
            ? selectList.map(f => this.buildAggregateField(f)).join(', ')
            : '*';

        let sql = `SELECT ${selectFields} FROM \`${table}\``;

        if (args?.[this.C6.JOIN]) {
            const joins = args[this.C6.JOIN];
            for (const joinType in joins) {
                const joinKeyword = joinType.replace('_', ' ').toUpperCase();
                for (const joinTable in joins[joinType]) {
                    const onClause = this.buildBooleanJoinedConditions(joins[joinType][joinTable]);
                    sql += ` ${joinKeyword} JOIN \`${joinTable}\` ON ${onClause}`;
                }
            }
        }

        if (args?.[this.C6.WHERE]) {
            sql += ` WHERE ${this.buildBooleanJoinedConditions(args[this.C6.WHERE])}`;
        }

        if (args?.[this.C6.GROUP_BY]) {
            const groupByFields = Array.isArray(args[this.C6.GROUP_BY]) ? args[this.C6.GROUP_BY].join(', ') : args[this.C6.GROUP_BY];
            sql += ` GROUP BY ${groupByFields}`;
        }

        if (args?.[this.C6.HAVING]) {
            sql += ` HAVING ${this.buildBooleanJoinedConditions(args[this.C6.HAVING])}`;
        }

        if (args?.[this.C6.PAGINATION]) {
            const p = args[this.C6.PAGINATION];
            let limitClause = '';

            if (p[this.C6.ORDER]) {
                const orderArray = Object.entries(p[this.C6.ORDER]).map(([col, dir]) => {
                    if (!['ASC', 'DESC'].includes(String(dir).toUpperCase())) {
                        throw new Error(`Invalid order direction: ${dir}`);
                    }
                    return `${col} ${String(dir).toUpperCase()}`;
                });
                sql += ` ORDER BY ${orderArray.join(', ')}`;
            } else if (primary) {
                sql += ` ORDER BY ${primary} DESC`;
            } else {
                // todo this is wrong
                const primaryKey = this.C6.TABLES['users'].PRIMARY_SHORT?.[0] ?? 'user_id';
                sql += ` ORDER BY ${primaryKey} DESC`;
            }

            if (p[this.C6.LIMIT] != null) {
                const limit = parseInt(p[this.C6.LIMIT], 10);
                if (isNaN(limit) || limit < 0) {
                    throw new Error(`Invalid LIMIT: ${p[this.C6.LIMIT]}`);
                }

                const page = parseInt(p[this.C6.PAGE] ?? 1, 10);
                if (isNaN(page) || page < 1) {
                    throw new Error(`PAGE must be >= 1 (got ${p[this.C6.PAGE]})`);
                }

                const offset = (page - 1) * limit;
                limitClause += ` LIMIT ${offset}, ${limit}`;
            }

            sql += limitClause;
        } else if (!isSubSelect && primary) {
            sql += ` ORDER BY ${primary} ASC LIMIT 1`;
        } else if (!isSubSelect && !primary) {
            sql += ` ORDER BY id ASC LIMIT 100`; // fallback default limit
        }

        return sql;
    }

    async select<RestShortTableNames>(table: RestShortTableNames, primary: string | undefined, args: any) {
        const sql = this.buildSelectQuery<RestShortTableNames>(table, primary, args);
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

