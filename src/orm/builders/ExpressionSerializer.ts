import {C6C} from "../../constants/C6Constants";

export type tSqlParams = any[] | Record<string, any>;

export interface iSerializedExpression {
    sql: string;
    isReference: boolean;
    isExpression: boolean;
    isSubSelect: boolean;
}

export interface iExpressionSerializerHooks {
    assertValidIdentifier(identifier: string, context: string): void;
    isReference(value: string): boolean;
    addParam?: (params: tSqlParams, column: string, value: any) => string;
    buildScalarSubSelect?: (subRequest: any, params: tSqlParams) => string;
    onAlias?: (alias: string) => void;
    isKnownFunction?: (functionName: string) => boolean;
}

export interface iExpressionSerializerOptions {
    hooks: iExpressionSerializerHooks;
    params?: tSqlParams;
    context: string;
    contextColumn?: string;
}

const IDENTIFIER_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/;

const isFiniteNumber = (value: any): value is number =>
    typeof value === 'number' && Number.isFinite(value);

const normalizeToken = (token: string): string => token.trim();

const ensureParams = (opts: iExpressionSerializerOptions): tSqlParams => {
    if (!opts.params) {
        throw new Error(`${opts.context} requires parameter tracking for literal bindings.`);
    }
    if (!opts.hooks.addParam) {
        throw new Error(`${opts.context} requires addParam support for literal bindings.`);
    }
    return opts.params;
};

const serializeStringReference = (
    raw: string,
    opts: iExpressionSerializerOptions,
): iSerializedExpression => {
    const value = raw.trim();

    if (value === '*') {
        return {
            sql: value,
            isReference: true,
            isExpression: false,
            isSubSelect: false,
        };
    }

    if (!opts.hooks.isReference(value)) {
        throw new Error(
            `Bare string '${raw}' is not a reference in ${opts.context}. Wrap literal strings with [C6C.LIT, value].`,
        );
    }

    if (value.includes('.')) {
        opts.hooks.assertValidIdentifier(value, opts.context);
    }

    return {
        sql: value,
        isReference: true,
        isExpression: false,
        isSubSelect: false,
    };
};

const serializeLiteralValue = (
    value: any,
    opts: iExpressionSerializerOptions,
): iSerializedExpression => {
    if (value === null || value === C6C.NULL) {
        return {
            sql: 'NULL',
            isReference: false,
            isExpression: false,
            isSubSelect: false,
        };
    }

    if (isFiniteNumber(value)) {
        return {
            sql: String(value),
            isReference: false,
            isExpression: false,
            isSubSelect: false,
        };
    }

    if (typeof value === 'boolean') {
        return {
            sql: value ? 'TRUE' : 'FALSE',
            isReference: false,
            isExpression: false,
            isSubSelect: false,
        };
    }

    if (typeof Buffer !== 'undefined' && Buffer.isBuffer && Buffer.isBuffer(value)) {
        const params = ensureParams(opts);
        return {
            sql: opts.hooks.addParam!(params, opts.contextColumn ?? '', value),
            isReference: false,
            isExpression: false,
            isSubSelect: false,
        };
    }

    throw new Error(`Unsupported literal value in ${opts.context}. Use [C6C.LIT, value] for non-reference strings or complex values.`);
};

const validateAlias = (aliasRaw: any, context: string): string => {
    if (typeof aliasRaw !== 'string' || aliasRaw.trim() === '') {
        throw new Error(`[C6C.AS] in ${context} expects a non-empty alias string.`);
    }

    const alias = aliasRaw.trim();
    if (!IDENTIFIER_REGEX.test(alias)) {
        throw new Error(`[C6C.AS] alias '${alias}' in ${context} must be a valid SQL identifier.`);
    }

    return alias;
};

const validateFunctionName = (nameRaw: any, context: string): string => {
    if (typeof nameRaw !== 'string' || nameRaw.trim() === '') {
        throw new Error(`[C6C.CALL] in ${context} expects the custom function name as a non-empty string.`);
    }

    const name = normalizeToken(nameRaw);
    if (!IDENTIFIER_REGEX.test(name)) {
        throw new Error(`[C6C.CALL] function '${name}' in ${context} must be a valid SQL identifier.`);
    }

    return name;
};

