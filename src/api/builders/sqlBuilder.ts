import { C6Constants } from "api/C6Constants";
import isVerbose from "../../variables/isVerbose";
import {Executor} from "../executors/Executor";
import {iRestMethods} from "../types/ormInterfaces";


export abstract class SqlBuilder<
    RequestMethod extends iRestMethods,
    RestShortTableName extends string = any,
    RestTableInterface extends { [key: string]: any } = any,
    PrimaryKey extends Extract<keyof RestTableInterface, string> = Extract<keyof RestTableInterface, string>,
    CustomAndRequiredFields extends { [key: string]: any } = any,
    RequestTableOverrides extends { [key in keyof RestTableInterface]: any } = { [key in keyof RestTableInterface]: any }
> extends Executor<
    RequestMethod,
    RestShortTableName,
    RestTableInterface,
    PrimaryKey,
    CustomAndRequiredFields,
    RequestTableOverrides
> {

    buildBooleanJoinedConditions(set: any, andMode = true): string {
        const booleanOperator = andMode ? 'AND' : 'OR';
        let sql = '';

        const OPERATORS = ['=', '!=', '<', '<=', '>', '>=', 'LIKE', 'NOT LIKE', 'IN', 'NOT IN', 'IS', 'IS NOT'];

        const isAggregateArray = (value: any) =>
            Array.isArray(value) && typeof value[0] === 'string' && OPERATORS.includes(value[0]);

        const isNumericKeyed = (obj: any) =>
            Array.isArray(obj) && Object.keys(obj).every(k => /^\d+$/.test(k));

        const addCondition = (column: string, op: string, _value: any): string => {
            const paramName = column.replace(/\W+/g, '_');
            const clause = `(${column} ${op} :${paramName})`;
            isVerbose() && console.log(`[WHERE] ➕ Condition added: ${clause}`);
            return clause;
        };

        if (isNumericKeyed(set)) {
            isVerbose() && console.log(`[WHERE] 🔢 Numeric keyed condition:`, set);
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
                    isVerbose() && console.log(`[WHERE] 🔁 Logical group [${booleanOperator}]`, value);
                    parts.push(this.buildBooleanJoinedConditions(value, !andMode));
                    continue;
                }

                if (!Array.isArray(value) || isAggregateArray(value)) {
                    parts.push(addCondition(key, '=', value));
                } else if (value.length === 2 && OPERATORS.includes(value[0])) {
                    parts.push(addCondition(key, value[0], value[1]));
                } else if (value.length === 1 && isAggregateArray(value[0])) {
                    parts.push(addCondition(key, '=', value[0]));
                } else {
                    throw new Error(`Invalid condition for ${key}: ${JSON.stringify(value)}`);
                }
            }
            sql = parts.join(` ${booleanOperator} `);
        }

        isVerbose() && console.log(`[WHERE] Final condition string: (${sql})`);
        return `(${sql})`;
    }


    buildAggregateField(field: string | any[]): string {
        if (typeof field === 'string') return field;
        if (!Array.isArray(field)) throw new Error('Invalid SELECT entry: must be string or array');

        let [fn, ...args] = field;
        let alias: string | undefined;
        if (args.length >= 2 && args[args.length - 2] === 'AS') {
            alias = String(args.pop());
            args.pop();
        }

        const F = String(fn).toUpperCase();
        const p = args.join(', ');

        isVerbose() && console.log(`[SELECT] Function ${F}(${p})${alias ? ` AS ${alias}` : ''}`);

        switch (F) {
            case 'DATE_ADD':
                return `DATE_ADD(${args[0]}, ${args[1]})${alias ? ` AS ${alias}` : ''}`;
            case 'DATE_SUB':
                return `DATE_SUB(${args[0]}, ${args[1]})${alias ? ` AS ${alias}` : ''}`;
            case 'YEAR':
                return `YEAR(${args[0]})${alias ? ` AS ${alias}` : ''}`;
            case 'MONTH':
                return `MONTH(${args[0]})${alias ? ` AS ${alias}` : ''}`;
            case 'DAY':
                return `DAY(${args[0]})${alias ? ` AS ${alias}` : ''}`;
            case 'DATE_FORMAT':
                return `DATE_FORMAT(${args[0]}, ${args[1]})${alias ? ` AS ${alias}` : ''}`;
            case 'CURRENT_DATE':
                return `CURRENT_DATE()${alias ? ` AS ${alias}` : ''}`;
            case 'CURRENT_TIMESTAMP':
                return `CURRENT_TIMESTAMP()${alias ? ` AS ${alias}` : ''}`;

            case 'ROUND':
            case 'CEIL':
            case 'CEILING':
                return `${F}(${args[0]}${args[1] ? `, ${args[1]}` : ''})${alias ? ` AS ${alias}` : ''}`;
            case 'FLOOR':
            case 'ABS':
            case 'SQRT':
            case 'EXP':
            case 'LOG':
                return `${F}(${p})${alias ? ` AS ${alias}` : ''}`;

            case 'ST_DISTANCE':
                return `ST_Distance(${p})${alias ? ` AS ${alias}` : ''}`;
            case 'ST_AREA':
                return `ST_Area(${p})${alias ? ` AS ${alias}` : ''}`;
            case 'ST_ASTEXT':
                return `ST_AsText(${p})${alias ? ` AS ${alias}` : ''}`;
            case 'ST_GEOMFROMTEXT':
                return `ST_GeomFromText(${args[0]})${alias ? ` AS ${alias}` : ''}`;
            case 'ST_WITHIN':
                return `ST_Within(${p})${alias ? ` AS ${alias}` : ''}`;

            default:
                if (/^[A-Z_]+$/.test(F)) {
                    return `${F}(${p})${alias ? ` AS ${alias}` : ''}`;
                }
                throw new Error(`Unsupported aggregate/function: ${F}`);
        }
    }


    buildSelectQuery<RestShortTableNames>(
        table: RestShortTableNames,
        primary: string | undefined,
        args: any,
        isSubSelect = false
    ): string {
        const model = this.config.C6.TABLES[table as string];
        const selectList = args?.[C6Constants.SELECT] ?? ['*'];
        const selectFields = Array.isArray(selectList)
            ? selectList.map(f => this.buildAggregateField(f)).join(', ')
            : '*';

        isVerbose() && console.log(`[SELECT] Fields:`, selectList);
        let sql = `SELECT ${selectFields}
                   FROM \`${table}\``;

        if (args?.[C6Constants.JOIN]) {
            for (const joinType in args[C6Constants.JOIN]) {
                const joinKeyword = joinType.replace('_', ' ').toUpperCase();
                for (const joinTable in args[C6Constants.JOIN][joinType]) {
                    const onClause = this.buildBooleanJoinedConditions(args[C6Constants.JOIN][joinType][joinTable]);
                    sql += ` ${joinKeyword} JOIN \`${joinTable}\` ON ${onClause}`;
                    isVerbose() && console.log(`[JOIN] ${joinKeyword} JOIN ${joinTable} ON ${onClause}`);
                }
            }
        }

        if (args?.[C6Constants.WHERE]) {
            const whereClause = this.buildBooleanJoinedConditions(args[C6Constants.WHERE]);
            sql += ` WHERE ${whereClause}`;
        }

        if (args?.[C6Constants.GROUP_BY]) {
            const gb = Array.isArray(args[C6Constants.GROUP_BY])
                ? args[C6Constants.GROUP_BY].join(', ')
                : args[C6Constants.GROUP_BY];
            sql += ` GROUP BY ${gb}`;
            isVerbose() && console.log(`[GROUP BY]`, gb);
        }

        if (args?.[C6Constants.HAVING]) {
            const havingClause = this.buildBooleanJoinedConditions(args[C6Constants.HAVING]);
            sql += ` HAVING ${havingClause}`;
        }

        if (args?.[C6Constants.PAGINATION]) {
            const p = args[C6Constants.PAGINATION];

            if (p[C6Constants.ORDER]) {
                const orderArr = Object.entries(p[C6Constants.ORDER]).map(([col, dir]) => {
                    const d = String(dir).toUpperCase();
                    if (!['ASC', 'DESC'].includes(d)) throw new Error(`Invalid order direction: ${dir}`);
                    return `${col} ${d}`;
                });
                sql += ` ORDER BY ${orderArr.join(', ')}`;
                isVerbose() && console.log(`[ORDER BY]`, orderArr);
            }

            if (p[C6Constants.LIMIT] != null) {
                const limit = parseInt(p[C6Constants.LIMIT], 10);
                const page = parseInt(p[C6Constants.PAGE] ?? 1, 10);
                if (isNaN(limit) || limit < 0) throw new Error(`Invalid LIMIT: ${p[C6Constants.LIMIT]}`);
                if (isNaN(page) || page < 1) throw new Error(`PAGE must be >= 1 (got ${p[C6Constants.PAGE]})`);
                const offset = (page - 1) * limit;
                sql += ` LIMIT ${offset}, ${limit}`;
                isVerbose() && console.log(`[LIMIT] page=${page}, limit=${limit}, offset=${offset}`);
            }
        } else if (!isSubSelect) {
            let orderKey: string | undefined;

            if (primary) {
                orderKey = primary;
                isVerbose() && console.log(`[ORDER] Using explicit primary param: ${orderKey}`);
            } else if (model?.PRIMARY_SHORT?.[0]) {
                orderKey = model.PRIMARY_SHORT[0];
                isVerbose() && console.log(`[ORDER] Using model primary: ${orderKey}`);
            } else {
                for (const ts of ['created_at', 'updated_at', 'timestamp']) {
                    if (model?.COLUMNS?.[`${table}.${ts}`]) {
                        orderKey = ts;
                        isVerbose() && console.log(`[ORDER] Using timestamp fallback: ${orderKey}`);
                        break;
                    }
                }
            }

            if (orderKey) {
                const dir = primary || model?.PRIMARY_SHORT?.length ? 'ASC' : 'DESC';
                const lim = primary ? 1 : 100;
                sql += ` ORDER BY ${orderKey} ${dir} LIMIT ${lim}`;
                isVerbose() && console.log(`[ORDER] ORDER BY ${orderKey} ${dir} LIMIT ${lim}`);
            } else {
                sql += ` LIMIT 100`;
                isVerbose() && console.warn(`[ORDER] No order key found; applied default LIMIT 100`);
            }
        }

        isVerbose() && console.log(`[SQL QUERY FINAL]`, sql);
        return sql;
    }

}
