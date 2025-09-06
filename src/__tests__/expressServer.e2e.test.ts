import mysql from "mysql2/promise";
import axios from "axios";
import { AddressInfo } from "net";
import {describe, it, expect, beforeAll, afterAll} from "vitest";
import {Actor, C6, GLOBAL_REST_PARAMETERS} from "./sakila-db/C6.js";
import {C6C} from "../api/C6Constants";
import createTestServer from "./fixtures/createTestServer";

let pool: mysql.Pool;
let server: any;

beforeAll(async () => {
    pool = mysql.createPool({
        host: "127.0.0.1",
        user: "root",
        password: "password",
        database: "sakila",
    });

    const app = createTestServer({C6, mysqlPool: pool});
    server = app.listen(0);
    await new Promise(resolve => server.on('listening', resolve));
    const {port} = server.address() as AddressInfo;

    GLOBAL_REST_PARAMETERS.restURL = `http://127.0.0.1:${port}/rest/`;
    GLOBAL_REST_PARAMETERS.axios = axios;
    GLOBAL_REST_PARAMETERS.verbose = false;
    // ensure HTTP executor is used
    // @ts-ignore
    delete GLOBAL_REST_PARAMETERS.mysqlPool;
});

afterAll(async () => {
    await new Promise(resolve => server.close(resolve));
    await pool.end();
});

describe("ExpressHandler e2e", () => {
    it("handles GET requests", async () => {
        const data = await Actor.Get({
            [C6C.PAGINATION]: {
                [C6C.LIMIT]: 1
            },
        });
        expect(Array.isArray(data?.rest)).toBe(true);
        expect(data?.rest?.length).toBeGreaterThan(0);
    });


    it("handles empty get requests", async () => {
        const data = await Actor.Get({});
        expect(Array.isArray(data?.rest)).toBe(true);
        expect(data?.rest?.length).toBeGreaterThan(0);
    });

    it("handles POST, GET by id, PUT, and DELETE", async () => {
        const first_name = `Test${Date.now()}`;
        const last_name = `User${Date.now()}`;

        await Actor.Post({
            first_name,
            last_name,
        } as any);

        let data = await Actor.Get({
            [C6C.WHERE]: { [Actor.FIRST_NAME]: first_name, [Actor.LAST_NAME]: last_name },
            [C6C.PAGINATION]: { [C6C.LIMIT]: 1 },
        } as any);

        expect(data?.rest).toHaveLength(1);
        const testId = data?.rest[0].actor_id;

        await Actor.Put({
            [C6C.WHERE]: { [Actor.ACTOR_ID]: testId },
            [C6C.UPDATE]: { first_name: "Updated" },
        } as any);

        data = await Actor.Get({
            [C6C.WHERE]: { [Actor.ACTOR_ID]: testId },
        } as any);
        expect(data?.rest).toHaveLength(1);
        expect(data?.rest[0].first_name).toBe("Updated");

        await Actor.Delete({
            [C6C.WHERE]: { [Actor.ACTOR_ID]: testId },
            [C6C.DELETE]: true,
        } as any);
        data = await Actor.Get({
            [C6C.WHERE]: { [Actor.ACTOR_ID]: testId },
            cacheResults: false,
        } as any);
        expect(Array.isArray(data?.rest)).toBe(true);
        expect(data?.rest.length).toBe(0);
    });
});
