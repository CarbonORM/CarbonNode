import {C6C} from "../../C6Constants";
import {OrmGenerics} from "../../types/ormGenerics";
import {DetermineResponseDataType} from "../../types/ormInterfaces";
import {convertHexIfBinary, SqlBuilderResult} from "../utils/sqlUtils";
import {AggregateBuilder} from "./AggregateBuilder";
import {isDerivedTableKey} from "../queryHelpers";

type ExpressionMetadata = { referencesTable: boolean; containsSubSelect: boolean };
type SerializedExpression = ExpressionMetadata & { sql: string };

export abstract class ConditionBuilder<
    G extends OrmGenerics
> extends AggregateBuilder<G> {

    protected aliasMap: Record<string, string> = {};
    protected derivedAliases: Set<string> = new Set<string>();

    protected initAlias(baseTable: string, joins?: any): void {
        this.aliasMap = { [baseTable]: baseTable };
        this.derivedAliases = new Set<string>();

        if (!joins) return;

        for (const joinType in joins) {
            for (const raw in joins[joinType]) {
                const [table, alias] = raw.trim().split(/\s+/, 2);
                if (!table) continue;
                this.registerAlias(alias || table, table);
            }
        }
    }

    protected registerAlias(alias: string, table: string): void {
        this.aliasMap[alias] = table;
        if (isDerivedTableKey(table)) {
            this.derivedAliases.add(alias);
        }
    }

    protected assertValidIdentifier(identifier: string, context: string): void {
        if (typeof identifier !== 'string') return;
        if (!identifier.includes('.')) return;

        const [alias] = identifier.split('.', 2);
        if (!(alias in this.aliasMap)) {
            const hasTable = Boolean(this.config.C6?.TABLES?.[alias]);
            if (!hasTable) {
                throw new Error(`Unknown table or alias '${alias}' referenced in ${context}: '${identifier}'.`);
            }
        }
    }

    protected isColumnRef(ref: string): boolean {
        if (typeof ref !== 'string' || !ref.includes('.')) return false;

        const [prefix, column] = ref.split('.', 2);
        const tableName = this.aliasMap[prefix] || prefix;

        if (isDerivedTableKey(tableName) || this.derivedAliases.has(prefix)) {
            return true;
        }

        const table = this.config.C6?.TABLES?.[tableName];
        if (!table) return false;

        const fullKey = `${tableName}.${column}`;
        if (table.COLUMNS && (fullKey in table.COLUMNS)) return true;
        if (table.COLUMNS && Object.values(table.COLUMNS).includes(column)) return true;

        return false;
    }

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
        C6C.ST_DISTANCE_SPHERE,
        // spatial predicates
        C6C.ST_CONTAINS,
        C6C.ST_INTERSECTS,
        C6C.ST_WITHIN,
        C6C.ST_CROSSES,
        C6C.ST_DISJOINT,
        C6C.ST_EQUALS,
        C6C.ST_OVERLAPS,
        C6C.ST_TOUCHES
    ]);

    private isTableReference(val: any): boolean {
        if (typeof val !== 'string') return false;
        // Support aggregate aliases (e.g., SELECT COUNT(x) AS cnt ... HAVING cnt > 1)
        if (!val.includes('.')) {
            const isIdentifier = /^[A-Za-z_][A-Za-z0-9_]*$/.test(val);
            // selectAliases is defined in AggregateBuilder
            if (isIdentifier && (this as any).selectAliases?.has(val)) {
                return true;
            }
            return false;
        }
        const [prefix, column] = val.split('.');
        const tableName = this.aliasMap[prefix] ?? prefix;
        if (isDerivedTableKey(tableName) || this.derivedAliases.has(prefix)) {
            return true;
        }
        const table = this.config.C6?.TABLES?.[tableName];
        if (!table || !table.COLUMNS) return false;

        const fullKey = `${tableName}.${column}`;

        return (
            fullKey in table.COLUMNS ||
            Object.values(table.COLUMNS).includes(column)
        );
    }

    private validateOperator(op: string) {
        if (!this.OPERATORS.has(op)) {
            throw new Error(`Invalid or unsupported SQL operator detected: '${op}'`);
        }
    }

    private isExpressionStructure(value: any): boolean {
        if (Array.isArray(value)) {
            if (value.length === 0) return false;
            const [head] = value;
            if (typeof head === 'string') {
                if (this.OPERATORS.has(head)) return false;
                if (head === C6C.PARAM || head === C6C.SUBSELECT) return true;
                if (value.length === 2 && Array.isArray(value[1])) return true;
                return false;
            }
            return value.some(item => this.isExpressionStructure(item));
        }

        if (value && typeof value === 'object') {
            if (C6C.SUBSELECT in value) return true;
            return Object.values(value).some(entry => this.isExpressionStructure(entry));
        }

        return false;
    }

    private inspectExpression(value: any): { referencesTable: boolean; containsSubSelect: boolean } {
        if (value === null || value === undefined) {
            return { referencesTable: false, containsSubSelect: false };
        }

        if (typeof value === 'string') {
            if (value === C6C.NULL) {
                return { referencesTable: false, containsSubSelect: false };
            }
            return {
                referencesTable: this.isTableReference(value),
                containsSubSelect: false
            };
        }

        if (typeof value === 'number' || typeof value === 'boolean') {
            return { referencesTable: false, containsSubSelect: false };
        }

        if (Array.isArray(value)) {
            if (value.length >= 1 && typeof value[0] === 'string') {
                const token = String(value[0]).toUpperCase();
                if (token === C6C.SUBSELECT) {
                    return { referencesTable: true, containsSubSelect: true };
                }
                if (token === C6C.PARAM) {
                    return { referencesTable: false, containsSubSelect: false };
                }
            }

            return value.reduce<ExpressionMetadata>((acc, entry) => {
                const meta = this.inspectExpression(entry);
                return {
                    referencesTable: acc.referencesTable || meta.referencesTable,
                    containsSubSelect: acc.containsSubSelect || meta.containsSubSelect
                };
            }, { referencesTable: false, containsSubSelect: false });
        }

        if (typeof value === 'object') {
            if (value && C6C.SUBSELECT in value) {
                return { referencesTable: true, containsSubSelect: true };
            }

            return Object.values(value || {}).reduce<ExpressionMetadata>((acc, entry) => {
                const meta = this.inspectExpression(entry);
                return {
                    referencesTable: acc.referencesTable || meta.referencesTable,
                    containsSubSelect: acc.containsSubSelect || meta.containsSubSelect
                };
            }, { referencesTable: false, containsSubSelect: false });
        }

        return { referencesTable: false, containsSubSelect: false };
    }

    private serializeExpression(
        expression: any,
        params: any[] | Record<string, any>,
        columnContext?: string
    ): SerializedExpression {
        const placeholderFromValue = (val: any): string => this.addParam(params, columnContext ?? '', val);

        if (expression === undefined) {
            throw new Error('Undefined expression encountered while building conditions.');
        }

        if (expression === null) {
            return {
                sql: placeholderFromValue(null),
                referencesTable: false,
                containsSubSelect: false
            };
        }

        if (typeof expression === 'number' || typeof expression === 'boolean') {
            return {
                sql: placeholderFromValue(expression),
                referencesTable: false,
                containsSubSelect: false
            };
        }

        if (typeof expression === 'string') {
            if (expression === C6C.NULL) {
                return {
                    sql: placeholderFromValue(null),
                    referencesTable: false,
                    containsSubSelect: false
                };
            }

            if (this.isTableReference(expression)) {
                this.assertValidIdentifier(expression, 'WHERE expression');
                return {
                    sql: expression,
                    referencesTable: true,
                    containsSubSelect: false
                };
            }

            if (expression === '?' || /^:[A-Za-z_][A-Za-z0-9_]*$/.test(expression)) {
                return {
                    sql: expression,
                    referencesTable: false,
                    containsSubSelect: false
                };
            }

            return {
                sql: placeholderFromValue(expression),
                referencesTable: false,
                containsSubSelect: false
            };
        }

        if (Array.isArray(expression)) {
            if (expression.length === 0) {
                throw new Error('Invalid empty expression array encountered in WHERE clause.');
            }

            if (expression.length === 2 && typeof expression[0] === 'string' && Array.isArray(expression[1])) {
                return this.serializeExpression([expression[0], ...expression[1]], params, columnContext);
            }

            if (typeof expression[0] === 'string') {
                const tokenUpper = String(expression[0]).toUpperCase();

                if (tokenUpper === C6C.PARAM) {
                    const paramVal = expression.length > 1 ? expression[1] : undefined;
                    return {
                        sql: placeholderFromValue(paramVal),
                        referencesTable: false,
                        containsSubSelect: false
                    };
                }

                if (tokenUpper === C6C.SUBSELECT) {
                    const builder = (this as any).buildScalarSubSelect;
                    if (typeof builder !== 'function') {
                        throw new Error('Scalar subselect handling requires JoinBuilder context.');
                    }
                    const payload = expression[1];
                    const sql = builder.call(this, payload, params);
                    return {
                        sql,
                        referencesTable: true,
                        containsSubSelect: true
                    };
                }

                const args = expression.slice(1);
                const hasAlias = args.some((arg, idx) => {
                    if (typeof arg !== 'string') return false;
                    if (!arg) return false;
                    if (idx === args.length - 1) return false;
                    return arg.toUpperCase() === 'AS';
                });

                if (hasAlias) {
                    throw new Error('Aliases are not permitted within conditional expressions.');
                }

                const aggregateField = [expression[0], ...args] as any;
                const sql = this.buildAggregateField(aggregateField, params);
                const meta = this.inspectExpression(aggregateField);
                return {
                    sql,
                    referencesTable: meta.referencesTable,
                    containsSubSelect: meta.containsSubSelect
                };
            }

            const parts = expression.map(item => this.serializeExpression(item, params, columnContext));
            const meta = parts.reduce<ExpressionMetadata>((acc, part) => ({
                referencesTable: acc.referencesTable || part.referencesTable,
                containsSubSelect: acc.containsSubSelect || part.containsSubSelect
            }), { referencesTable: false, containsSubSelect: false });
            const sql = parts.map(part => part.sql).join(', ');
            return {
                sql,
                referencesTable: meta.referencesTable,
                containsSubSelect: meta.containsSubSelect
            };
        }

        if (expression && typeof expression === 'object') {
            if (C6C.SUBSELECT in expression) {
                const builder = (this as any).buildScalarSubSelect;
                if (typeof builder !== 'function') {
                    throw new Error('Scalar subselect handling requires JoinBuilder context.');
                }
                const sql = builder.call(this, expression[C6C.SUBSELECT], params);
                return {
                    sql,
                    referencesTable: true,
                    containsSubSelect: true
                };
            }

            return {
                sql: placeholderFromValue(expression),
                referencesTable: false,
                containsSubSelect: false
            };
        }

        return {
            sql: placeholderFromValue(expression),
            referencesTable: false,
            containsSubSelect: false
        };
    }

    public addParam(
        params: any[] | Record<string, any>,
        column: string,
        value: any
    ): string {
        // Determine column definition from C6.TABLES to support type-aware conversions (e.g., BINARY hex -> Buffer)
        let columnDef: any | undefined;
        if (typeof column === 'string' && column.includes('.')) {
            const [tableName, colName] = column.split('.', 2);
            const table = this.config.C6?.TABLES?.[tableName];
            // Support both short-keyed and fully-qualified TYPE_VALIDATION entries
            columnDef = table?.TYPE_VALIDATION?.[colName] ?? table?.TYPE_VALIDATION?.[`${tableName}.${colName}`];
        }
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

        const addCondition = (leftOperand: any, operatorRaw: any, rightOperand: any): string => {
            const operator = typeof operatorRaw === 'string' ? operatorRaw : String(operatorRaw);
            this.validateOperator(operator);

            const valueNorm = (rightOperand === C6C.NULL) ? null : rightOperand;
            const displayOp = operator.replace('_', ' ');

            const columnContext = typeof leftOperand === 'string' && leftOperand.includes('.') ? leftOperand : undefined;
            const leftExpr = this.serializeExpression(leftOperand, params, columnContext);

            if (operator === C6C.MATCH_AGAINST && Array.isArray(valueNorm)) {
                if (!leftExpr.referencesTable) {
                    throw new Error(`MATCH_AGAINST requires a table reference as the left operand. Column '${leftExpr.sql}' is not a valid table reference.`);
                }

                const [search, mode] = valueNorm;
                const placeholder = this.addParam(params, '', search);

                let againstClause: string;

                switch ((mode || '').toUpperCase()) {
                    case 'BOOLEAN':
                        againstClause = `AGAINST(${placeholder} IN BOOLEAN MODE)`;
                        break;
                    case 'WITH QUERY EXPANSION':
                        againstClause = `AGAINST(${placeholder} WITH QUERY EXPANSION)`;
                        break;
                    default:
                        againstClause = `AGAINST(${placeholder})`;
                        break;
                }

                const matchClause = `(MATCH(${leftExpr.sql}) ${againstClause})`;
                this.config.verbose && console.log(`[MATCH_AGAINST] ${matchClause}`);
                return matchClause;
            }

            if (operator === C6C.BETWEEN || operator === 'NOT BETWEEN') {
                if (!Array.isArray(valueNorm) || valueNorm.length !== 2) {
                    throw new Error(`BETWEEN operator requires an array of two values`);
                }

                if (!leftExpr.referencesTable) {
                    throw new Error(`BETWEEN operator requires a table reference as the left operand. Column '${leftExpr.sql}' is not a valid table reference.`);
                }

                const [start, end] = valueNorm;
                const startExpr = this.serializeExpression(start, params, columnContext);
                const endExpr = this.serializeExpression(end, params, columnContext);

                return `(${leftExpr.sql}) ${displayOp} ${startExpr.sql} AND ${endExpr.sql}`;
            }

            if (operator === C6C.IN || operator === C6C.NOT_IN || operator === 'NOT IN') {
                if (!leftExpr.referencesTable) {
                    throw new Error(`IN operator requires a table reference as the left operand. Column '${leftExpr.sql}' is not a valid table reference.`);
                }

                const normalized = displayOp;

                const valueIsExpression = this.isExpressionStructure(valueNorm);

                if (valueIsExpression) {
                    const rightExpr = this.serializeExpression(valueNorm, params, columnContext);
                    if (!rightExpr.referencesTable && !rightExpr.containsSubSelect) {
                        throw new Error(`IN operator expects a subselect or table reference on the right operand. Received '${rightExpr.sql}'.`);
                    }
                    return `( ${leftExpr.sql} ${normalized} ${rightExpr.sql} )`;
                }

                if (Array.isArray(valueNorm)) {
                    const list = valueNorm.map(item => this.serializeExpression(item, params, columnContext).sql).join(', ');
                    return `( ${leftExpr.sql} ${normalized} (${list}) )`;
                }

                const rightExpr = this.serializeExpression(valueNorm, params, columnContext);
                if (!rightExpr.referencesTable && !rightExpr.containsSubSelect) {
                    throw new Error(`IN operator expects a collection, subselect, or table reference on the right operand. Received '${rightExpr.sql}'.`);
                }
                return `( ${leftExpr.sql} ${normalized} ${rightExpr.sql} )`;
            }

            const rightExpr = this.serializeExpression(valueNorm, params, columnContext);

            if (!leftExpr.referencesTable && !rightExpr.referencesTable && !rightExpr.containsSubSelect) {
                throw new Error(`Potential SQL injection detected: '${leftExpr.sql} ${displayOp} ${rightExpr.sql}'`);
            }

            if (leftExpr.referencesTable && rightExpr.referencesTable) {
                return `(${leftExpr.sql}) ${displayOp} ${rightExpr.sql}`;
            }

            return `(${leftExpr.sql}) ${displayOp} ${rightExpr.sql}`;

        };

        const parts: string[] = [];

        const buildFromObject = (obj: Record<string, any>, mode: boolean) => {
            const subParts: string[] = [];
            const entries = Object.entries(obj);
            const nonNumeric = entries.filter(([k]) => isNaN(Number(k)));
            const numeric = entries.filter(([k]) => !isNaN(Number(k)));

            const processEntry = (k: string, v: any) => {
                if (this.OPERATORS.has(k)) {
                    if (!Array.isArray(v) || v.length !== 2) {
                        throw new Error(`Operator '${k}' requires a two-element array [left, right].`);
                    }
                    const [left, right] = v;
                    subParts.push(addCondition(left, k, right));
                    return;
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
            };

            // Process non-numeric keys first to preserve intuitive insertion order for params
            for (const [k, v] of nonNumeric) {
                processEntry(k, v);
            }
            // Then process numeric keys (treated as grouped OR conditions)
            for (const [_k, v] of numeric) {
                const sub = this.buildBooleanJoinedConditions(v, false, params);
                if (sub) subParts.push(sub);
            }

            return subParts.join(` ${mode ? 'AND' : 'OR'} `);
        };

        if (Array.isArray(set)) {
            // Detect a single condition triple: [column, op, value]
            if (set.length === 3 && typeof set[0] === 'string' && typeof set[1] === 'string') {
                const [column, rawOp, rawVal] = set as [string, string, any];
                const op = rawOp;
                const value = rawVal === C6C.NULL ? null : rawVal;
                const sub = addCondition(column, op, value);
                if (sub) parts.push(sub);
            } else {
                for (const item of set) {
                    const sub = this.buildBooleanJoinedConditions(item, false, params);
                    if (sub) parts.push(sub);
                }
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
