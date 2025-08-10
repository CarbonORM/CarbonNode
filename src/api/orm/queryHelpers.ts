// Alias a table name with a given alias
import {C6C} from "../C6Constants";

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
