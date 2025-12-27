import {C6C} from "../../C6Constants";
import {OrmGenerics} from "../../types/ormGenerics";
import {DetermineResponseDataType} from "../../types/ormInterfaces";
import {convertHexIfBinary, SqlBuilderResult} from "../utils/sqlUtils";
import {AggregateBuilder} from "./AggregateBuilder";
import {isDerivedTableKey} from "../queryHelpers";

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
            throw new Error(`Unknown table or alias '${alias}' referenced in ${context}: '${identifier}'.`);
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

    private readonly BOOLEAN_OPERATORS = new Map<string, 'AND' | 'OR'>([
        [C6C.AND, 'AND'],
        ['AND', 'AND'],
        [C6C.OR, 'OR'],
        ['OR', 'OR'],
    ]);

    private readonly OPERATOR_ALIASES = new Map<string, string>([
        [C6C.EQUAL, C6C.EQUAL],
        ['=', C6C.EQUAL],
        [C6C.EQUAL_NULL_SAFE, C6C.EQUAL_NULL_SAFE],
        ['<=>', C6C.EQUAL_NULL_SAFE],
        [C6C.NOT_EQUAL, C6C.NOT_EQUAL],
        ['<>', C6C.NOT_EQUAL],
        [C6C.LESS_THAN, C6C.LESS_THAN],
        ['<', C6C.LESS_THAN],
        [C6C.LESS_THAN_OR_EQUAL_TO, C6C.LESS_THAN_OR_EQUAL_TO],
        ['<=', C6C.LESS_THAN_OR_EQUAL_TO],
        [C6C.GREATER_THAN, C6C.GREATER_THAN],
        ['>', C6C.GREATER_THAN],
        [C6C.GREATER_THAN_OR_EQUAL_TO, C6C.GREATER_THAN_OR_EQUAL_TO],
        ['>=', C6C.GREATER_THAN_OR_EQUAL_TO],
        [C6C.LIKE, C6C.LIKE],
        ['LIKE', C6C.LIKE],
        [C6C.NOT_LIKE, 'NOT LIKE'],
        ['NOT LIKE', 'NOT LIKE'],
        [C6C.IN, C6C.IN],
        ['IN', C6C.IN],
        [C6C.NOT_IN, 'NOT IN'],
        ['NOT IN', 'NOT IN'],
        [C6C.IS, C6C.IS],
        ['IS', C6C.IS],
        [C6C.IS_NOT, 'IS NOT'],
        ['IS NOT', 'IS NOT'],
        [C6C.BETWEEN, C6C.BETWEEN],
        ['BETWEEN', C6C.BETWEEN],
        ['NOT BETWEEN', 'NOT BETWEEN'],
        [C6C.EXISTS, C6C.EXISTS],
        ['EXISTS', C6C.EXISTS],
        ['NOT EXISTS', 'NOT EXISTS'],
        [C6C.MATCH_AGAINST, C6C.MATCH_AGAINST],
    ]);

    private readonly BOOLEAN_FUNCTION_KEYS = new Set<string>([
        C6C.ST_CONTAINS?.toUpperCase?.() ?? 'ST_CONTAINS',
        C6C.ST_WITHIN?.toUpperCase?.() ?? 'ST_WITHIN',
        C6C.MBRCONTAINS?.toUpperCase?.() ?? 'MBRCONTAINS',
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

    private normalizeOperatorKey(op: string): string | undefined {
        if (typeof op !== 'string') return undefined;
        return this.OPERATOR_ALIASES.get(op);
    }

    private formatOperator(op: string): string {
        const normalized = this.normalizeOperatorKey(op);
        if (!normalized) {
            throw new Error(`Invalid or unsupported SQL operator detected: '${op}'`);
        }

        switch (normalized) {
            case 'NOT LIKE':
            case 'NOT IN':
            case 'IS NOT':
            case 'NOT BETWEEN':
                return normalized;
            case C6C.MATCH_AGAINST:
                return C6C.MATCH_AGAINST;
            default:
                return normalized;
        }
    }

    private isOperator(op: string): boolean {
        return !!this.normalizeOperatorKey(op);
    }

    private looksLikeSafeFunctionExpression(value: string): boolean {
        if (typeof value !== 'string') return false;

        const trimmed = value.trim();
        if (trimmed.length === 0) return false;

        if (trimmed.includes(';') || trimmed.includes('--') || trimmed.includes('/*') || trimmed.includes('*/')) {
            return false;
        }

        if (!trimmed.includes('(') || !trimmed.endsWith(')')) {
            return false;
        }

        const functionMatch = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*)\s*\(/);
        if (!functionMatch) {
            return false;
        }

        const allowedCharacters = /^[A-Za-z0-9_().,'"\s-]+$/;
        if (!allowedCharacters.test(trimmed)) {
            return false;
        }

        let depth = 0;
        for (const char of trimmed) {
            if (char === '(') {
                depth += 1;
            } else if (char === ')') {
                depth -= 1;
                if (depth < 0) {
                    return false;
                }
            }
        }

        return depth === 0;
    }

    private ensureWrapped(expression: string): string {
        const trimmed = expression.trim();
        if (!trimmed) return trimmed;
        if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
            return trimmed;
        }
        return `(${trimmed})`;
    }

    private joinBooleanParts(parts: string[], operator: 'AND' | 'OR'): string {
        if (parts.length === 0) return '';
        if (parts.length === 1) {
            return parts[0];
        }

        return parts
            .map(part => {
                const trimmed = part.trim();
                const upper = trimmed.toUpperCase();
                const containsAnd = upper.includes(' AND ');
                const containsOr = upper.includes(' OR ');
                const needsWrap =
                    (operator === 'AND' && containsOr) ||
                    (operator === 'OR' && containsAnd);
                return needsWrap ? `(${trimmed})` : trimmed;
            })
            .join(` ${operator} `);
    }

    private normalizeFunctionField(field: any, params: any[] | Record<string, any>): any {
        if (field instanceof Map) {
            field = Object.fromEntries(field);
        }

        if (Array.isArray(field)) {
            if (field.length === 0) return field;
            const [fn, ...args] = field;
            const normalizedArgs = args.map(arg => this.normalizeFunctionField(arg, params));
            return [fn, ...normalizedArgs];
        }

        if (field && typeof field === 'object') {
            if (C6C.SUBSELECT in field) {
                const builder = (this as any).buildScalarSubSelect;
                if (typeof builder !== 'function') {
                    throw new Error('Scalar subselect handling requires JoinBuilder context.');
                }
                return builder.call(this, field[C6C.SUBSELECT], params);
            }

            const entries = Object.entries(field);
            if (entries.length === 1) {
                const [key, value] = entries[0];
                if (this.isOperator(key)) {
                    return this.buildOperatorExpression(key, value, params);
                }
                return this.buildFunctionCall(key, value, params);
            }
        }

        return field;
    }

    private buildFunctionCall(fn: string, value: any, params: any[] | Record<string, any>): string {
        const args = Array.isArray(value) ? value : [value];
        const normalized = this.normalizeFunctionField([fn, ...args], params);
        return this.buildAggregateField(normalized, params);
    }

    private serializeOperand(
        operand: any,
        params: any[] | Record<string, any>,
        contextColumn?: string
    ): { sql: string; isReference: boolean; isExpression: boolean; isSubSelect: boolean } {
        const asParam = (val: any): string => this.addParam(params, contextColumn ?? '', val);

        if (operand === C6C.NULL) {
            operand = null;
        }

        if (operand === null || typeof operand === 'number' || typeof operand === 'boolean') {
            return { sql: asParam(operand), isReference: false, isExpression: false, isSubSelect: false };
        }

        if (typeof Buffer !== 'undefined' && Buffer.isBuffer && Buffer.isBuffer(operand)) {
            return { sql: asParam(operand), isReference: false, isExpression: false, isSubSelect: false };
        }

        if (typeof operand === 'string') {
            if (this.isTableReference(operand) || this.isColumnRef(operand)) {
                return { sql: operand, isReference: true, isExpression: false, isSubSelect: false };
            }
            if (this.looksLikeSafeFunctionExpression(operand)) {
                return { sql: operand.trim(), isReference: false, isExpression: true, isSubSelect: false };
            }
            return { sql: asParam(operand), isReference: false, isExpression: false, isSubSelect: false };
        }

        if (Array.isArray(operand)) {
            const normalized = this.normalizeFunctionField(operand, params);
            const sql = this.buildAggregateField(normalized, params);
            return { sql, isReference: false, isExpression: true, isSubSelect: false };
        }

        if (operand instanceof Map) {
            operand = Object.fromEntries(operand);
        }

        if (typeof operand === 'object' && operand !== null) {
            if (C6C.SUBSELECT in operand) {
                const builder = (this as any).buildScalarSubSelect;
                if (typeof builder !== 'function') {
                    throw new Error('Scalar subselect handling requires JoinBuilder context.');
                }
                const subSql = builder.call(this, operand[C6C.SUBSELECT], params);
                return { sql: subSql, isReference: false, isExpression: true, isSubSelect: true };
            }

            const entries = Object.entries(operand);
            if (entries.length === 1) {
                const [key, value] = entries[0];

                if (this.isOperator(key)) {
                    const sql = this.buildOperatorExpression(key, value, params);
                    return { sql: this.ensureWrapped(sql), isReference: false, isExpression: true, isSubSelect: false };
                }

                if (this.BOOLEAN_OPERATORS.has(key)) {
                    const sql = this.buildBooleanExpression({ [key]: value }, params, 'AND');
                    return { sql: this.ensureWrapped(sql), isReference: false, isExpression: true, isSubSelect: false };
                }

                const sql = this.buildFunctionCall(key, value, params);
                return { sql, isReference: false, isExpression: true, isSubSelect: false };
            }
        }

        throw new Error('Unsupported operand type in SQL expression.');
    }

    private isPlainArrayLiteral(value: any, allowColumnRefs = false): boolean {
        if (!Array.isArray(value)) return false;
        return value.every(item => {
            if (item === null) return true;
            const type = typeof item;
            if (type === 'string' || type === 'number' || type === 'boolean') return true;
            if (Array.isArray(item)) return this.isPlainArrayLiteral(item, allowColumnRefs);
            if (item && typeof item === 'object') return this.isPlainObjectLiteral(item, allowColumnRefs);
            return false;
        });
    }

    private isPlainObjectLiteral(value: any, allowColumnRefs = false): boolean {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
        if (value instanceof Date) return false;
        if (typeof Buffer !== 'undefined' && Buffer.isBuffer && Buffer.isBuffer(value)) return false;

        const normalized = value instanceof Map ? Object.fromEntries(value) : value;
        if (C6C.SUBSELECT in (normalized as any)) return false;

        const entries = Object.entries(normalized as Record<string, any>);
        if (entries.length === 0) return true;

        if (entries.some(([key]) => this.isOperator(key) || this.BOOLEAN_OPERATORS.has(key))) {
            return false;
        }

        if (!allowColumnRefs) {
            if (entries.some(([key]) => typeof key === 'string' && (this.isColumnRef(key) || key.includes('.')))) {
                return false;
            }
        }

        return true;
    }

    private resolveColumnDefinition(column?: string): any | undefined {
        if (!column || typeof column !== 'string' || !column.includes('.')) return undefined;
        const [prefix, colName] = column.split('.', 2);
        const tableName = this.aliasMap[prefix] ?? prefix;
        const table = this.config.C6?.TABLES?.[tableName];
        if (!table?.TYPE_VALIDATION) return undefined;
        return table.TYPE_VALIDATION[colName] ?? table.TYPE_VALIDATION[`${tableName}.${colName}`];
    }

    private isJsonColumn(column?: string): boolean {
        const columnDef = this.resolveColumnDefinition(column);
        const mysqlType = columnDef?.MYSQL_TYPE;
        return typeof mysqlType === 'string' && mysqlType.toLowerCase().includes('json');
    }

    protected serializeUpdateValue(
        value: any,
        params: any[] | Record<string, any>,
        contextColumn?: string
    ): string {
        const normalized = value instanceof Map ? Object.fromEntries(value) : value;

        const allowColumnRefs = this.isJsonColumn(contextColumn);

        if (this.isPlainArrayLiteral(normalized, allowColumnRefs)
            || this.isPlainObjectLiteral(normalized, allowColumnRefs)) {
            return this.addParam(params, contextColumn ?? '', JSON.stringify(normalized));
        }

        const { sql, isReference, isExpression, isSubSelect } = this.serializeOperand(normalized, params, contextColumn);

        if (!isReference && !isExpression && !isSubSelect && typeof normalized === 'object' && normalized !== null) {
            throw new Error('Unsupported operand type in SQL expression.');
        }

        return sql;
    }

    private ensurePlainObject<T>(value: T): any {
        if (value instanceof Map) {
            return Object.fromEntries(value as unknown as Map<string, any>);
        }
        return value;
    }

    private resolveExistsInnerColumn(subRequest: Record<string, any>, provided?: string): string {
        if (provided) {
            if (typeof provided !== 'string' || provided.trim() === '') {
                throw new Error('EXISTS correlation column must be a non-empty string.');
            }
            return provided;
        }

        const selectClause = this.ensurePlainObject(subRequest?.[C6C.SELECT]);
        if (Array.isArray(selectClause) && selectClause.length > 0) {
            const candidate = selectClause[0];
            if (typeof candidate === 'string' && candidate.trim() !== '') {
                return candidate;
            }
        }

        const fromTable = subRequest?.[C6C.FROM];
        if (typeof fromTable === 'string' && fromTable.trim() !== '') {
            const table = this.config.C6?.TABLES?.[fromTable.trim()];
            const primary = table?.PRIMARY;
            if (Array.isArray(primary) && primary.length > 0) {
                return String(primary[0]);
            }
        }

        throw new Error('EXISTS requires a correlation column to be provided or inferable from the subselect.');
    }

    private normalizeExistsSpec(
        spec: any
    ): { outerColumn: string; subRequest: Record<string, any>; innerColumn?: string } {
        const normalized = this.ensurePlainObject(spec);

        if (!Array.isArray(normalized) || normalized.length < 2) {
            throw new Error('EXISTS expects an array like [outerColumn, subselect, innerColumn?].');
        }

        const [outerRaw, payloadRaw, innerRaw] = normalized;
        if (typeof outerRaw !== 'string' || outerRaw.trim() === '') {
            throw new Error('EXISTS requires the first element to be an outer column reference string.');
        }

        const payload = this.ensurePlainObject(payloadRaw);
        let subSelect: any;
        if (payload && typeof payload === 'object' && C6C.SUBSELECT in payload) {
            subSelect = this.ensurePlainObject(payload[C6C.SUBSELECT]);
        } else if (payload && typeof payload === 'object') {
            subSelect = payload;
        } else {
            throw new Error('EXISTS requires a subselect payload as the second element.');
        }

        if (!subSelect || typeof subSelect !== 'object') {
            throw new Error('EXISTS subselect payload must be an object.');
        }

        const innerColumn = typeof innerRaw === 'string' ? innerRaw : undefined;

        return {
            outerColumn: outerRaw,
            subRequest: { ...subSelect },
            innerColumn,
        };
    }

    private buildExistsExpression(
        spec: any,
        operator: string,
        params: any[] | Record<string, any>
    ): string {
        const { outerColumn, subRequest, innerColumn } = this.normalizeExistsSpec(spec);

        const fromTableRaw = subRequest[C6C.FROM];
        if (typeof fromTableRaw !== 'string' || fromTableRaw.trim() === '') {
            throw new Error('EXISTS subselect requires a table specified with C6C.FROM.');
        }
        const fromTable = fromTableRaw.trim();

        this.assertValidIdentifier(outerColumn, 'EXISTS correlation column');
        const correlationColumn = this.resolveExistsInnerColumn(subRequest, innerColumn);
        if (!this.isColumnRef(correlationColumn) && !this.isTableReference(correlationColumn)) {
            throw new Error(`Unknown column reference '${correlationColumn}' used in EXISTS subquery correlation column.`);
        }

        const existingWhereRaw = this.ensurePlainObject(subRequest[C6C.WHERE]);
        const correlationCondition = { [correlationColumn]: [C6C.EQUAL, outerColumn] };

        const normalizedExistingWhere = existingWhereRaw && typeof existingWhereRaw === 'object'
            ? Array.isArray(existingWhereRaw)
                ? existingWhereRaw.slice()
                : { ...(existingWhereRaw as Record<string, any>) }
            : existingWhereRaw;

        const hasExistingWhere = Array.isArray(normalizedExistingWhere)
            ? normalizedExistingWhere.length > 0
            : normalizedExistingWhere && typeof normalizedExistingWhere === 'object'
                ? Object.keys(normalizedExistingWhere).length > 0
                : normalizedExistingWhere != null;

        let whereClause: any;
        if (!hasExistingWhere) {
            whereClause = correlationCondition;
        } else if (
            normalizedExistingWhere && typeof normalizedExistingWhere === 'object' &&
            Object.keys(normalizedExistingWhere).some(key => this.BOOLEAN_OPERATORS.has(key))
        ) {
            whereClause = { [C6C.AND]: [normalizedExistingWhere, correlationCondition] };
        } else if (normalizedExistingWhere && typeof normalizedExistingWhere === 'object') {
            whereClause = { ...normalizedExistingWhere, ...correlationCondition };
        } else {
            whereClause = { [C6C.AND]: [normalizedExistingWhere, correlationCondition] };
        }

        const subRequestWithCorrelation = {
            ...subRequest,
            [C6C.FROM]: fromTable,
            [C6C.WHERE]: whereClause,
            [C6C.SELECT]: subRequest[C6C.SELECT] ?? ['1'],
        };

        const buildScalarSubSelect = (this as any).buildScalarSubSelect;
        if (typeof buildScalarSubSelect !== 'function') {
            throw new Error('EXISTS operator requires SelectQueryBuilder context.');
        }

        const scalar = buildScalarSubSelect.call(this, subRequestWithCorrelation, params);
        const keyword = operator === 'NOT EXISTS' ? 'NOT EXISTS' : C6C.EXISTS;
        return `${keyword} ${scalar}`;
    }

    private buildOperatorExpression(
        op: string,
        rawOperands: any,
        params: any[] | Record<string, any>,
        contextColumn?: string
    ): string {
        const operator = this.formatOperator(op);

        if (operator === C6C.EXISTS || operator === 'NOT EXISTS') {
            const operands = Array.isArray(rawOperands) ? rawOperands : [rawOperands];
            if (!operands.length) {
                throw new Error(`${operator} requires at least one subselect specification.`);
            }
            const clauses = operands.map(spec => this.buildExistsExpression(spec, operator, params));
            return this.joinBooleanParts(clauses, 'AND');
        }

        if (operator === C6C.MATCH_AGAINST) {
            if (!Array.isArray(rawOperands) || rawOperands.length !== 2) {
                throw new Error('MATCH_AGAINST requires an array of two operands.');
            }
            const [left, right] = rawOperands;
            const leftInfo = this.serializeOperand(left, params, contextColumn);
            if (!leftInfo.isReference) {
                throw new Error('MATCH_AGAINST requires the left operand to be a table reference.');
            }

            if (!Array.isArray(right) || right.length === 0) {
                throw new Error('MATCH_AGAINST expects an array [search, mode?].');
            }

            const [search, mode] = right;
            const placeholder = this.addParam(params, leftInfo.sql, search);
            let againstClause: string;
            switch (typeof mode === 'string' ? mode.toUpperCase() : '') {
                case 'BOOLEAN':
                    againstClause = `AGAINST(${placeholder} IN BOOLEAN MODE)`;
                    break;
                case 'WITH QUERY EXPANSION':
                    againstClause = `AGAINST(${placeholder} WITH QUERY EXPANSION)`;
                    break;
                case 'NATURAL LANGUAGE MODE':
                    againstClause = `AGAINST(${placeholder} IN NATURAL LANGUAGE MODE)`;
                    break;
                default:
                    againstClause = `AGAINST(${placeholder})`;
                    break;
            }

            const clause = `(MATCH(${leftInfo.sql}) ${againstClause})`;
            this.config.verbose && console.log(`[MATCH_AGAINST] ${clause}`);
            return clause;
        }

        const operands = Array.isArray(rawOperands) ? rawOperands : [rawOperands];

        if (operator === C6C.IN || operator === 'NOT IN') {
            if (operands.length < 2) {
                throw new Error(`${operator} requires two operands.`);
            }
            const [leftRaw, ...rest] = operands;
            const left = leftRaw;
            const right = rest.length <= 1 ? rest[0] : rest;
            const leftInfo = this.serializeOperand(left, params, typeof left === 'string' ? left : contextColumn);
            if (!leftInfo.isReference) {
                throw new Error(`${operator} requires the left operand to be a table reference.`);
            }

            if (Array.isArray(right)) {
                if (right.length === 0) {
                    throw new Error(`${operator} requires at least one value.`);
                }
                if (right.length === 2 && right[0] === C6C.SUBSELECT) {
                    const sub = this.serializeOperand(right, params, typeof left === 'string' ? left : contextColumn);
                    return `( ${leftInfo.sql} ${operator} ${sub.sql} )`;
                }
                const placeholders = right.map(item => {
                    if (typeof item === 'string' && this.isTableReference(item)) {
                        return item;
                    }
                    const { sql } = this.serializeOperand(item, params, typeof left === 'string' ? left : contextColumn);
                    return sql;
                });
                return `( ${leftInfo.sql} ${operator} (${placeholders.join(', ')}) )`;
            }

            const rightInfo = this.serializeOperand(right, params, typeof left === 'string' ? left : contextColumn);
            if (!rightInfo.isSubSelect) {
                throw new Error(`${operator} requires an array of values or a subselect.`);
            }
            return `( ${leftInfo.sql} ${operator} ${rightInfo.sql} )`;
        }

        if (operator === C6C.BETWEEN || operator === 'NOT BETWEEN') {
            let left: any;
            let start: any;
            let end: any;
            if (operands.length === 3) {
                [left, start, end] = operands;
            } else if (operands.length === 2 && Array.isArray(operands[1]) && operands[1].length === 2) {
                [left, [start, end]] = operands as [any, any[]];
            } else {
                throw new Error(`${operator} requires three operands.`);
            }
            const leftInfo = this.serializeOperand(left, params, typeof left === 'string' ? left : contextColumn);
            if (!leftInfo.isReference) {
                throw new Error(`${operator} requires the left operand to be a table reference.`);
            }
            const startInfo = this.serializeOperand(start, params, typeof left === 'string' ? left : contextColumn);
            const endInfo = this.serializeOperand(end, params, typeof left === 'string' ? left : contextColumn);
            const betweenOperator = operator === 'NOT BETWEEN' ? 'NOT BETWEEN' : 'BETWEEN';
            return `${this.ensureWrapped(leftInfo.sql)} ${betweenOperator} ${startInfo.sql} AND ${endInfo.sql}`;
        }

        if (operands.length !== 2) {
            throw new Error(`${operator} requires two operands.`);
        }

        let [leftOperand, rightOperand] = operands;
        const leftInfo = this.serializeOperand(leftOperand, params, typeof leftOperand === 'string' ? leftOperand : contextColumn);
        const rightInfo = this.serializeOperand(rightOperand, params, typeof leftOperand === 'string' ? leftOperand : contextColumn);

        if (!leftInfo.isReference && !leftInfo.isExpression && !rightInfo.isReference && !rightInfo.isExpression) {
            throw new Error(`Potential SQL injection detected: '${operator}' with non-reference operands.`);
        }

        const leftSql = leftInfo.isExpression ? leftInfo.sql : this.ensureWrapped(leftInfo.sql);
        const rightSql = rightInfo.isExpression ? rightInfo.sql : rightInfo.sql;

        return `${leftSql} ${operator} ${rightSql}`;
    }

    private buildLegacyColumnCondition(
        column: string,
        value: any,
        params: any[] | Record<string, any>
    ): string {
        if (value instanceof Map) {
            value = Object.fromEntries(value);
        }

        if (typeof column === 'string') {
            const normalizedColumn = column.trim().toUpperCase();
            if (this.BOOLEAN_FUNCTION_KEYS.has(normalizedColumn)) {
                if (!Array.isArray(value)) {
                    throw new Error(`${column} expects an array of arguments.`);
                }
                return this.buildFunctionCall(column, value, params);
            }
        }

        if (typeof Buffer !== 'undefined' && Buffer.isBuffer && Buffer.isBuffer(value)) {
            return this.buildOperatorExpression(C6C.EQUAL, [column, value], params, column);
        }

        if (Array.isArray(value)) {
            if (value.length >= 2 && typeof value[0] === 'string') {
                const [op, ...rest] = value;
                return this.buildOperatorExpression(op, [column, ...rest], params, column);
            }
            if (value.length === 3 && typeof value[0] === 'string' && typeof value[1] === 'string') {
                return this.buildOperatorExpression(value[1], [value[0], value[2]], params, value[0]);
            }
        }

        if (typeof value === 'object' && value !== null) {
            const entries = Object.entries(value);
            if (entries.length === 1) {
                const [op, operand] = entries[0];
                if (this.isOperator(op)) {
                    return this.buildOperatorExpression(op, [column, operand], params, column);
                }
                if (this.BOOLEAN_OPERATORS.has(op)) {
                    const expression = this.buildBooleanExpression({ [op]: operand }, params, 'AND');
                    return expression;
                }
            }

            const subParts = entries.map(([op, operand]) => {
                if (this.isOperator(op)) {
                    return this.buildOperatorExpression(op, [column, operand], params, column);
                }
                return this.buildBooleanExpression({ [op]: operand }, params, 'AND');
            }).filter(Boolean);

            return this.joinBooleanParts(subParts, 'AND');
        }

        return this.buildOperatorExpression(C6C.EQUAL, [column, value], params, column);
    }

    private buildBooleanExpression(
        node: any,
        params: any[] | Record<string, any>,
        defaultOperator: 'AND' | 'OR'
    ): string {
        if (node === null || node === undefined) {
            return '';
        }

        if (Array.isArray(node)) {
            if (node.length === 0) return '';

            // Support both [left, operator, right] and [operator, left, right]
            if (node.length === 3 && typeof node[0] === 'string' && typeof node[1] === 'string') {
                const opAsSecond = this.isOperator(node[1]);
                const opAsFirst = this.isOperator(node[0]);

                if (opAsSecond) {
                    return this.buildOperatorExpression(node[1], [node[0], node[2]], params, node[0]);
                }
                if (opAsFirst) {
                    return this.buildOperatorExpression(node[0], [node[1], node[2]], params, node[1]);
                }
                // fall-through to treat as grouped expressions
            }

            const parts = node
                .map(item => this.buildBooleanExpression(item, params, 'OR'))
                .filter(Boolean);
            return this.joinBooleanParts(parts, 'OR');
        }

        if (node instanceof Map) {
            node = Object.fromEntries(node);
        }

        if (typeof node !== 'object') {
            throw new Error('Invalid WHERE clause structure.');
        }

        const entries = Object.entries(node);
        if (entries.length === 0) return '';

        if (entries.length === 1) {
            const [key, value] = entries[0];
            if (this.BOOLEAN_OPERATORS.has(key)) {
                if (!Array.isArray(value)) {
                    throw new Error(`${key} expects an array of expressions.`);
                }
                const op = this.BOOLEAN_OPERATORS.get(key)!;
                const parts = value
                    .map(item => this.buildBooleanExpression(item, params, op))
                    .filter(Boolean);
                return this.joinBooleanParts(parts, op);
            }
            if (this.isOperator(key)) {
                return this.buildOperatorExpression(key, value, params);
            }
            if (!isNaN(Number(key))) {
                return this.buildBooleanExpression(value, params, 'OR');
            }
        }

        const parts: string[] = [];
        const nonNumeric = entries.filter(([k]) => isNaN(Number(k)));
        const numeric = entries.filter(([k]) => !isNaN(Number(k)));

        for (const [key, value] of nonNumeric) {
            if (this.BOOLEAN_OPERATORS.has(key)) {
                const op = this.BOOLEAN_OPERATORS.get(key)!;
                if (!Array.isArray(value)) {
                    throw new Error(`${key} expects an array of expressions.`);
                }
                const nested = value
                    .map(item => this.buildBooleanExpression(item, params, op))
                    .filter(Boolean);
                if (nested.length) {
                    parts.push(this.joinBooleanParts(nested, op));
                }
                continue;
            }

            if (this.isOperator(key)) {
                parts.push(this.buildOperatorExpression(key, value, params));
                continue;
            }

            parts.push(this.buildLegacyColumnCondition(key, value, params));
        }

        for (const [, value] of numeric) {
            const nested = this.buildBooleanExpression(value, params, 'OR');
            if (nested) {
                parts.push(nested);
            }
        }

        return this.joinBooleanParts(parts, defaultOperator);
    }

    buildBooleanJoinedConditions(
        set: any,
        andMode: boolean = true,
        params: any[] | Record<string, any> = []
    ): string {
        const expression = this.buildBooleanExpression(set, params, andMode ? 'AND' : 'OR');
        if (!expression) return '';
        return this.ensureWrapped(expression);
    }

    buildWhereClause(whereArg: any, params: any[] | Record<string, any>): string {
        const clause = this.buildBooleanJoinedConditions(whereArg, true, params);
        if (!clause) return '';

        let trimmed = clause.trim();
        const upper = trimmed.toUpperCase();

        if (!upper.includes(' AND ') && !upper.includes(' OR ')) {
            if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
                const inner = trimmed.substring(1, trimmed.length - 1);
                const innerUpper = inner.toUpperCase();
                const requiresOuterWrap =
                    innerUpper.includes(' IN ') ||
                    innerUpper.includes(' BETWEEN ') ||
                    innerUpper.includes(' SELECT ');

                if (requiresOuterWrap) {
                    trimmed = `( ${inner.trim()} )`;
                } else {
                    trimmed = inner.trim();
                }
            }
        }

        this.config.verbose && console.log(`[WHERE] ${trimmed}`);
        return ` WHERE ${trimmed}`;
    }
}
