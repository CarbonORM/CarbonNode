import assert from 'assert';
import mysql from 'mysql2/promise';
import { checkAllRequestsComplete } from '@carbonorm/carbonnode';
import { C6, GLOBAL_REST_PARAMETERS } from './C6.js';

function toPascalCase(name) {
    return name.replace(/(^|_)([a-z])/g, (_, __, c) => c.toUpperCase());
}

async function waitForRequests(timeout = 10000) {
    const start = Date.now();
    while (!checkAllRequestsComplete()) {
        if (Date.now() - start > timeout) {
            throw new Error('pending requests did not settle');
        }
        await new Promise(res => setTimeout(res, 1000));
    }
}

(async () => {
    const pool = mysql.createPool({
        host: '127.0.0.1',
        user: 'root',
        password: 'password',
        database: 'sakila'
    });
    GLOBAL_REST_PARAMETERS.mysqlPool = pool;

    for (const [shortName] of Object.entries(C6.TABLES)) {
        const restBinding = C6.ORM[toPascalCase(shortName)];
        if (!restBinding) continue;

        const result = await restBinding.Get({ [C6.LIMIT]: 1 });
        const data = result?.data ?? result;
        assert.ok(Array.isArray(data?.rest), `[${shortName}] GET`);
        console.log(`\u001B[32m✓\u001B[39m [${shortName}] GET passed`);

        await waitForRequests();
    }

    await pool.end();
})();

