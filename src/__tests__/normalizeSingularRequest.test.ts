import { describe, it, expect } from 'vitest';
import { normalizeSingularRequest } from '../api/utils/normalizeSingularRequest';
import { C6C } from '../api/C6Constants';
import type { C6RestfulModel } from '../api/types/ormInterfaces';

function makeModel(table: string, pkShorts: string[], extraCols: string[] = []): C6RestfulModel<any, any, any> {
  const COLUMNS: Record<string, string> = {};
  const TYPE_VALIDATION: Record<string, any> = {};

  // Always include PK columns as fully-qualified
  for (const short of pkShorts) {
    const fq = `${table}.${short}`;
    COLUMNS[fq] = short;
    TYPE_VALIDATION[fq] = { MYSQL_TYPE: 'INT', MAX_LENGTH: '11', AUTO_INCREMENT: false, SKIP_COLUMN_IN_POST: false };
  }
  // add extra simple columns
  for (const short of extraCols) {
    const fq = `${table}.${short}`;
    COLUMNS[fq] = short;
    TYPE_VALIDATION[fq] = { MYSQL_TYPE: 'VARCHAR(255)', MAX_LENGTH: '255', AUTO_INCREMENT: false, SKIP_COLUMN_IN_POST: false };
  }

  return {
    TABLE_NAME: table,
    PRIMARY: pkShorts.map(s => `${table}.${s}`) as any,
    PRIMARY_SHORT: pkShorts as any,
    COLUMNS: COLUMNS as any,
    TYPE_VALIDATION,
    REGEX_VALIDATION: {},
    LIFECYCLE_HOOKS: { GET: {}, POST: {}, PUT: {}, DELETE: {} } as any,
    TABLE_REFERENCES: {},
    TABLE_REFERENCED_BY: {},
  } as any;
}

describe('normalizeSingularRequest', () => {
  it('converts GET singular T into WHERE by PK', () => {
    const model = makeModel('actor', ['actor_id'], ['first_name']);
    const req = { actor_id: 5 } as any;
    const out = normalizeSingularRequest('GET', req, model);
    expect(out).toHaveProperty(C6C.WHERE);
    expect((out as any)[C6C.WHERE]).toEqual({ actor_id: 5 });
  });

  it('converts DELETE singular T into DELETE:true and WHERE by PK', () => {
    const model = makeModel('actor', ['actor_id']);
    const req = { actor_id: 7 } as any;
    const out = normalizeSingularRequest('DELETE', req, model);
    expect((out as any)[C6C.DELETE]).toBe(true);
    expect((out as any)[C6C.WHERE]).toEqual({ actor_id: 7 });
  });

  it('converts PUT singular T into UPDATE (non-PK fields) and WHERE by PK', () => {
    const model = makeModel('actor', ['actor_id'], ['first_name']);
    const req = { actor_id: 9, first_name: 'NEW' } as any;
    const out = normalizeSingularRequest('PUT', req, model);
    expect((out as any)[C6C.WHERE]).toEqual({ actor_id: 9 });
    expect((out as any)[C6C.UPDATE]).toEqual({ first_name: 'NEW' });
  });

  it('PUT singular T throws if no updatable fields beyond PK are present', () => {
    const model = makeModel('actor', ['actor_id']);
    const req = { actor_id: 3 } as any;
    expect(() => normalizeSingularRequest('PUT', req, model)).toThrow(/must include at least one non-primary field to update/);
  });

  it('throws when a required PK is missing for singular syntax', () => {
    const model = makeModel('actor', ['actor_id'], ['first_name']);
    const req = { first_name: 'A' } as any;
    expect(() => normalizeSingularRequest('GET', req, model)).toThrow(/Singular request requires all primary key\(s\)/);
  });

  it('supports composite primary keys and requires all PKs', () => {
    const model = makeModel('link', ['from_id', 'to_id']);
    const ok = { from_id: 1, to_id: 2 } as any;
    const out = normalizeSingularRequest('GET', ok, model);
    expect((out as any)[C6C.WHERE]).toEqual({ from_id: 1, to_id: 2 });

    const missing = { from_id: 1 } as any;
    expect(() => normalizeSingularRequest('DELETE', missing, model)).toThrow(/Missing: \[to_id\]/);
  });

  it('throws if table has no primary key for singular syntax', () => {
    const model = makeModel('nopk', [], ['name']);
    const req = { name: 'X' } as any;
    expect(() => normalizeSingularRequest('GET', req, model)).toThrow(/has no primary key/);
  });

  it('leaves already complex requests untouched', () => {
    const model = makeModel('actor', ['actor_id']);
    const complex = { [C6C.WHERE]: { actor_id: 1 }, [C6C.PAGINATION]: { LIMIT: 1 } } as any;
    const out = normalizeSingularRequest('GET', complex, model);
    expect(out).toBe(complex);
  });
});
