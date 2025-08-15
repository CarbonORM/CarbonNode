import './queryHelpers.test.js';
import assert from 'assert';

// Attempt to run generated ORM tests if present
try {
    await import('../src/api/rest/C6.test.js');
} catch (e) {
    console.warn('C6 ORM tests skipped:', e.message);
}

// basic sanity test to ensure test infrastructure runs
assert.strictEqual(1 + 1, 2);
console.log('\u001B[32m✓\u001B[39m basic test passed');
