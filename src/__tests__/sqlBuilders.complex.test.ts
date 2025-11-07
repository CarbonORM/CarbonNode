import { describe, it, expect } from 'vitest';
import { C6C } from '../api/C6Constants';
import { SelectQueryBuilder } from '../api/orm/queries/SelectQueryBuilder';
import { derivedTable, F } from '../api/orm/queryHelpers';
import { buildParcelConfig, buildTestConfig } from './fixtures/c6.fixture';

const Property_Units = {
  TABLE_NAME: 'property_units',
  UNIT_ID: 'property_units.unit_id',
  LOCATION: 'property_units.location',
  PARCEL_ID: 'property_units.parcel_id',
} as const;

const Parcel_Sales = {
  TABLE_NAME: 'parcel_sales',
  PARCEL_ID: 'parcel_sales.parcel_id',
  SALE_PRICE: 'parcel_sales.sale_price',
  SALE_TYPE: 'parcel_sales.sale_type',
  SALE_DATE: 'parcel_sales.sale_date',
} as const;

/**
 * Complex SELECT coverage focused on WHERE operators, JOIN chains, ORDER, and pagination.
 */
describe('SQL Builders - Complex SELECTs', () => {
  it('supports nested AND/OR groups, IN/NOT IN, BETWEEN, IS NULL', () => {
    const config = buildTestConfig();

    const qb = new SelectQueryBuilder(config as any, {
      SELECT: ['actor.actor_id', 'actor.first_name'],
      WHERE: {
        // AND root with one direct condition
        'actor.first_name': [C6C.LIKE, 'A%'],
        // OR group #1
        0: {
          'actor.actor_id': [C6C.IN, [1, 2, 3]]
        },
        // OR group #2
        1: {
          'actor.actor_id': [C6C.BETWEEN, [5, 10]]
        },
        // OR group #3
        2: {
          'actor.last_name': [C6C.IS, null]
        },
        // AND with NOT IN
        'actor.last_name': [C6C.NOT_IN, ['SMITH', 'DOE']]
      }
    } as any, false);

    const { sql, params } = qb.build('actor');

    // SQL fragments
    // noinspection SqlResolve
    expect(sql).toContain('SELECT actor.actor_id, actor.first_name FROM `actor`');
    expect(sql).toContain('WHERE');
    expect(sql).toMatch(/\(actor\.first_name\) LIKE \?/);
    expect(sql).toMatch(/\( actor\.actor_id IN \((\?,\s*){2}\?\) \)/); // 3 placeholders
    expect(sql).toMatch(/\(actor\.actor_id\) BETWEEN \? AND \?/);
    expect(sql).toMatch(/\(actor\.last_name\) IS \?/);
    expect(sql).toMatch(/\( actor\.last_name NOT IN \((\?,\s*)\?\) \)/);
    // default LIMIT
    expect(sql.trim().endsWith('LIMIT 100')).toBe(true);

    // Params order: non-numeric entries first, then grouped (implementation detail)
    // We asserted shape above; ensure counts match
    expect(params).toHaveLength(1 + 3 + 2 + 1 + 2); // LIKE + IN(3) + BETWEEN(2) + IS(1 param) + NOT IN(2)
    expect(params[0]).toBe('A%');
  });

  it('builds chained mixed JOINs with aliases', () => {
    const config = buildTestConfig();

    const qb = new SelectQueryBuilder(config as any, {
      SELECT: ['actor.actor_id'],
      JOIN: {
        [C6C.INNER]: {
          'film_actor fa': { 'fa.actor_id': [C6C.EQUAL, 'actor.actor_id'] }
        },
        [C6C.LEFT]: {
          'film_actor fb': { 'fb.actor_id': [C6C.EQUAL, 'actor.actor_id'] }
        }
      },
      WHERE: { 'actor.actor_id': [C6C.GREATER_THAN, 0] }
    } as any, false);

    const { sql, params } = qb.build('actor');

    expect(sql).toContain('FROM `actor`');
    expect(sql).toContain('INNER JOIN `film_actor` AS `fa` ON');
    expect(sql).toContain('LEFT JOIN `film_actor` AS `fb` ON');
    expect(sql).toMatch(/\(actor\.actor_id\) > \?/);
    expect(params).toEqual([0]);
  });

  it('orders by multiple fields and honors PAGE/LIMIT offset', () => {
    const config = buildTestConfig();

    const qb = new SelectQueryBuilder(config as any, {
      SELECT: ['actor.actor_id', 'actor.first_name'],
      WHERE: { 'actor.actor_id': [C6C.GREATER_THAN, 10] },
      PAGINATION: {
        [C6C.ORDER]: {
          'actor.last_name': 'ASC',
          'actor.first_name': 'DESC'
        },
        [C6C.LIMIT]: 10,
        [C6C.PAGE]: 3
      }
    } as any, false);

    const { sql, params } = qb.build('actor');

    expect(sql).toContain('ORDER BY actor.last_name ASC, actor.first_name DESC');
    expect(sql.trim().endsWith('LIMIT 20, 10')).toBe(true); // (page-1)*limit, limit
    expect(params).toEqual([10]);
  });

  it('supports DISTINCT and HAVING on aggregated alias', () => {
    const config = buildTestConfig();

    const qb = new SelectQueryBuilder(config as any, {
      SELECT: [[C6C.DISTINCT, 'actor.first_name'], [C6C.COUNT, 'actor.actor_id', C6C.AS, 'cnt']],
      GROUP_BY: 'actor.first_name',
      HAVING: { 'cnt': [C6C.GREATER_THAN, 1] }
    } as any, false);

    const { sql, params } = qb.build('actor');

    // noinspection SqlResolve
    expect(sql).toContain('SELECT DISTINCT actor.first_name, COUNT(actor.actor_id) AS cnt FROM `actor`');
    expect(sql).toContain('GROUP BY actor.first_name');
    expect(sql).toContain('HAVING');
    expect(params).toEqual([1]);
  });

  it('supports MATCH_AGAINST fulltext condition variants', () => {
    const config = buildTestConfig();

    const qb = new SelectQueryBuilder(config as any, {
      SELECT: ['actor.actor_id'],
      WHERE: {
        'actor.first_name': [C6C.MATCH_AGAINST, ['alpha beta', 'BOOLEAN']]
      }
    } as any, false);

    const { sql, params } = qb.build('actor');

    expect(sql).toMatch(/MATCH\(actor\.first_name\) AGAINST\(\? IN BOOLEAN MODE\)/);
    expect(params).toEqual(['alpha beta']);
  });

  it('supports IS NOT NULL via object mapping syntax', () => {
    const config = buildTestConfig();

    const qb = new SelectQueryBuilder(config as any, {
      SELECT: ['actor.actor_id'],
      WHERE: { 'actor.last_name': [C6C.IS_NOT, C6C.NULL] }
    } as any, false);

    const { sql, params } = qb.build('actor');
    expect(sql).toMatch(/\(actor\.last_name\) IS NOT \?/);
    expect(params).toEqual([null]);
  });

  it('supports IS NOT NULL via numeric-key triple array syntax', () => {
    const config = buildTestConfig();

    const qb = new SelectQueryBuilder(config as any, {
      SELECT: ['actor.actor_id'],
      WHERE: { 0: ['actor.last_name', C6C.IS_NOT, C6C.NULL] }
    } as any, false);

    const { sql, params } = qb.build('actor');
    expect(sql).toMatch(/\(actor\.last_name\) IS NOT \?/);
    expect(params).toEqual([null]);
  });

  it('serializes derived table joins with parameter hoisting and alias scoping', () => {
    const config = buildParcelConfig();
    const unitIdParam = 42;
    const ALLOWED_SALE_TYPES = ['A', 'B', 'C', 'D', 'E', 'F'];
    const parsedDateRanges = [
      { start: '2023-01-01', end: '2023-01-31' },
      { start: '2023-02-01', end: '2023-02-28' },
    ];

    const puTarget = derivedTable({
      [C6C.SUBSELECT]: {
        [C6C.SELECT]: [Property_Units.LOCATION],
        [C6C.FROM]: Property_Units.TABLE_NAME,
        [C6C.WHERE]: { [Property_Units.UNIT_ID]: [C6C.EQUAL, unitIdParam] },
        [C6C.LIMIT]: 1,
      },
      [C6C.AS]: 'pu_target',
    });

    const innerJoin: any = {
      'parcel_sales ps': {
        'ps.parcel_id': [C6C.EQUAL, Property_Units.PARCEL_ID],
      },
      'parcel_building_details pbd': {
        'pbd.parcel_id': [C6C.EQUAL, Property_Units.PARCEL_ID],
      },
      [puTarget as any]: {},
    };

    const qb = new SelectQueryBuilder(config as any, {
      [C6C.SELECT]: [
        Property_Units.UNIT_ID,
        Property_Units.LOCATION,
        F(Property_Units.LOCATION, 'pu_target'),
      ],
      [C6C.JOIN]: {
        [C6C.INNER]: innerJoin,
      },
      [C6C.WHERE]: {
        [Property_Units.UNIT_ID]: [C6C.NOT_EQUAL, unitIdParam],
        [Parcel_Sales.SALE_PRICE]: [C6C.NOT_EQUAL, 0],
        [Parcel_Sales.SALE_TYPE]: { [C6C.IN]: ALLOWED_SALE_TYPES },
        0: parsedDateRanges.map(({ start, end }) => ({
          [Parcel_Sales.SALE_DATE]: [C6C.BETWEEN, [start, end]],
        })),
      },
      [C6C.PAGINATION]: {
        [C6C.LIMIT]: 200,
        [C6C.ORDER]: {
          [C6C.ST_DISTANCE_SPHERE]: [
            Property_Units.LOCATION,
            F(Property_Units.LOCATION, 'pu_target'),
          ],
        },
      },
    } as any, false);

    const { sql, params } = qb.build(Property_Units.TABLE_NAME);

    // noinspection SqlResolve
    expect(sql).toContain('SELECT property_units.unit_id, property_units.location, pu_target.location FROM `property_units`');
    expect(sql).toContain('INNER JOIN `parcel_sales` AS `ps`');
    expect(sql).toContain('INNER JOIN `parcel_building_details` AS `pbd`');
    expect(sql).toMatch(/INNER JOIN \(\s+SELECT property_units\.location/);
    expect(sql).toContain('WHERE (property_units.unit_id) <> ?');
    expect(sql).toContain('AND (parcel_sales.sale_price) <> ?');
    expect(sql).toContain('ORDER BY ST_Distance_Sphere(property_units.location, pu_target.location)');
    expect(sql.trim().endsWith('LIMIT 200')).toBe(true);

    expect(params).toEqual([
      unitIdParam,
      unitIdParam,
      0,
      ...ALLOWED_SALE_TYPES,
      parsedDateRanges[0].start,
      parsedDateRanges[0].end,
      parsedDateRanges[1].start,
      parsedDateRanges[1].end,
    ]);
  });

  it('supports derived joins with ON clauses referencing the alias', () => {
    const config = buildParcelConfig();

    const recentSales = derivedTable({
      [C6C.SUBSELECT]: {
        [C6C.SELECT]: [Parcel_Sales.PARCEL_ID],
        [C6C.FROM]: Parcel_Sales.TABLE_NAME,
        [C6C.WHERE]: { [Parcel_Sales.SALE_PRICE]: [C6C.GREATER_THAN, 50000] },
        [C6C.LIMIT]: 1,
      },
      [C6C.AS]: 'recent_sales',
    });

    const innerJoin: any = {
      [recentSales as any]: {
        'recent_sales.parcel_id': [C6C.EQUAL, Property_Units.PARCEL_ID],
      },
    };

    const qb = new SelectQueryBuilder(config as any, {
      [C6C.SELECT]: [Property_Units.UNIT_ID],
      [C6C.JOIN]: { [C6C.INNER]: innerJoin },
      [C6C.WHERE]: { [Property_Units.UNIT_ID]: [C6C.GREATER_THAN, 1] },
    } as any, false);

    const { sql, params } = qb.build(Property_Units.TABLE_NAME);

    expect(sql).toMatch(/INNER JOIN \(\s+SELECT parcel_sales\.parcel_id/);
    expect(sql).toContain('ON ((recent_sales.parcel_id) = property_units.parcel_id)');
    expect(params[0]).toBe(50000);
  });

  it('throws when referencing an unknown alias in SELECT expressions', () => {
    const config = buildParcelConfig();

    const qb = new SelectQueryBuilder(config as any, {
      [C6C.SELECT]: [F(Property_Units.LOCATION, 'missing_alias')],
    } as any, false);

    expect(() => qb.build(Property_Units.TABLE_NAME)).toThrowError(/Unknown table or alias 'missing_alias'/);
  });

  it('orders by distance to a literal ST_Point with numeric string coords', () => {
    const config = buildParcelConfig();

    const qb = new SelectQueryBuilder(config as any, {
      [C6C.SELECT]: [Property_Units.UNIT_ID],
      [C6C.PAGINATION]: {
        [C6C.LIMIT]: 200,
        [C6C.ORDER]: {
          [C6C.ST_DISTANCE_SPHERE]: [
            Property_Units.LOCATION,
            [C6C.ST_POINT, ['-104.8967729', '39.3976764']],
          ],
        },
      },
    } as any, false);

    const { sql } = qb.build(Property_Units.TABLE_NAME);
    expect(sql).toContain('ORDER BY ST_Distance_Sphere(property_units.location, ST_POINT(-104.8967729, 39.3976764))');
  });

  it('orders by distance to ST_SRID(ST_Point(lng, lat), 4326)', () => {
    const config = buildParcelConfig();

    const qb = new SelectQueryBuilder(config as any, {
      [C6C.SELECT]: [Property_Units.UNIT_ID],
      [C6C.PAGINATION]: {
        [C6C.LIMIT]: 50,
        [C6C.ORDER]: {
          [C6C.ST_DISTANCE_SPHERE]: [
            Property_Units.LOCATION,
            [C6C.ST_SRID, [C6C.ST_POINT, [10, 20]], 4326],
          ],
        },
      },
    } as any, false);

    const { sql } = qb.build(Property_Units.TABLE_NAME);
    expect(sql).toContain('ORDER BY ST_Distance_Sphere(property_units.location, ST_SRID(ST_POINT(10, 20), 4326))');
  });

  it('orders by distance using placeholders via PARAM inside nested ST_Point', () => {
    const config = buildParcelConfig();

    const qb = new SelectQueryBuilder(config as any, {
      [C6C.SELECT]: [Property_Units.UNIT_ID],
      [C6C.PAGINATION]: {
        [C6C.LIMIT]: 25,
        [C6C.ORDER]: {
          [C6C.ST_DISTANCE_SPHERE]: [
            Property_Units.LOCATION,
            [C6C.ST_SRID, [C6C.ST_POINT, [[C6C.PARAM, 10], [C6C.PARAM, 20]]], 4326],
          ],
        },
      },
    } as any, false);

    const { sql, params } = qb.build(Property_Units.TABLE_NAME);
    expect(sql).toContain('ORDER BY ST_Distance_Sphere(property_units.location, ST_SRID(ST_POINT(?, ?), 4326))');
    expect(params.slice(-2)).toEqual([10, 20]);
  });

  it('orders by distance using named params via PARAM inside nested ST_Point', () => {
    const config = buildParcelConfig();

    const qb = new SelectQueryBuilder(config as any, {
      [C6C.SELECT]: [Property_Units.UNIT_ID],
      [C6C.PAGINATION]: {
        [C6C.LIMIT]: 25,
        [C6C.ORDER]: {
          [C6C.ST_DISTANCE_SPHERE]: [
            Property_Units.LOCATION,
            [C6C.ST_SRID, [C6C.ST_POINT, [[C6C.PARAM, 10], [C6C.PARAM, 20]]], 4326],
          ],
        },
      },
    } as any, true);

    const { sql, params } = qb.build(Property_Units.TABLE_NAME);
    expect(sql).toMatch(/ST_SRID\(ST_POINT\(:param0, :param1\), 4326\)/);
    expect(params).toEqual({ param0: 10, param1: 20 });
  });

  it('orders by distance to ST_GeomFromText(WKT, 4326) using PARAM for WKT', () => {
    const config = buildParcelConfig();

    const qb = new SelectQueryBuilder(config as any, {
      [C6C.SELECT]: [Property_Units.UNIT_ID],
      [C6C.PAGINATION]: {
        [C6C.LIMIT]: 10,
        [C6C.ORDER]: {
          [C6C.ST_DISTANCE_SPHERE]: [
            Property_Units.LOCATION,
            [C6C.ST_GEOMFROMTEXT, [[C6C.PARAM, 'POINT(-104.8967729 39.3976764)'], 4326]],
          ],
        },
      },
    } as any, false);

    const { sql, params } = qb.build(Property_Units.TABLE_NAME);
    expect(sql).toContain('ORDER BY ST_Distance_Sphere(property_units.location, ST_GEOMFROMTEXT(?, 4326))');
    expect(params.slice(-1)[0]).toBe('POINT(-104.8967729 39.3976764)');
  });

  it('leaves normal table joins unaffected', () => {
    const config = buildTestConfig();

    const qb = new SelectQueryBuilder(config as any, {
      [C6C.SELECT]: ['actor.actor_id'],
      [C6C.JOIN]: {
        [C6C.INNER]: {
          'film_actor fa': { 'fa.actor_id': [C6C.EQUAL, 'actor.actor_id'] },
        },
      },
    } as any, false);

    const { sql } = qb.build('actor');
    expect(sql).toContain('INNER JOIN `film_actor` AS `fa` ON ((fa.actor_id) = actor.actor_id)');
  });

  it('supports scalar subselects in SELECT and WHERE clauses', () => {
    const config = buildParcelConfig();

    const qb = new SelectQueryBuilder(config as any, {
      [C6C.SELECT]: [
        Property_Units.UNIT_ID,
        [
          C6C.SUBSELECT,
          {
            [C6C.SELECT]: [[C6C.COUNT, Parcel_Sales.PARCEL_ID]],
            [C6C.FROM]: Parcel_Sales.TABLE_NAME,
            [C6C.WHERE]: { [Parcel_Sales.SALE_PRICE]: [C6C.GREATER_THAN, 0] },
          },
          C6C.AS,
          'sale_count',
        ],
      ],
      [C6C.WHERE]: {
        [Property_Units.UNIT_ID]: [
          C6C.IN,
          [
            C6C.SUBSELECT,
            {
              [C6C.SELECT]: [Parcel_Sales.PARCEL_ID],
              [C6C.FROM]: Parcel_Sales.TABLE_NAME,
              [C6C.WHERE]: { [Parcel_Sales.SALE_PRICE]: [C6C.GREATER_THAN, 5000] },
            },
          ],
        ],
      },
    } as any, false);

    const { sql, params } = qb.build(Property_Units.TABLE_NAME);

    expect(sql).toContain('SELECT property_units.unit_id, (SELECT COUNT(parcel_sales.parcel_id)');
    expect(sql).toContain('WHERE ( property_units.unit_id IN (SELECT parcel_sales.parcel_id');
    expect(params).toContain(5000);
  });
});
