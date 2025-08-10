import assert from 'assert';
import { bbox } from '../src/api/orm/queryHelpers.js';
import { C6C } from '../src/api/C6Constants.js';

// Verify basic bounding box construction
const expected = [
  C6C.ST_SRID,
  [
    C6C.ST_MAKEENVELOPE,
    [C6C.ST_POINT, 10, 20],
    [C6C.ST_POINT, 30, 40],
  ],
  4326,
];
const actual = bbox(10, 20, 30, 40);
assert.deepStrictEqual(actual, expected);
console.log('\u001B[32m✓\u001B[39m bbox basic structure test passed');

// Negative coordinate handling
const expectedNegative = [
  C6C.ST_SRID,
  [
    C6C.ST_MAKEENVELOPE,
    [C6C.ST_POINT, -10, -20],
    [C6C.ST_POINT, -30, -40],
  ],
  4326,
];
const actualNegative = bbox(-10, -20, -30, -40);
assert.deepStrictEqual(actualNegative, expectedNegative);
console.log('\u001B[32m✓\u001B[39m bbox negative coordinates test passed');

// Swapped min/max arguments
const expectedSwapped = [
  C6C.ST_SRID,
  [
    C6C.ST_MAKEENVELOPE,
    [C6C.ST_POINT, 30, 40],
    [C6C.ST_POINT, 10, 20],
  ],
  4326,
];
const actualSwapped = bbox(30, 40, 10, 20);
assert.deepStrictEqual(actualSwapped, expectedSwapped);
console.log('\u001B[32m✓\u001B[39m bbox swapped arguments test passed');
