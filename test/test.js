import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SelectQueryBuilder, UpdateQueryBuilder, DeleteQueryBuilder, PostQueryBuilder, C6C } from '../dist/index.esm.js';

function makeConfig(method) {
  return { C6: {}, restModel: { LIFECYCLE_HOOKS: {} }, requestMethod: method };
}

test('SelectQueryBuilder default select all', () => {
  const builder = new SelectQueryBuilder(makeConfig('GET'), {});
  const result = builder.build('users');
  assert.equal(result.sql, 'SELECT * FROM `users` LIMIT 100');
  assert.deepEqual(result.params, []);
});

test('SelectQueryBuilder named params where', () => {
  const builder = new SelectQueryBuilder(makeConfig('GET'), { WHERE: { id: 5 } }, true);
  const result = builder.build('users');
  assert.equal(result.sql, 'SELECT * FROM `users` WHERE ( id = :param0 ) LIMIT 100');
  assert.deepEqual(result.params, { param0: 5 });
});

test('DeleteQueryBuilder positional params', () => {
  const builder = new DeleteQueryBuilder(makeConfig('DELETE'), { WHERE: { id: 1 } });
  const result = builder.build('users');
  assert.equal(result.sql, 'DELETE `users` FROM `users` WHERE ( id = ? )');
  assert.deepEqual(result.params, [1]);
});

test('DeleteQueryBuilder named params', () => {
  const builder = new DeleteQueryBuilder(makeConfig('DELETE'), { WHERE: { id: 1 } }, true);
  const result = builder.build('users');
  assert.equal(result.sql, 'DELETE `users` FROM `users` WHERE ( id = :param0 )');
  assert.deepEqual(result.params, { param0: 1 });
});

test('UpdateQueryBuilder throws when missing update data', () => {
  const builder = new UpdateQueryBuilder(makeConfig('PUT'), {});
  assert.throws(() => builder.build('users'), /No update data provided/);
});

test('UpdateQueryBuilder named params with where', () => {
  const request = { [C6C.UPDATE]: { name: 'Bob' }, WHERE: { id: 1 } };
  const builder = new UpdateQueryBuilder(makeConfig('PUT'), request, true);
  const result = builder.build('users');
  assert.equal(result.sql, 'UPDATE `users` SET :param0 WHERE ( id = :param1 )');
  assert.deepEqual(result.params, { param0: 'Bob', param1: 1 });
});

test('PostQueryBuilder insert with duplicate update', () => {
  const request = { [C6C.INSERT]: { name: 'Alice' }, [C6C.UPDATE]: ['name'] };
  const builder = new PostQueryBuilder(makeConfig('POST'), request);
  const result = builder.build('users');
  assert.ok(result.sql.includes('ON DUPLICATE KEY UPDATE `name` = VALUES(`name`)'));
  assert.deepEqual(result.params, ['Alice']);
});

test('PostQueryBuilder named params placeholder', () => {
  const request = { [C6C.INSERT]: { name: 'Alice' } };
  const builder = new PostQueryBuilder(makeConfig('POST'), request, true);
  const result = builder.build('users');
  const expectedSql = 'INSERT INTO `users` (\n            `name`\n         ) VALUES (\n            :param0\n        )';
  assert.equal(result.sql, expectedSql);
  assert.equal(result.params.param0, 'Alice');
  assert.ok(Array.isArray(result.params));
});
