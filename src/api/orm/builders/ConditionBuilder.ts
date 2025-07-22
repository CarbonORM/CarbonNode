import {C6C} from "api/C6Constants";
import {OrmGenerics} from "../../types/ormGenerics";
import {DetermineResponseDataType} from "../../types/ormInterfaces";
import {convertHexIfBinary, SqlBuilderResult} from "../utils/sqlUtils";
import {AggregateBuilder} from "./AggregateBuilder";

export abstract class ConditionBuilder<
    G extends OrmGenerics
> extends AggregateBuilder<G> {

    protected aliasMappings: Record<string, string> = {};

    abstract build(table: string): SqlBuilderResult;

    execute(): Promise<DetermineResponseDataType<G['RequestMethod'], G['RestTableInterface']>> {
        throw new Error("Method not implemented.");
    }

    private readonly OPERATORS = new Set([
        C6C.EQUAL, C6C.NOT_EQUAL, C6C.LESS_THAN, C6C.LESS_THAN_OR_EQUAL_TO,
        C6C.GREATER_THAN, C6C.GREATER_THAN_OR_EQUAL_TO,
        C6C.LIKE, C6C.NOT_LIKE,
        C6C.IN, C6C.NOT_IN, 'NOT IN',
        C6C.IS, C6C.IS_NOT,
        C6C.BETWEEN, 'NOT BETWEEN',
        C6C.MATCH_AGAINST,
        C6C.ST_DISTANCE_SPHERE
    ]);

    private isTableReference(val: any): boolean {
        if (typeof val !== 'string' || !val.includes('.')) return false;
        const [prefix, column] = val.split('.');
        const tableName = this.aliasMappings[prefix] ?? prefix;
        return (
            typeof this.config.C6?.TABLES[tableName] === 'object' &&
            val in this.config.C6.TABLES[tableName].COLUMNS &&
            this.config.C6.TABLES[tableName].COLUMNS[val] === column
        );
    }

    private validateOperator(op: string) {
        if (!this.OPERATORS.has(op)) {
            throw new Error(`Invalid or unsupported SQL operator detected: '${op}'`);
        }
    }

    public addParam(
        params: any[] | Record<string, any>,
        column: string,
        value: any
    ): string {
        const columnDef = this.config.C6[column.split('.')[0]]?.TYPE_VALIDATION?.[column];
        const val = convertHexIfBinary(column, value, columnDef);

        if (this.useNamedParams) {
            const key = `param${Object.keys(params).length}`;
            (params as Record<string, any>)[key] = val;
            return `:${key}`;
        } else {
            (params as any[]).push(val);
            return '?';
        }
    }

    buildBooleanJoinedConditions(
        set: any,
        andMode: boolean = true,
        params: any[] | Record<string, any> = []
    ): string {
        const booleanOperator = andMode ? 'AND' : 'OR';

        const addCondition = (column: any, op: any, value: any): string => {
            // Support function-based expressions like [C6C.ST_DISTANCE_SPHERE, col1, col2]
            if (
                typeof column === 'string' &&
                this.OPERATORS.has(column) &&
                Array.isArray(op)
            ) {
                if (column === C6C.ST_DISTANCE_SPHERE) {
                    const [col1, col2] = op;
                    const threshold = Array.isArray(value) ? value[0] : value;
                    return `ST_Distance_Sphere(${col1}, ${col2}) < ${this.addParam(params, '', threshold)}`;
                }
            }

            this.validateOperator(op);
            const leftIsRef: boolean = this.isTableReference(column);

            if (op === C6C.MATCH_AGAINST && Array.isArray(value)) {
                const [search, mode] = value;
                const paramName = this.useNamedParams ? `param${Object.keys(params).length}` : null;
                if (this.useNamedParams) {
                    params[paramName!] = search;
                } else {
                    params.push(search);
                }

                let againstClause: string;

                switch ((mode || '').toUpperCase()) {
                    case 'BOOLEAN':
                        againstClause = this.useNamedParams ? `AGAINST(:${paramName} IN BOOLEAN MODE)` : `AGAINST(? IN BOOLEAN MODE)`;
                        break;
                    case 'WITH QUERY EXPANSION':
                        againstClause = this.useNamedParams ? `AGAINST(:${paramName} WITH QUERY EXPANSION)` : `AGAINST(? WITH QUERY EXPANSION)`;
                        break;
                    default: // NATURAL or undefined
                        againstClause = this.useNamedParams ? `AGAINST(:${paramName})` : `AGAINST(?)`;
                        break;
                }

                if (!leftIsRef) {
                    throw new Error(`MATCH_AGAINST requires a table reference as the left operand. Column '${column}' is not a valid table reference.`);
                }
                const matchClause = `(MATCH(${column}) ${againstClause})`;
                this.config.verbose && console.log(`[MATCH_AGAINST] ${matchClause}`);
                return matchClause;
            }

            if ((op === C6C.IN || op === C6C.NOT_IN) && Array.isArray(value)) {
                const placeholders = value.map(v => this.addParam(params, column, v)).join(', ');
                const normalized = op.replace('_', ' ');
                if (!leftIsRef) {
                    throw new Error(`IN operator requires a table reference as the left operand. Column '${column}' is not a valid table reference.`);
                }
                return `( ${column} ${normalized} (${placeholders}) )`;
            }

            if (op === C6C.BETWEEN || op === 'NOT BETWEEN') {
                if (!Array.isArray(value) || value.length !== 2) {
                    throw new Error(`BETWEEN operator requires an array of two values`);
                }
                const [start, end] = value;
                if (!leftIsRef) {
                    throw new Error(`BETWEEN operator requires a table reference as the left operand. Column '${column}' is not a valid table reference.`);
                }
                return `(${column}) ${op.replace('_', ' ')} ${this.addParam(params, column, start)} AND ${this.addParam(params, column, end)}`;
            }

            const rightIsRef: boolean = this.isTableReference(value);

            if (leftIsRef && rightIsRef) {
                return `(${column}) ${op} ${value}`;
            }

            if (leftIsRef && !rightIsRef) {
                return `(${column}) ${op} ${this.addParam(params, column, value)}`;
            }

            if (rightIsRef) {
                return `(${this.addParam(params, column, column)}) ${op} ${value}`;
            }

            throw new Error(`Neither operand appears to be a table reference`);

        };

        const parts: string[] = [];

        const buildFromObject = (obj: Record<string, any>, mode: boolean) => {
            const subParts: string[] = [];
            for (const [k, v] of Object.entries(obj)) {
                // numeric keys represent nested OR groups
                if (!isNaN(Number(k))) {
                    const sub = this.buildBooleanJoinedConditions(v, false, params);
                    if (sub) subParts.push(sub);
                    continue;
                }

                if (typeof v === 'object' && v !== null && Object.keys(v).length === 1) {
                    const [op, val] = Object.entries(v)[0];
                    subParts.push(addCondition(k, op, val));
                } else if (Array.isArray(v) && v.length >= 2 && typeof v[0] === 'string') {
                    const [op, val] = v as [string, any];
                    subParts.push(addCondition(k, op, val));
                } else if (typeof v === 'object' && v !== null) {
                    const sub = this.buildBooleanJoinedConditions(v, mode, params);
                    if (sub) subParts.push(sub);
                } else {
                    subParts.push(addCondition(k, '=', v));
                }
            }
            return subParts.join(` ${mode ? 'AND' : 'OR'} `);
        };

        if (Array.isArray(set)) {
            for (const item of set) {
                const sub = this.buildBooleanJoinedConditions(item, false, params);
                if (sub) parts.push(sub);
            }
        } else if (typeof set === 'object' && set !== null) {
            const sub = buildFromObject(set, andMode);
            if (sub) parts.push(sub);
        }

        const clause = parts.join(` ${booleanOperator} `);
        return clause ? `(${clause})` : '';
    }

    buildWhereClause(whereArg: any, params: any[] | Record<string, any>): string {
        const clause = this.buildBooleanJoinedConditions(whereArg, true, params);
        if (!clause) return '';
        const trimmed = clause.replace(/^\((.*)\)$/, '$1');
        this.config.verbose && console.log(`[WHERE] ${trimmed}`);
        return ` WHERE ${trimmed}`;
    }
}
