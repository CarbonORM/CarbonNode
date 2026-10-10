import {C6C} from '../constants/C6Constants';
import type {iRestMethods} from '../types/ormInterfaces';

/** Required, non-null fields that identify one row. */
export type PK_shape<T, Keys extends keyof T> = {[K in Keys]-?: NonNullable<T[K]>};

export class CompositePrimaryKeyMissingColumns extends Error {
    readonly code = 'CompositePrimaryKeyMissingColumns';
    readonly status = 422;

    constructor(
        readonly table: string,
        readonly requiredColumns: readonly string[],
        readonly missingColumns: readonly string[],
    ) {
        super(`CompositePrimaryKeyMissingColumns: Table (${table}) requires all primary key columns [${requiredColumns.join(', ')}]. Missing: [${missingColumns.join(', ')}]`);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = this.code;
    }
}

const metadata = new Set<string>([
    C6C.DB, C6C.SELECT, C6C.UPDATE, C6C.DELETE, C6C.WHERE, C6C.JOIN,
    C6C.ORDER, C6C.GROUP_BY, C6C.HAVING, C6C.INDEX_HINTS, C6C.PAGINATION,
    C6C.INSERT, C6C.REPLACE, 'dataInsertMultipleRows', 'cacheResults',
    'skipReactBootstrap', 'fetchDependencies', 'debug', 'success', 'error',
]);

/** Keep compound identities together before choosing a SQL or HTTP builder. */
export function normalizePrimaryKeyRequest(
    method: iRestMethods,
    request: any,
    model: {TABLE_NAME: string; PRIMARY: readonly string[]; PRIMARY_SHORT: readonly string[]; COLUMNS: Record<string, string>},
): any {
    if (!request || typeof request !== 'object') return request;
    if (Array.isArray(request)) {
        if (model.PRIMARY_SHORT.length > 1 && method === C6C.POST) {
            return request.map(row => normalizePrimaryKeyRequest(method, row, model));
        }
        return request;
    }
    const table = model.TABLE_NAME as string;
    const nested = request[table];
    let result = request;
    // Tables such as city and country also have scalar columns named after the table.
    if (nested !== undefined && !Object.values(model.COLUMNS).includes(table)) {
        if (!nested || typeof nested !== 'object' || Array.isArray(nested)) {
            throw new Error(`Table payload (${table}) must be an object.`);
        }
        result = {...nested, ...request};
        delete result[table];
    }
    const shorts = model.PRIMARY_SHORT ?? [];
    if (shorts.length < 2) return result;
    if (method === C6C.POST && Array.isArray(result.dataInsertMultipleRows)) {
        return {...result, dataInsertMultipleRows: result.dataInsertMultipleRows.map(row =>
            normalizePrimaryKeyRequest(method, row, model))};
    }
    const fulls = shorts.map((short, index) => {
        const primary = model.PRIMARY[index];
        return primary?.includes('.') ? primary : `${table}.${short}`;
    });
    const source = result[C6C.INSERT] ?? result[C6C.REPLACE] ?? result;
    const values = shorts.map((short, index) => source[fulls[index]] ?? source[short]);
    const missing = shorts.filter((_short, index) => values[index] === undefined || values[index] === null);
    const hasKey = values.some(value => value !== undefined && value !== null);
    // Explicit predicates retain the existing expression grammar and bulk-query semantics.
    if (result[C6C.WHERE] !== undefined && method !== C6C.POST
        && result[C6C.INSERT] === undefined && result[C6C.REPLACE] === undefined) return result;
    if (method === C6C.GET && !hasKey) return result;
    if (missing.length) throw new CompositePrimaryKeyMissingColumns(table, shorts, missing);

    if (method === C6C.POST) return result;
    // Composite PUT without a predicate is an upsert; legacy UPDATE + WHERE stays an update.
    if (method === C6C.PUT && (result[C6C.UPDATE] === undefined || Array.isArray(result[C6C.UPDATE]))) {
        const insert = Object.fromEntries(Object.entries(source).filter(([key]) => !metadata.has(key)));
        const updates = result[C6C.UPDATE] ?? Object.keys(insert).filter(key => !shorts.includes(model.COLUMNS[key] ?? key));
        return {
            ...Object.fromEntries(Object.entries(result).filter(([key]) => metadata.has(key))),
            [C6C.INSERT]: insert,
            [C6C.UPDATE]: updates.length ? updates : [shorts[0]],
        };
    }
    const where = Object.fromEntries(fulls.map((full, index) => [full, [C6C.EQUAL, [C6C.LIT, values[index]]]]));
    const data = Object.fromEntries(Object.entries(result).filter(([key]) =>
        !metadata.has(key) && !shorts.includes(model.COLUMNS[key] ?? key)));
    const controls = Object.fromEntries(Object.entries(result).filter(([key]) => metadata.has(key)));
    if (method === C6C.GET) return {...controls, [C6C.WHERE]: where};
    if (method === C6C.DELETE) return {...controls, [C6C.DELETE]: true, [C6C.WHERE]: where};
    const update = {...data, ...(result[C6C.UPDATE] ?? {})};
    if (!Object.keys(update).length) throw new Error(`Update for table (${table}) requires at least one field.`);
    return {...controls, [C6C.UPDATE]: update, [C6C.WHERE]: where};
}
