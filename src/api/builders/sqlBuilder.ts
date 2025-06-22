import {C6Constants} from "api/C6Constants";
import isVerbose from "../../variables/isVerbose";
import {Executor} from "../executors/Executor";
import {iRestMethods} from "../types/ormInterfaces";

interface QueryResult {
    sql: string;
    params: any[];
}

export abstract class SqlBuilder<
    RequestMethod extends iRestMethods,
    RestShortTableName extends string = any,
    RestTableInterface extends Record<string, any> = any,
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
    /** Generate nested WHERE/JOIN conditions with parameter binding */
    protected buildBooleanJoinedConditions(
        set: any,
        andMode = true,
        params: any[] = []
    ): string {
        const booleanOperator = andMode ? 'AND' : 'OR';
        const OPERATORS = ['=', '!=', '<', '<=', '>', '>=', 'LIKE', 'NOT LIKE', 'IN', 'NOT IN', 'IS', 'IS NOT'];

        const isAggregateArray = (value: any) =>
            Array.isArray(value) && typeof value[0] === 'string' && OPERATORS.includes(value[0]);
        const isNumericKeyed = (obj: any) =>
            Array.isArray(obj) && Object.keys(obj).every(k => /^\d+$/.test(k));

        const addCondition = (column: string, op: string, value: any): string => {
            let clause: string;
            /*if (Buffer.isBuffer(value)) { // TODO - I want this as a parameterized option, for now default to faster
                params.push(value.toString('hex')); // Or use UNHEX(?) in SQL
                clause = `(${column} = UNHEX(?))`;
            } else {*/
                params.push(value);
                clause = `( ${column} ${op} ? )`;
            //}
            isVerbose() && console.log(`[WHERE] ➕ ${clause} ->`, value);
            return clause;
        };

        let sql: string;
        if (isNumericKeyed(set)) {
            isVerbose() && console.log(`[WHERE] Numeric keyed condition:`, set);
            switch (set.length) {
                case 2:
                    sql = addCondition(set[0], '=', set[1]);
                    break;
                case 3:
                    if (!OPERATORS.includes(set[1])) throw new Error(`Invalid operator: ${set[1]}`);
                    sql = addCondition(set[0], set[1], set[2]);
                    break;
                default:
                    throw new Error(`Invalid array condition: ${JSON.stringify(set)}`);
            }
        } else {
            const parts: string[] = [];
            for (const [key, value] of Object.entries(set)) {
                if (/^\d+$/.test(key)) {
                    parts.push(this.buildBooleanJoinedConditions(value, !andMode, params));
                } else if (!Array.isArray(value) || isAggregateArray(value)) {
                    parts.push(addCondition(key, '=', value));
                } else if (value.length === 2 && OPERATORS.includes(value[0])) {
                    parts.push(addCondition(key, value[0], value[1]));
                } else {
                    throw new Error(`Invalid condition for ${key}: ${JSON.stringify(value)}`);
                }
            }
            sql = parts.join(` ${booleanOperator} `);
        }

        isVerbose() && console.log(`[WHERE] Final: (${sql})`);
        return `(${sql})`;
    }

    /** Translate array or function calls into SQL expressions */
    protected buildAggregateField(field: string | any[]): string {
        if (typeof field === 'string') return field;
        if (!Array.isArray(field)) throw new Error('Invalid SELECT entry');

        let [fn, ...args] = field;
        let alias: string | undefined;
        if (args.length >= 2 && args[args.length - 2] === 'AS') {
            alias = String(args.pop());
            args.pop();
        }
        const F = String(fn).toUpperCase();
        const p = args.join(', ');

        isVerbose() && console.log(`[SELECT] ${F}(${p})${alias ? ` AS ${alias}` : ''}`);
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
            case 'ROUND':
            case 'CEIL':
            case 'FLOOR':
            case 'ABS':
            case 'SQRT':
                return `${F}(${p})${alias ? ` AS ${alias}` : ''}`;
            case 'ST_DISTANCE':
                return `ST_Distance(${p})${alias ? ` AS ${alias}` : ''}`;
            default:
                if (/^[A-Z_]+$/.test(F)) return `${F}(${p})${alias ? ` AS ${alias}` : ''}`;
                throw new Error(`Unsupported function: ${F}`);
        }
    }

    /** Compose a parameterized SELECT query with optional JOIN/WHERE/GROUP/HAVING/PAGINATION */
    protected buildSelectQuery<RestShortTableNames>(
        table: RestShortTableNames,
        primary: string | undefined,
        args: any,
        isSubSelect = false
    ): QueryResult {
        const model = this.config.C6.TABLES[table as string];
        const params: any[] = [];

        // SELECT
        const selectList = args?.[C6Constants.SELECT] ?? ['*'];
        const selectFields = Array.isArray(selectList)
            ? selectList.map(f => this.buildAggregateField(f)).join(', ')
            : '*';
        let sql = `SELECT ${selectFields} FROM ${table}`;
        isVerbose() && console.log(`[SELECT]`, selectFields);

        // JOIN
        if (args?.[C6Constants.JOIN]) {
            for (const jt in args[C6Constants.JOIN]) {
                const jk = jt.replace('_', ' ').toUpperCase();
                for (const jn in args[C6Constants.JOIN][jt]) {
                    const on = this.buildBooleanJoinedConditions(args[C6Constants.JOIN][jt][jn], true, params);
                    sql += ` ${jk} JOIN \`${jn}\` ON ${on}`;
                    isVerbose() && console.log(`[JOIN]`, jk, jn, on);
                }
            }
        }

        // WHERE
        if (args?.[C6Constants.WHERE]) {
            let wc = this.buildBooleanJoinedConditions(args[C6Constants.WHERE], true, params);
            // Trim leading and trailing parentheses if they fully wrap the condition
            while (wc.startsWith('(') && wc.endsWith(')')) {
                wc = wc.slice(1, -1).trim();
            }
            sql += ` WHERE ${wc}`;
        }

        // GROUP BY
        if (args?.[C6Constants.GROUP_BY]) {
            const gb = Array.isArray(args[C6Constants.GROUP_BY])
                ? args[C6Constants.GROUP_BY].join(', ')
                : args[C6Constants.GROUP_BY];
            sql += ` GROUP BY ${gb}`;
            isVerbose() && console.log(`[GROUP BY]`, gb);
        }

        // HAVING
        if (args?.[C6Constants.HAVING]) {
            const hc = this.buildBooleanJoinedConditions(args[C6Constants.HAVING], true, params);
            sql += ` HAVING ${hc}`;
        }

        // PAGINATION
        if (args?.[C6Constants.PAGINATION]) {
            const p = args[C6Constants.PAGINATION];
            if (p[C6Constants.ORDER]) {
                const ord = Object.entries(p[C6Constants.ORDER]).map(([c, d]) => `${c} ${String(d).toUpperCase()}`);
                sql += ` ORDER BY ${ord.join(', ')}`;
                isVerbose() && console.log(`[ORDER BY]`, ord);
            }
            if (p[C6Constants.LIMIT] != null) {
                const lim = parseInt(p[C6Constants.LIMIT], 10);
                const pg = parseInt(p[C6Constants.PAGE] ?? 1, 10);
                const off = (pg - 1) * lim;
                sql += ` LIMIT ${off}, ${lim}`;
                isVerbose() && console.log(`[LIMIT]`, off, lim);
            }
        }
        // Fallback ORDER/LIMIT
        else if (!isSubSelect) {
            let ok: string | undefined;
            if (primary) ok = primary;
            else if (model?.PRIMARY_SHORT?.[0]) ok = model.PRIMARY_SHORT[0];
            else for (const ts of ['created_at', 'updated_at']) {
                    if (model?.COLUMNS?.[`${table}.${ts}`]) {
                        ok = ts;
                        break;
                    }
                }
            if (ok) {
                const dir = primary ? 'ASC' : 'DESC';
                const lim = primary ? 1 : 100;
                sql += ` ORDER BY ${ok} ${dir} LIMIT ${lim}`;
                isVerbose() && console.log(`[ORDER]`, ok, dir, lim);
            } else {
                sql += ` LIMIT 100`;
                isVerbose() && console.warn(`[ORDER] fallback LIMIT 100`);
            }
        }

        isVerbose() && console.log(`[SQL]`, sql, params);
        return {sql, params};
    }
}
