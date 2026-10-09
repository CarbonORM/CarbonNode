import {C6C} from '../constants/C6Constants';

export interface QueryLimits {
    maxDepth: number;
    maxNodes: number;
    maxListItems: number;
    maxInputBytes: number;
    maxSqlBytes: number;
    maxParams: number;
}
export const DEFAULT_QUERY_LIMITS: Readonly<QueryLimits> = Object.freeze({
    maxDepth: 32, maxNodes: 10000, maxListItems: 1000,
    maxInputBytes: 1024 * 1024, maxSqlBytes: 256 * 1024, maxParams: 1000,
});
export function queryLimits(overrides?: Partial<QueryLimits>): QueryLimits {
    const limits = {...DEFAULT_QUERY_LIMITS, ...overrides};
    for (const value of Object.values(limits)) {
        if (!Number.isSafeInteger(value) || value < 1) throw new Error('Invalid trusted query limit.');
    }
    return limits;
}
const forbiddenFunctions = new Set([
    'SLEEP', 'PG_SLEEP', 'PG_SLEEP_FOR', 'PG_SLEEP_UNTIL', 'BENCHMARK', 'LOAD_FILE',
    'GET_LOCK', 'RELEASE_LOCK', 'PG_READ_FILE', 'PG_READ_BINARY_FILE', 'PG_LS_DIR',
    'DBLINK', 'DBLINK_EXEC', 'PG_TERMINATE_BACKEND', 'PG_CANCEL_BACKEND',
]);
export interface QuerySafetyConfig {
    maxResponseBytes?: number;
    queryLimits?: Partial<QueryLimits>;
    /** Set by the server adapter, never by request JSON. */
    restFunctionAllowlist?: readonly string[];
    enforceRestFunctionPolicy?: boolean;
}
export function validateResponseBudget(data: unknown, config: QuerySafetyConfig): void {
    const max = config.maxResponseBytes ?? 8 * 1024 * 1024;
    if (!Number.isSafeInteger(max) || max < 1) throw new Error('Invalid trusted response budget.');
    const serialized = JSON.stringify(data);
    if (serialized && (serialized.length > max || new TextEncoder().encode(serialized).length > max)) {
        throw new Error('Response byte budget exceeded.');
    }
}
export function safePagination(pagination: any, config: {maxPageSize?: number; maxPageOffset?: number}): {LIMIT: number; PAGE: number} {
    const integer = (value: unknown): number => {
        if (typeof value !== 'number' && !(typeof value === 'string' && /^\d+$/.test(value))) throw new Error('Pagination requires positive safe integers.');
        const number = Number(value);
        if (!Number.isSafeInteger(number) || number < 1) throw new Error('Pagination requires positive safe integers.');
        return number;
    };
    if (pagination != null && (typeof pagination !== 'object' || Array.isArray(pagination))) throw new Error('PAGINATION must be an object.');
    const max = integer(config.maxPageSize ?? 1000);
    const maxOffset = integer(config.maxPageOffset ?? 100000);
    const LIMIT = integer(pagination?.LIMIT ?? Math.min(100, max));
    const PAGE = integer(pagination?.PAGE ?? 1);
    const offset = (PAGE - 1) * LIMIT;
    if (LIMIT > max || !Number.isSafeInteger(offset) || offset > maxOffset) throw new Error('Pagination exceeds trusted row or offset limits.');
    return {LIMIT, PAGE};
}
/** Iterative validation covers the complete tree, including nested subqueries and literal data. */
export function validateQueryRequest(request: unknown, config: QuerySafetyConfig = {}): void {
    const limits = queryLimits(config.queryLimits);
    const stack: {value: unknown; depth: number; literal: boolean; exit?: boolean}[] = [{value: request, depth: 0, literal: false}];
    const seen = new WeakSet<object>();
    let nodes = 0, bytes = 0;
    const countString = (value: string) => {
        if (value.length > limits.maxInputBytes) throw new Error('Query input byte budget exceeded.');
        bytes += new TextEncoder().encode(value).length;
        if (bytes > limits.maxInputBytes) throw new Error('Query input byte budget exceeded.');
    };
    while (stack.length) {
        const {value, depth, literal, exit} = stack.pop()!;
        if (exit) {seen.delete(value as object); continue;}
        if (++nodes > limits.maxNodes || depth > limits.maxDepth) throw new Error('Query complexity budget exceeded.');
        if (typeof value === 'string') {countString(value); continue;}
        if (!value || typeof value !== 'object') continue;
        if (ArrayBuffer.isView(value)) {bytes += value.byteLength; if (bytes > limits.maxInputBytes) throw new Error('Query input byte budget exceeded.'); continue;}
        if (value instanceof Date) continue;
        if (seen.has(value)) throw new Error('Query must be an acyclic tree.');
        seen.add(value);
        stack.push({value, depth, literal, exit: true});
        const children = value instanceof Map ? Array.from(value.entries()).flat() : Object.values(value);
        if (children.length > limits.maxListItems || nodes + stack.length + children.length > limits.maxNodes) {
            throw new Error('Query collection budget exceeded.');
        }
        if (!Array.isArray(value) && !(value instanceof Map)) Object.keys(value).forEach(countString);
        // Inspect only string tokens: coercing nested arrays recurses before the depth guard.
        const head = Array.isArray(value) && typeof value[0] === 'string' ? value[0].trim().toUpperCase() : '';
        if (Array.isArray(value) && !literal && config.enforceRestFunctionPolicy) {
            const name = head === C6C.CALL ? (typeof value[1] === 'string' ? value[1].trim().toUpperCase() : '') : head;
            if (forbiddenFunctions.has(name) || (head === C6C.CALL &&
                !(config.restFunctionAllowlist ?? []).some(allowed => allowed.trim().toUpperCase() === name))) {
                throw new Error('Database function is not approved for this REST endpoint.');
            }
        }
        const childLiteral = literal || head === C6C.LIT;
        for (const child of children) stack.push({value: child, depth: depth + 1, literal: childLiteral});
    }
}
export function validateSqlBudget(sql: string, params: unknown[] | Record<string, unknown>, config: QuerySafetyConfig): void {
    const limits = queryLimits(config.queryLimits);
    if (new TextEncoder().encode(sql).length > limits.maxSqlBytes || Object.keys(params).length > limits.maxParams) {
        throw new Error('SQL statement budget exceeded.');
    }
}