const serializeFunctionArgs = (
    args: any[],
    opts: iExpressionSerializerOptions,
): string => args
    .map((arg) => serializeSqlExpression(arg, opts).sql)
    .join(', ');

export const serializeSqlExpression = (
    value: any,
    opts: iExpressionSerializerOptions,
): iSerializedExpression => {
    if (value instanceof Map) {
        value = Object.fromEntries(value);
    }

    if (Array.isArray(value)) {
        if (value.length === 0) {
            throw new Error(`Invalid empty expression array in ${opts.context}.`);
        }

        const [headRaw, ...tail] = value;
        if (typeof headRaw !== 'string') {
            throw new Error(`Expression arrays in ${opts.context} must start with a string token.`);
        }

        const head = normalizeToken(headRaw);
        const token = head.toUpperCase();

        if (token === C6C.AS) {
            if (tail.length !== 2) {
                throw new Error(`[C6C.AS] in ${opts.context} expects [C6C.AS, expression, alias].`);
            }
            const inner = serializeSqlExpression(tail[0], opts);
            const alias = validateAlias(tail[1], opts.context);
            opts.hooks.onAlias?.(alias);

            return {
                sql: `${inner.sql} AS ${alias}`,
                isReference: false,
                isExpression: true,
                isSubSelect: inner.isSubSelect,
            };
        }

        if (token === C6C.DISTINCT) {
            if (tail.length !== 1) {
                throw new Error(`[C6C.DISTINCT] in ${opts.context} expects [C6C.DISTINCT, expression].`);
            }

            const inner = serializeSqlExpression(tail[0], opts);
            return {
                sql: `DISTINCT ${inner.sql}`,
                isReference: false,
                isExpression: true,
                isSubSelect: inner.isSubSelect,
            };
        }

        if (token === C6C.LIT || token === C6C.PARAM) {
            if (tail.length !== 1) {
                throw new Error(`[${head}] in ${opts.context} expects [${head}, value].`);
            }

            const params = ensureParams(opts);
            return {
                sql: opts.hooks.addParam!(params, opts.contextColumn ?? '', tail[0]),
                isReference: false,
                isExpression: false,
                isSubSelect: false,
            };
        }

        if (token === C6C.SUBSELECT) {
            if (tail.length !== 1) {
                throw new Error(`[C6C.SUBSELECT] in ${opts.context} expects [C6C.SUBSELECT, payload].`);
            }
            if (!opts.hooks.buildScalarSubSelect) {
                throw new Error(`Scalar subselects in ${opts.context} require subselect builder support.`);
            }
            const params = ensureParams(opts);
            const subSql = opts.hooks.buildScalarSubSelect(tail[0], params);
            return {
                sql: subSql,
                isReference: false,
                isExpression: true,
                isSubSelect: true,
            };
        }

        if (token === C6C.CALL) {
            const [fnNameRaw, ...args] = tail;
            const fnName = validateFunctionName(fnNameRaw, opts.context);
            const sqlArgs = serializeFunctionArgs(args, opts);
            return {
                sql: `${fnName}(${sqlArgs})`,
                isReference: false,
                isExpression: true,
                isSubSelect: false,
            };
        }

        if (tail.length >= 2 && String(tail[tail.length - 2]).toUpperCase() === C6C.AS) {
            throw new Error(`Legacy positional AS syntax is not supported in ${opts.context}. Use [C6C.AS, expression, alias].`);
        }

        if (opts.hooks.isKnownFunction && !opts.hooks.isKnownFunction(head)) {
            throw new Error(`Unknown SQL function '${head}' in ${opts.context}. Use [C6C.CALL, 'FUNCTION_NAME', ...args] for custom functions.`);
        }

        const sqlArgs = serializeFunctionArgs(tail, opts);
        return {
            sql: `${token}(${sqlArgs})`,
            isReference: false,
            isExpression: true,
            isSubSelect: false,
        };
    }

    if (typeof value === 'string') {
        return serializeStringReference(value, opts);
    }

    if (value && typeof value === 'object') {
        throw new Error(`Object-rooted expressions are not supported in ${opts.context}. Use tuple syntax instead.`);
    }

    return serializeLiteralValue(value, opts);
};
