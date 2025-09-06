import mysql from "mysql2/promise";
import {describe, it, expect, beforeAll, afterAll} from "vitest";
import {C6, Actor, GLOBAL_REST_PARAMETERS} from "./sakila-db/C6.js";
import {createTestServer} from "../api/handlers/createTestServer";
import {C6C} from "../api/C6Constants";
import axiosInstance from "../api/axiosInstance";

let server: any;
let pool: mysql.Pool;

beforeAll(async () => {
    pool = mysql.createPool({
        host: "127.0.0.1",
        user: "root",
        password: "password",
        database: "sakila",
    });

    const app = createTestServer({C6, mysqlPool: pool});
    server = app.listen(0);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const {port} = server.address();
    GLOBAL_REST_PARAMETERS.restURL = `http://127.0.0.1:${port}/rest/`;
    GLOBAL_REST_PARAMETERS.axios = axiosInstance;
});

afterAll(async () => {
    await pool.end();
    await new Promise<void>((resolve) => server.close(resolve));
});

describe("ExpressHandler e2e", () => {
    it("handles GET requests", async () => {
        const result = await Actor.Get({
            [C6C.PAGINATION]: { [C6C.LIMIT]: 1 },
        } as any);
        const data = (result as any)?.data ?? result;
        expect(Array.isArray(data.rest)).toBe(true);
        expect(data.rest.length).toBeGreaterThan(0);
    });
});
