import {C6C} from "api/C6Constants";
import isVerbose from "../../../variables/isVerbose";
import {OrmGenerics} from "../../types/ormGenerics";
import {DetermineResponseDataType} from "../../types/ormInterfaces";
import {convertHexIfBinary} from "../utils/sqlUtils";
import {AggregateBuilder} from "./AggregateBuilder";

export class ConditionBuilder<
    G extends OrmGenerics
> extends AggregateBuilder<G> {
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
        C6C.MATCH_AGAINST
    ]);

    private validateOperator(op: string) {
        if (!this.OPERATORS.has(op)) {
            throw new Error(`Invalid or unsupported SQL operator detected: '${op}'`);
        }
    }

    private addParam(
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

        const addCondition = (column: string, op: string, value: any): string => {
            this.validateOperator(op);


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

                const matchClause = `(MATCH(${column}) ${againstClause})`;
                isVerbose() && console.log(`[MATCH_AGAINST] ${matchClause}`);
                return matchClause;
            }

            if ((op === C6C.IN || op === C6C.NOT_IN) && Array.isArray(value)) {
                const placeholders = value.map(v => this.addParam(params, column, v)).join(', ');
                const normalized = op.replace('_', ' ');
                return `( ${column} ${normalized} (${placeholders}) )`;
            }

            // handle other operators
            return `( ${column} ${op} ${this.addParam(params, column, value)} )`;
        };

        const parts: string[] = [];

        if (typeof set === 'object' && !Array.isArray(set)) {
            for (const [key, value] of Object.entries(set)) {
                if (typeof value === 'object' && value !== null && Object.keys(value).length === 1) {
                    const [op, val] = Object.entries(value)[0];
                    parts.push(addCondition(key, op, val));
                } else if (Array.isArray(value) && value.length === 2 && typeof value[0] === 'string') {
                    const [op, val] = value as [string, any];
                    parts.push(addCondition(key, op, val));
                } else {
                    parts.push(addCondition(key, '=', value));
                }
            }
        }

        const clause = parts.join(` ${booleanOperator} `);
        return clause ? `(${clause})` : '';
    }

    buildWhereClause(whereArg: any, params: any[] | Record<string, any>): string {
        const clause = this.buildBooleanJoinedConditions(whereArg, true, params);
        if (!clause) return '';
        const trimmed = clause.replace(/^\((.*)\)$/, '$1');
        isVerbose() && console.log(`[WHERE] ${trimmed}`);
        return ` WHERE ${trimmed}`;
    }
}
