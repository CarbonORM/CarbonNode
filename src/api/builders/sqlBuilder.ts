import { C6Constants } from "api/C6Constants";

export function buildBooleanJoinedConditions(set: any, andMode = true): string {
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
                parts.push(buildBooleanJoinedConditions(value, !andMode));
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

export function  buildAggregateField(field: string | any[]): string {
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

export function  buildSelectQuery<RestShortTableNames>(table: RestShortTableNames, primary: string | undefined, args: any, isSubSelect = false): string {
    const selectList = args?.[C6Constants.SELECT] ?? ['*'];
    const selectFields = Array.isArray(selectList)
        ? selectList.map(f => buildAggregateField(f)).join(', ')
        : '*';

    let sql = `SELECT ${selectFields} FROM \`${table}\``;

    if (args?.[C6Constants.JOIN]) {
        const joins = args[C6Constants.JOIN];
        for (const joinType in joins) {
            const joinKeyword = joinType.replace('_', ' ').toUpperCase();
            for (const joinTable in joins[joinType]) {
                const onClause = buildBooleanJoinedConditions(joins[joinType][joinTable]);
                sql += ` ${joinKeyword} JOIN \`${joinTable}\` ON ${onClause}`;
            }
        }
    }

    if (args?.[C6Constants.WHERE]) {
        sql += ` WHERE ${buildBooleanJoinedConditions(args[C6Constants.WHERE])}`;
    }

    if (args?.[C6Constants.GROUP_BY]) {
        const groupByFields = Array.isArray(args[C6Constants.GROUP_BY]) ? args[C6Constants.GROUP_BY].join(', ') : args[C6Constants.GROUP_BY];
        sql += ` GROUP BY ${groupByFields}`;
    }

    if (args?.[C6Constants.HAVING]) {
        sql += ` HAVING ${buildBooleanJoinedConditions(args[C6Constants.HAVING])}`;
    }

    if (args?.[C6Constants.PAGINATION]) {
        const p = args[C6Constants.PAGINATION];
        let limitClause = '';

        if (p[C6Constants.ORDER]) {
            const orderArray = Object.entries(p[C6Constants.ORDER]).map(([col, dir]) => {
                if (!['ASC', 'DESC'].includes(String(dir).toUpperCase())) {
                    throw new Error(`Invalid order direction: ${dir}`);
                }
                return `${col} ${String(dir).toUpperCase()}`;
            });
            sql += ` ORDER BY ${orderArray.join(', ')}`;
        } else if (primary) {
            sql += ` ORDER BY ${primary} DESC`;
        } /*else {
            // todo - this is wrong
            const primaryKey = C6Constants.TABLES['users'].PRIMARY_SHORT?.[0] ?? 'user_id';
            sql += ` ORDER BY ${primaryKey} DESC`;
        }*/

        if (p[C6Constants.LIMIT] != null) {
            const limit = parseInt(p[C6Constants.LIMIT], 10);
            if (isNaN(limit) || limit < 0) {
                throw new Error(`Invalid LIMIT: ${p[C6Constants.LIMIT]}`);
            }

            const page = parseInt(p[C6Constants.PAGE] ?? 1, 10);
            if (isNaN(page) || page < 1) {
                throw new Error(`PAGE must be >= 1 (got ${p[C6Constants.PAGE]})`);
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
