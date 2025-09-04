import { describe, it, expect } from 'vitest';
import { C6C } from '../api/C6Constants';
import { SelectQueryBuilder } from '../api/orm/queries/SelectQueryBuilder';
import { buildTestConfig } from './fixtures/c6.fixture';

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
});
