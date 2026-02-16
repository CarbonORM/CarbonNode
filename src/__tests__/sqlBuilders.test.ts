import { describe, it, expect, vi } from 'vitest';
import { C6C } from '../constants/C6Constants';
import { SelectQueryBuilder } from '../orm/queries/SelectQueryBuilder';
import { PostQueryBuilder } from '../orm/queries/PostQueryBuilder';
import { UpdateQueryBuilder } from '../orm/queries/UpdateQueryBuilder';
import { DeleteQueryBuilder } from '../orm/queries/DeleteQueryBuilder';
import { alias, call, distinct, fn, lit, order } from '../orm/queryHelpers';
import { buildTestConfig, buildBinaryTestConfig, buildBinaryTestConfigFqn, buildTemporalTestConfig } from './fixtures/c6.fixture';

describe('SQL Builders', () => {
  it('builds SELECT with JOIN, WHERE, GROUP BY, HAVING and default LIMIT', () => {
    const config = buildTestConfig();
    // named params disabled -> positional params array
    const qb = new SelectQueryBuilder(config as any, {
      SELECT: ['actor.first_name', [C6C.AS, [C6C.COUNT, 'actor.actor_id'], 'cnt']],
      JOIN: {
        [C6C.INNER]: {
          'film_actor fa': {
            'fa.actor_id': [C6C.EQUAL, 'actor.actor_id']
          }
        }
      },
      WHERE: {
        'actor.first_name': [C6C.LIKE, [C6C.LIT, '%A%']],
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

  it('logs SELECT aggregate expressions at DEBUG level', () => {
    const config = buildTestConfig();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const qb = new SelectQueryBuilder(config as any, {
      SELECT: [[C6C.AS, [C6C.COUNT, 'actor.actor_id'], 'cnt']],
    } as any, false);

    qb.build('actor');

    const logLines = logSpy.mock.calls
      .map((call) => call[0])
      .filter((entry): entry is string => typeof entry === 'string');
    const selectLine = logLines.find((line) => line.includes('[SELECT]'));

    expect(selectLine).toBeDefined();
    expect(selectLine).toContain('COUNT(actor.actor_id) AS cnt');
    logSpy.mockRestore();
  });

  it('supports custom functions through C6C.CALL and binds string literals', () => {
    const config = buildTestConfig();
    const qb = new SelectQueryBuilder(config as any, {
      SELECT: [[C6C.AS, [C6C.CALL, 'COALESCE', [C6C.LIT, 'fallback'], 'actor.first_name'], 'resolved_name']],
    } as any, false);

    const { sql, params } = qb.build('actor');
    expect(sql).toContain('COALESCE(?, actor.first_name) AS resolved_name');
    expect(params).toEqual(['fallback']);
  });

  it('supports helper builders for fn/call/as/distinct/lit/order', () => {
    const config = buildTestConfig();
    const qb = new SelectQueryBuilder(config as any, {
      SELECT: [
        alias(distinct('actor.first_name'), 'distinct_name'),
        alias(fn(C6C.COUNT, 'actor.actor_id'), 'cnt'),
        call('COALESCE', lit('N/A'), 'actor.last_name'),
      ],
      PAGINATION: {
        [C6C.ORDER]: [order(fn(C6C.COUNT, 'actor.actor_id'), 'DESC')],
        [C6C.LIMIT]: 5,
      },
    } as any, false);

    const { sql, params } = qb.build('actor');
    expect(sql).toContain('DISTINCT actor.first_name AS distinct_name');
    expect(sql).toContain('COUNT(actor.actor_id) AS cnt');
    expect(sql).toContain('COALESCE(?, actor.last_name)');
    expect(sql).toContain('ORDER BY COUNT(actor.actor_id) DESC');
    expect(params).toEqual(['N/A']);
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

  it('stringifies plain object inserts for JSON columns', () => {
    const config = buildTestConfig();
    const payload = { hello: 'world', nested: { ok: true } };
    const qb = new PostQueryBuilder(config as any, {
      [C6C.INSERT]: {
        'actor.json_data': payload,
      },
    } as any, false);

    const { sql, params } = qb.build('actor');

    expect(sql).toContain('`json_data`');
    expect(params).toEqual([JSON.stringify(payload)]);
  });

  it('builds multi-row INSERT from dataInsertMultipleRows', () => {
    const config = buildTestConfig();
    const qb = new PostQueryBuilder(config as any, {
      dataInsertMultipleRows: [
        {
          'actor.first_name': 'ALICE',
          'actor.last_name': 'ONE',
        },
        {
          'actor.first_name': 'BOB',
          'actor.last_name': 'TWO',
        },
      ],
    } as any, false);

    const { sql, params } = qb.build('actor');

    expect(sql).toContain('INSERT INTO `actor`');
    expect(sql).toContain('`first_name`, `last_name`');
    expect(sql).toContain(') VALUES');
    expect(sql).toContain('),');
    expect(params).toEqual(['ALICE', 'ONE', 'BOB', 'TWO']);
  });

  it('builds multi-row INSERT from direct array request syntax', () => {
    const config = buildTestConfig();
    const qb = new PostQueryBuilder(config as any, [
      {
        'actor.first_name': 'ALICE',
        'actor.last_name': 'ONE',
      },
      {
        'actor.first_name': 'BOB',
        'actor.last_name': 'TWO',
      },
    ] as any, false);

    const { sql, params } = qb.build('actor');

    expect(sql).toContain('INSERT INTO `actor`');
    expect(sql).toContain('`first_name`, `last_name`');
    expect(sql).toContain(') VALUES');
    expect(sql).toContain('),');
    expect(params).toEqual(['ALICE', 'ONE', 'BOB', 'TWO']);
  });

  it('stringifies dotted-key JSON payloads for JSON columns on UPDATE', () => {
    const config = buildTestConfig();
    const payload = { 'section1.preparedBy': 'Prepared by Assessorly, Co.' };
    const qb = new UpdateQueryBuilder(config as any, {
      [C6C.UPDATE]: {
        'actor.json_data': payload,
      },
      WHERE: {
        'actor.actor_id': [C6C.EQUAL, 5],
      }
    } as any, false);

    const { params } = qb.build('actor');

    expect(params).toEqual([JSON.stringify(payload), 5]);
  });

  it('throws on operator-shaped insert payloads', () => {
    const config = buildTestConfig();
    const qb = new PostQueryBuilder(config as any, {
      [C6C.INSERT]: {
        'actor.first_name': {
          [C6C.GREATER_THAN]: 'ALICE',
        },
      },
    } as any, false);

    expect(() => qb.build('actor')).toThrowError(/requires two operands/);
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

  it('supports expression tuples in UPDATE values', () => {
    const config = buildTestConfig();
    const qb = new UpdateQueryBuilder(config as any, {
      [C6C.UPDATE]: {
        'actor.first_name': [C6C.CONCAT, [C6C.LIT, 'Mr. '], 'actor.last_name'],
      },
      WHERE: {
        'actor.actor_id': [C6C.EQUAL, 7],
      },
    } as any, false);

    const { sql, params } = qb.build('actor');
    expect(sql).toContain('`first_name` = CONCAT(?, actor.last_name)');
    expect(params).toEqual(['Mr. ', 7]);
  });

  it('supports expression tuples in INSERT values', () => {
    const config = buildTestConfig();
    const qb = new PostQueryBuilder(config as any, {
      [C6C.INSERT]: {
        'actor.first_name': [C6C.CONCAT, [C6C.LIT, 'HEL'], [C6C.LIT, 'LO']],
        'actor.last_name': 'SMITH',
      },
    } as any, false);

    const { sql, params } = qb.build('actor');
    expect(sql).toContain('CONCAT(?, ?)');
    expect(params).toEqual(['HEL', 'LO', 'SMITH']);
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
        'actor.binarycol': [C6C.EQUAL, [C6C.LIT, '0123456789abcdef0123456789abcdef']]
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

  it('serializes ISO-8601 strings for TIMESTAMP columns in INSERT params', () => {
    const config = buildTemporalTestConfig();
    const qb = new PostQueryBuilder(config as any, {
      [C6C.INSERT]: {
        'events.read_at': '2026-02-16T21:27:06.679Z'
      }
    } as any, false);

    const { params } = qb.build('events');
    expect(params).toEqual(['2026-02-16 21:27:06.679']);
  });

  it('serializes ISO-8601 strings for DATE columns in UPDATE params', () => {
    const config = buildTemporalTestConfig();
    const qb = new UpdateQueryBuilder(config as any, {
      [C6C.UPDATE]: {
        'events.read_on': '2026-02-16T21:27:06.679Z'
      },
      WHERE: { 'events.id': [C6C.EQUAL, 1] }
    } as any, false);

    const { params } = qb.build('events');
    expect(params).toEqual(['2026-02-16', 1]);
  });

  it('serializes offset ISO-8601 strings for TIME columns in WHERE params', () => {
    const config = buildTemporalTestConfig();
    const qb = new SelectQueryBuilder(config as any, {
      WHERE: {
        'events.read_time': [C6C.EQUAL, [C6C.LIT, '2026-02-16T16:27:06.679-05:00']]
      }
    } as any, false);

    const { params } = qb.build('events');
    expect(params).toEqual(['21:27:06.679']);
  });
});
