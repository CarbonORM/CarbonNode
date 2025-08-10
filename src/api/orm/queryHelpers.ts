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

// ST_Contains for map envelope/shape queries
export const stContains = (envelope: string, shape: string): any[] =>
    [C6C.ST_CONTAINS, envelope, shape];
