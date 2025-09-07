import { describe, it, expect } from 'vitest';
import { C6C } from '../api/C6Constants';
import { SelectQueryBuilder } from '../api/orm/queries/SelectQueryBuilder';
import { PostQueryBuilder } from '../api/orm/queries/PostQueryBuilder';
import { UpdateQueryBuilder } from '../api/orm/queries/UpdateQueryBuilder';
import { DeleteQueryBuilder } from '../api/orm/queries/DeleteQueryBuilder';
import { buildTestConfig, buildBinaryTestConfig, buildBinaryTestConfigFqn } from './fixtures/c6.fixture';

describe('SQL Builders', () => {
  it('builds SELECT with JOIN, WHERE, GROUP BY, HAVING and default LIMIT', () => {
    const config = buildTestConfig();
    // named params disabled -> positional params array
    const qb = new SelectQueryBuilder(config as any, {
      SELECT: ['actor.first_name', [C6C.COUNT, 'actor.actor_id', C6C.AS, 'cnt']],
      JOIN: {
        [C6C.INNER]: {
          'film_actor fa': {
            'fa.actor_id': [C6C.EQUAL, 'actor.actor_id']
          }
        }
      },
      WHERE: {
        'actor.first_name': [C6C.LIKE, '%A%'],
        0: {
          'actor.actor_id': [C6C.GREATER_THAN, 10],
        }
      },
      GROUP_BY: 'actor.first_name',
      HAVING: {
        'cnt': [C6C.GREATER_THAN, 1]
      },
    } as any, false);

    const { sql, params } = qb.build('actor');

    expect(sql).toContain('SELECT actor.first_name, COUNT(actor.actor_id) AS cnt FROM `actor`');
    expect(sql).toContain('INNER JOIN `film_actor` AS `fa` ON');
    expect(sql).toContain('(actor.first_name) LIKE ?');
    expect(sql).toContain('(actor.actor_id) > ?');
    expect(sql).toContain('GROUP BY actor.first_name');
    expect(sql).toContain('HAVING');
    expect(sql.trim().endsWith('LIMIT 100')).toBe(true);
    expect(params).toEqual(['%A%', 10, 1]);
  });

  it('builds INSERT with ON DUPLICATE KEY UPDATE', () => {
    const config = buildTestConfig();
    const qb = new PostQueryBuilder(config as any, {
      [C6C.REPLACE]: {
        'actor.first_name': 'BOB',
        'actor.last_name': 'SMITH',
      },
      [C6C.UPDATE]: ['first_name', 'last_name'],
    } as any, false);

    const { sql, params } = qb.build('actor');

    expect(sql).toContain('REPLACE INTO `actor`');
    expect(sql).toContain('`first_name`, `last_name`');
    expect(sql).toContain('ON DUPLICATE KEY UPDATE `first_name` = VALUES(`first_name`), `last_name` = VALUES(`last_name`)');
    expect(params).toEqual(['BOB', 'SMITH']);
  });

  it('builds UPDATE with WHERE and pagination', () => {
    const config = buildTestConfig();
    const qb = new UpdateQueryBuilder(config as any, {
      [C6C.UPDATE]: {
        'first_name': 'ALICE',
      },
      WHERE: {
        'actor.actor_id': [C6C.EQUAL, 5],
      },
      PAGINATION: { LIMIT: 1 }
    } as any, false);

    const { sql, params } = qb.build('actor');

    expect(sql.startsWith('UPDATE `actor` SET')).toBe(true);
    expect(sql).toContain('`first_name` = ?');
    expect(sql).toContain('WHERE (actor.actor_id) = ?');
    expect(sql).toContain('LIMIT 1');
    expect(params).toEqual(['ALICE', 5]);
  });

  it('builds UPDATE when columns are fully qualified', () => {
    const config = buildTestConfig();
    const qb = new UpdateQueryBuilder(config as any, {
      [C6C.UPDATE]: {
        'actor.first_name': 'ALICIA',
      },
      WHERE: {
        'actor.actor_id': [C6C.EQUAL, 7],
      },
    } as any, false);

    const { sql, params } = qb.build('actor');

    expect(sql).toContain('`first_name` = ?');
    expect(sql).toContain('WHERE (actor.actor_id) = ?');
    expect(params).toEqual(['ALICIA', 7]);
  });

  it('builds DELETE with JOIN and WHERE', () => {
    const config = buildTestConfig();
    const qb = new DeleteQueryBuilder(config as any, {
      JOIN: {
        [C6C.INNER]: {
          'film_actor fa': {
            'fa.actor_id': [C6C.EQUAL, 'actor.actor_id']
          }
        }
      },
      WHERE: { 'actor.actor_id': [C6C.GREATER_THAN, 100] },
    } as any, false);

    const { sql, params } = qb.build('actor');

    expect(sql).toContain('DELETE `actor` FROM `actor`');
    expect(sql).toContain('INNER JOIN `film_actor` AS `fa` ON');
    expect(sql).toContain('(actor.actor_id) > ?');
    expect(params).toEqual([100]);
  });

  it('converts hex to Buffer for BINARY columns in WHERE params', () => {
    const config = buildTestConfig();
    const qb = new SelectQueryBuilder(config as any, {
      WHERE: {
        'actor.binarycol': [C6C.EQUAL, '0123456789abcdef0123456789abcdef']
      }
    } as any, false);

    const { params } = qb.build('actor');
    expect(Array.isArray(params)).toBe(true);
    const buf = (params as any[])[0];
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect((buf as Buffer).length).toBe(16);
  });

  it('converts hex to Buffer for BINARY columns in INSERT params', () => {
    const config = buildBinaryTestConfig();
    const qb = new PostQueryBuilder(config as any, {
      [C6C.INSERT]: {
        'binary_test.bin_col': '0123456789abcdef0123456789abcdef'
      }
    } as any, false);

    const { params } = qb.build('binary_test');
    const buf = (params as any[])[0];
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect((buf as Buffer).length).toBe(16);
  });

  it('converts hex to Buffer for BINARY columns in UPDATE params', () => {
    const config = buildBinaryTestConfig();
    const qb = new UpdateQueryBuilder(config as any, {
      [C6C.UPDATE]: {
        'binary_test.bin_col': '0123456789abcdef0123456789abcdef'
      },
      WHERE: { 'binary_test.id': [C6C.EQUAL, 1] }
    } as any, false);

    const { params } = qb.build('binary_test');
    const buf = (params as any[])[0];
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect((buf as Buffer).length).toBe(16);
  });
  it('converts hex to Buffer for BINARY columns in UPDATE params with unqualified column', () => {
    const config = buildBinaryTestConfig();
    const qb = new UpdateQueryBuilder(config as any, {
      [C6C.UPDATE]: {
        'bin_col': '0123456789abcdef0123456789abcdef'
      },
      WHERE: { 'binary_test.id': [C6C.EQUAL, 1] }
    } as any, false);

    const { params } = qb.build('binary_test');
    const buf = (params as any[])[0];
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect((buf as Buffer).length).toBe(16);
  });

  it('converts hex to Buffer for BINARY when TYPE_VALIDATION uses fully-qualified key (INSERT)', () => {
    const config = buildBinaryTestConfigFqn();
    const qb = new PostQueryBuilder(config as any, {
      [C6C.INSERT]: {
        'binary_test.bin_col': '0123456789abcdef0123456789abcdef'
      }
    } as any, false);

    const { params } = qb.build('binary_test');
    const buf = (params as any[])[0];
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect((buf as Buffer).length).toBe(16);
  });

  it('converts hex to Buffer for BINARY when TYPE_VALIDATION uses fully-qualified key (UPDATE)', () => {
    const config = buildBinaryTestConfigFqn();
    const qb = new UpdateQueryBuilder(config as any, {
      [C6C.UPDATE]: {
        'binary_test.bin_col': 'ffffffffffffffffffffffffffffffff'
      },
      WHERE: { 'binary_test.id': [C6C.EQUAL, 1] }
    } as any, false);

    const { params } = qb.build('binary_test');
    const buf = (params as any[])[0];
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect((buf as Buffer).length).toBe(16);
  });
});
