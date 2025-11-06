// Alias a table name with a given alias
import {C6C} from "../C6Constants";

type DerivedTableSpec = Record<string, any> & {
    [C6C.SUBSELECT]?: Record<string, any>;
    [C6C.AS]?: string;
};

const DERIVED_TABLE_PREFIX = '__c6DerivedTable__';
const DERIVED_ID_SYMBOL = Symbol('c6DerivedTableId');

const derivedTableLookup = new Map<string, DerivedTableSpec>();
const derivedTableReverseLookup = new WeakMap<DerivedTableSpec, string>();
let derivedTableCounter = 0;

export const isDerivedTableKey = (key: string): boolean =>
    typeof key === 'string' && key.startsWith(DERIVED_TABLE_PREFIX);

export const resolveDerivedTable = (key: string): DerivedTableSpec | undefined =>
    derivedTableLookup.get(key);

export const derivedTable = <T extends DerivedTableSpec>(spec: T): T => {
    if (!spec || typeof spec !== 'object') {
        throw new Error('Derived table definition must be an object.');
    }

    const aliasRaw = spec[C6C.AS];
    if (typeof aliasRaw !== 'string' || aliasRaw.trim() === '') {
        throw new Error('Derived tables require a non-empty alias via C6C.AS.');
    }

    if (!spec[C6C.SUBSELECT] || typeof spec[C6C.SUBSELECT] !== 'object') {
        throw new Error('Derived tables require a nested SELECT payload under C6C.SUBSELECT.');
    }

    let id = derivedTableReverseLookup.get(spec);

    if (!id) {
        id = `${DERIVED_TABLE_PREFIX}${++derivedTableCounter}`;
        derivedTableReverseLookup.set(spec, id);
        derivedTableLookup.set(id, spec);
        Object.defineProperty(spec, DERIVED_ID_SYMBOL, {
            value: id,
            configurable: false,
            enumerable: false,
            writable: false
        });
    }

    const alias = aliasRaw.trim();
    derivedTableLookup.set(id!, spec);

    Object.defineProperty(spec, 'toString', {
        value: () => `${id} ${alias}`,
        configurable: true,
        enumerable: false,
        writable: true
    });

    return spec;
};

export const A = (tableName: string, alias: string): string =>
    `${tableName} ${alias}`;

// Qualify a column constant (e.g. 'property_units.parcel_id') to an alias
export const F = (qualifiedCol: string, alias: string): string =>
    `${alias}.${qualifiedCol.split('.').pop()}`;

// Equal join condition using full-qualified column constants
export const fieldEq = (leftCol: string, rightCol: string, leftAlias: string, rightAlias: string): Record<string, string> => ({
    [F(leftCol, leftAlias)]: F(rightCol, rightAlias)
});

// ST_Distance_Sphere for aliased fields
export const distSphere = (fromCol: string, toCol: string, fromAlias: string, toAlias: string): any[] =>
    [C6C.ST_DISTANCE_SPHERE, F(fromCol, fromAlias), F(toCol, toAlias)];

// Build a bounding-box expression.
//
// Arguments must be provided in `(minLng, minLat, maxLng, maxLat)` order. The
// helper does not attempt to swap or validate coordinates; if a minimum value
// is greater than its corresponding maximum value, MySQL's `ST_MakeEnvelope`
// returns `NULL`.
export const bbox = (minLng: number, minLat: number, maxLng: number, maxLat: number): any[] =>
    [C6C.ST_SRID, [C6C.ST_MAKEENVELOPE,
        [C6C.ST_POINT, minLng, minLat],
        [C6C.ST_POINT, maxLng, maxLat]], 4326];

// ST_Contains for map envelope/shape queries
export const stContains = (envelope: string, shape: string): any[] =>
    [C6C.ST_CONTAINS, envelope, shape];

