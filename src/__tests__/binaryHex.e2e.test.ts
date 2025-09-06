import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mysql from 'mysql2/promise';
import { PostQueryBuilder } from '../api/orm/queries/PostQueryBuilder';
import { UpdateQueryBuilder } from '../api/orm/queries/UpdateQueryBuilder';
import { C6C } from '../api/C6Constants';
import { buildBinaryTestConfig } from './fixtures/c6.fixture';

let pool: mysql.Pool;

describe('BINARY column hex string persistence', () => {
  beforeAll(async () => {
    pool = mysql.createPool({ user: 'root', password: 'password', database: 'sakila' });
    await pool.query('DROP TABLE IF EXISTS binary_test');
    await pool.query('CREATE TABLE binary_test (id INT NOT NULL AUTO_INCREMENT, bin_col BINARY(16) DEFAULT NULL, PRIMARY KEY (id))');
  });

  afterAll(async () => {
    await pool.end();
  });

  it('inserts and updates hex strings as Buffer in BINARY(16) columns', async () => {
    const config = buildBinaryTestConfig();

    // INSERT
    const insertBuilder = new PostQueryBuilder(config as any, {
      [C6C.INSERT]: { 'binary_test.bin_col': '0123456789abcdef0123456789abcdef' }
    } as any, false);
    let { sql, params } = insertBuilder.build('binary_test');
    const [result]: any = await pool.query(sql, params);
    const id = result.insertId as number;
    let [rows]: any = await pool.query('SELECT HEX(bin_col) as bin FROM binary_test WHERE id = ?', [id]);
    expect(rows[0].bin).toBe('0123456789ABCDEF0123456789ABCDEF');

    // UPDATE
    const updateBuilder = new UpdateQueryBuilder(config as any, {
      [C6C.UPDATE]: { 'binary_test.bin_col': 'ffffffffffffffffffffffffffffffff' },
      WHERE: { 'binary_test.id': [C6C.EQUAL, id] }
    } as any, false);
    ({ sql, params } = updateBuilder.build('binary_test'));
    await pool.query(sql, params);
    [rows] = await pool.query('SELECT HEX(bin_col) as bin FROM binary_test WHERE id = ?', [id]);
    expect(rows[0].bin).toBe('FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF');
  });
});
