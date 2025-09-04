import mysql from 'mysql2/promise';
import {
    checkAllRequestsComplete,
} from '@carbonorm/carbonnode';
import {
    C6,
    GLOBAL_REST_PARAMETERS,
} from './C6.js';
import {
    describe,
    it,
    expect,
    beforeAll,
    afterAll,
} from 'vitest';

function toPascalCase(name) {
    return name.replace(/(^|_)([a-z])/g, (_, __, c) => c.toUpperCase());
}

async function waitForRequests(timeout = 10000) {
    const start = Date.now();
    while (!checkAllRequestsComplete()) {
        if (Date.now() - start > timeout) {
            throw new Error('pending requests did not settle');
        }
        await new Promise((res) => setTimeout(res, 1000));
    }
}

describe('sakila-db generated C6 bindings', () => {
    let pool;

    beforeAll(async () => {
        pool = mysql.createPool({
            host: '127.0.0.1',
            user: 'root',
            password: 'password',
            database: 'sakila',
        });
        GLOBAL_REST_PARAMETERS.mysqlPool = pool;
    });

    afterAll(async () => {
        await pool.end();
    });

    for (const [shortName] of Object.entries(C6.TABLES)) {
        const restBinding = C6.ORM[toPascalCase(shortName)];
        if (!restBinding) continue;

        it(`[${shortName}] GET`, async () => {
            const result = await restBinding.Get({
                SELECT: ['*'],
                [C6.PAGINATION]: { [C6.LIMIT]: 1 },
            } as any);
            const data = result?.data ?? result;
            expect(Array.isArray(data?.rest)).toBe(true);
            await waitForRequests();
        });
    }
});

