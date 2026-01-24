import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mysql from 'mysql2/promise';
import { C6C } from '../constants/C6Constants';
import { restOrm } from '../api/restOrm';
import { buildBinaryTestConfig } from './fixtures/c6.fixture';

let pool: mysql.Pool;

describe('BINARY column hex string persistence', () => {
  beforeAll(async () => {
    pool = mysql.createPool({
      host: '127.0.0.1',
      user: 'root',
      password: 'password',
      database: 'sakila',
    });

    await pool.query('DROP TABLE IF EXISTS binary_test');
    await pool.query(`
      CREATE TABLE binary_test (
        id INT NOT NULL AUTO_INCREMENT,
        bin_col BINARY(16) DEFAULT NULL,
        PRIMARY KEY (id)
      )
    `);
  });

  afterAll(async () => {
    await pool.end();
  });

  it('inserts and updates hex strings as Buffer in BINARY(16) columns', async () => {
    const config = buildBinaryTestConfig();
    const binaryRest = restOrm(() => ({ ...config, mysqlPool: pool } as any));

    // ---------- INSERT via C6 ----------
    await binaryRest.Post({
      [C6C.INSERT]: {
        'binary_test.bin_col': '0123456789abcdef0123456789abcdef',
      },
    } as any);

    let [rows]: any = await pool.query(
      'SELECT HEX(bin_col) AS bin, id FROM binary_test',
    );
    const id = rows[0].id as number;
    expect(rows[0].bin).toBe('0123456789ABCDEF0123456789ABCDEF');

    // ---------- UPDATE via C6 ----------
    await binaryRest.Put({
      [C6C.UPDATE]: {
        'binary_test.bin_col': 'ffffffffffffffffffffffffffffffff',
      },
      WHERE: { 'binary_test.id': [C6C.EQUAL, id] },
    } as any);

    [rows] = await pool.query(
      'SELECT HEX(bin_col) AS bin FROM binary_test WHERE id = ?',
      [id],
    );
    expect(rows[0].bin).toBe('FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF');
  });
});
