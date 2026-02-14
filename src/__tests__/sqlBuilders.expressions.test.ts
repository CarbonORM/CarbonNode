import { describe, it, expect } from 'vitest';
import { C6C } from '../constants/C6Constants';
import { SelectQueryBuilder } from '../orm/queries/SelectQueryBuilder';
import { buildParcelConfig } from './fixtures/c6.fixture';

const Property_Units = {
  TABLE_NAME: 'property_units',
  LOCATION: 'property_units.location',
  PARCEL_ID: 'property_units.parcel_id',
} as const;

const Parcel_Sales = {
  TABLE_NAME: 'parcel_sales',
  PARCEL_ID: 'parcel_sales.parcel_id',
  SALE_DATE: 'parcel_sales.sale_date',
} as const;

const Parcel_Building_Details = {
  TABLE_NAME: 'parcel_building_details',
  PARCEL_ID: 'parcel_building_details.parcel_id',
} as const;

describe('Explicit SQL expression grammar', () => {
  it('supports operator-rooted nested function expressions with explicit OR grouping', () => {
    const config = buildParcelConfig();

    const qb = new SelectQueryBuilder(config as any, {
      [C6C.SELECT]: [Property_Units.PARCEL_ID],
      [C6C.WHERE]: {
        [C6C.OR]: [
          {
            [C6C.LESS_THAN_OR_EQUAL_TO]: [
              [
                C6C.ST_DISTANCE_SPHERE,
                Property_Units.LOCATION,
                [C6C.ST_GEOMFROMTEXT, [C6C.LIT, 'POINT(39.4972468 -105.0403593)'], 4326],
              ],
              5000,
            ],
          },
          {
            [C6C.GREATER_THAN]: [
              [
                C6C.ST_AREA,
                [C6C.ST_GEOMFROMTEXT, [C6C.LIT, 'POLYGON((0 0,1 0,1 1,0 1,0 0))'], 4326],
              ],
              10000,
            ],
          },
        ],
      },
    } as any, false);

    const { sql, params } = qb.build(Property_Units.TABLE_NAME);

    expect(sql).toContain('WHERE');
    expect(sql).toMatch(/ST_DISTANCE_SPHERE\(property_units.location, ST_GEOMFROMTEXT\(\?, 4326\)\)/);
    expect(sql).toMatch(/ST_AREA\(ST_GEOMFROMTEXT\(\?, 4326\)\)/);
    expect(sql).toMatch(/<= \?/);
    expect(sql).toMatch(/> \?/);
    expect(sql).toContain('OR');
    expect(params).toEqual([
      'POINT(39.4972468 -105.0403593)',
      5000,
      'POLYGON((0 0,1 0,1 1,0 1,0 0))',
      10000,
    ]);
  });

  it('supports operator-first 3-tuple conditions in WHERE', () => {
    const config = buildParcelConfig();

    const qb = new SelectQueryBuilder(config as any, {
      [C6C.SELECT]: [Property_Units.PARCEL_ID],
      [C6C.WHERE]: {
        0: [[C6C.LESS_THAN_OR_EQUAL_TO, Property_Units.PARCEL_ID, 200]],
      },
    } as any, false);

    const { sql, params } = qb.build(Property_Units.TABLE_NAME);
    expect(sql).toMatch(/\(property_units\.parcel_id\) <= \?/);
    expect(params.slice(-1)[0]).toBe(200);
  });

  it('supports operator-first BETWEEN 3-tuple in WHERE', () => {
    const config = buildParcelConfig();

    const qb = new SelectQueryBuilder(config as any, {
      [C6C.SELECT]: [Property_Units.PARCEL_ID],
      [C6C.WHERE]: {
        0: [[C6C.BETWEEN, Parcel_Sales.SALE_DATE, [[C6C.LIT, '2021-01-01'], [C6C.LIT, '2021-12-31']]]],
      },
    } as any, false);

    const { sql, params } = qb.build(Property_Units.TABLE_NAME);
    expect(sql).toMatch(/\(parcel_sales\.sale_date\) BETWEEN \? AND \?/);
    expect(params.slice(-2)).toEqual(['2021-01-01', '2021-12-31']);
  });

  it('supports tuple-based function expressions with literal wrappers', () => {
    const config = buildParcelConfig();

    const qb = new SelectQueryBuilder(config as any, {
      [C6C.SELECT]: [Property_Units.PARCEL_ID],
      [C6C.WHERE]: {
        [C6C.LESS_THAN_OR_EQUAL_TO]: [
          [C6C.ST_DISTANCE_SPHERE, Property_Units.LOCATION, [C6C.ST_GEOMFROMTEXT, [C6C.LIT, 'POINT(39.4972468 -105.0403593)'], 4326]],
          5000,
        ],
      },
    } as any, false);

    const { sql, params } = qb.build(Property_Units.TABLE_NAME);
    expect(sql).toMatch(/ST_DISTANCE_SPHERE\(property_units\.location, ST_GEOMFROMTEXT\(\?, 4326\)\) <= \?/);
    expect(params).toEqual(['POINT(39.4972468 -105.0403593)', 5000]);
  });

  it('rejects raw function expression strings', () => {
    const config = buildParcelConfig();

    const qb = new SelectQueryBuilder(config as any, {
      [C6C.SELECT]: [Property_Units.PARCEL_ID],
      [C6C.WHERE]: {
        0: [
          [
            "ST_Distance_Sphere(property_units.location, ST_GeomFromText('POINT(39.4972468 -105.0403593)', 4326)); DROP TABLE users",
            C6C.LESS_THAN,
            1000,
          ],
        ],
      },
    } as any, false);

    expect(() => qb.build(Property_Units.TABLE_NAME)).toThrowError(/Bare string/);
  });

  it('rejects legacy positional AS syntax in function tuples', () => {
    const config = buildParcelConfig();

    const qb = new SelectQueryBuilder(config as any, {
      [C6C.SELECT]: [[C6C.COUNT, Property_Units.PARCEL_ID, C6C.AS, 'cnt']],
    } as any, false);

    expect(() => qb.build(Property_Units.TABLE_NAME)).toThrowError(/Legacy positional AS syntax/);
  });

  it('rejects legacy positional AS syntax in column tuples', () => {
    const config = buildParcelConfig();

    const qb = new SelectQueryBuilder(config as any, {
      [C6C.SELECT]: [[Property_Units.PARCEL_ID, C6C.AS, 'parcel_id_alias']],
    } as any, false);

    expect(() => qb.build(Property_Units.TABLE_NAME)).toThrowError(/Legacy positional AS syntax/);
  });

  it('rejects object-rooted function expressions', () => {
    const config = buildParcelConfig();

    const qb = new SelectQueryBuilder(config as any, {
      [C6C.SELECT]: [{ [C6C.COUNT]: [Property_Units.PARCEL_ID] }],
    } as any, false);

    expect(() => qb.build(Property_Units.TABLE_NAME)).toThrowError(/Object-rooted expressions are not supported/);
  });

  it('supports explicit AND groupings composed of nested OR clauses', () => {
    const config = buildParcelConfig();

    const qb = new SelectQueryBuilder(config as any, {
      [C6C.SELECT]: [Property_Units.PARCEL_ID],
      [C6C.WHERE]: {
        [C6C.AND]: [
          { [C6C.GREATER_THAN]: [Property_Units.PARCEL_ID, 100] },
          {
            [C6C.OR]: [
              { [C6C.BETWEEN]: [Parcel_Sales.SALE_DATE, [[C6C.LIT, '2021-01-01'], [C6C.LIT, '2022-06-30']]] },
              { [C6C.BETWEEN]: [Parcel_Sales.SALE_DATE, [[C6C.LIT, '2023-01-01'], [C6C.LIT, '2024-06-30']]] },
            ],
          },
        ],
      },
    } as any, false);

    const { sql, params } = qb.build(Property_Units.TABLE_NAME);

    expect(sql).toMatch(/\(property_units\.parcel_id\) > \?/);
    expect(sql).toMatch(/\(parcel_sales\.sale_date\) BETWEEN \? AND \?/);
    expect(sql).toContain('AND');
    expect(sql).toContain('OR');
    expect(params).toEqual([100, '2021-01-01', '2022-06-30', '2023-01-01', '2024-06-30']);
  });

  it('serializes JOIN clauses deterministically based on declaration order', () => {
    const config = buildParcelConfig();

    const qb = new SelectQueryBuilder(config as any, {
      [C6C.SELECT]: [Property_Units.PARCEL_ID],
      [C6C.JOIN]: {
        [C6C.LEFT]: {
          [Parcel_Sales.TABLE_NAME]: {
            [Parcel_Sales.PARCEL_ID]: Property_Units.PARCEL_ID,
          },
          [Parcel_Building_Details.TABLE_NAME]: {
            [Parcel_Building_Details.PARCEL_ID]: Property_Units.PARCEL_ID,
          },
        },
      },
      [C6C.WHERE]: { [Property_Units.PARCEL_ID]: [C6C.EQUAL, 1] },
    } as any, false);

    const { sql } = qb.build(Property_Units.TABLE_NAME);

    const firstJoin = sql.indexOf('JOIN `parcel_sales`');
    const secondJoin = sql.indexOf('JOIN `parcel_building_details`');

    expect(firstJoin).toBeGreaterThan(-1);
    expect(secondJoin).toBeGreaterThan(firstJoin);
  });
});
