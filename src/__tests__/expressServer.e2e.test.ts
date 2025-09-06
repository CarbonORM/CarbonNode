import mysql from "mysql2/promise";
import {describe, it, expect, beforeAll, afterAll} from "vitest";
import {Actor, GLOBAL_REST_PARAMETERS} from "./sakila-db/C6.js";
import {C6C} from "../api/C6Constants";

let pool: mysql.Pool;

beforeAll(async () => {
    pool = mysql.createPool({
        host: "127.0.0.1",
        user: "root",
        password: "password",
        database: "sakila",
    });

    GLOBAL_REST_PARAMETERS.mysqlPool = pool;
    GLOBAL_REST_PARAMETERS.verbose = false;
});

afterAll(async () => {
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
        await Actor.Post({
            first_name: "Test",
            last_name: "User",
        } as any);

        // @ts-ignore
        const [[{id}]] = await pool.query("SELECT LAST_INSERT_ID() as id");
        const testId = Number(id);

        let data = await Actor.Get({
            [C6C.WHERE]: { ["actor.actor_id"]: testId },
        } as any);
        expect(data?.rest).toHaveLength(1);
        expect(data?.rest[0].actor_id).toBe(testId);

        await Actor.Put({
            [C6C.WHERE]: { ["actor.actor_id"]: testId },
            [C6C.UPDATE]: { first_name: "Updated" },
        } as any);
        data = await Actor.Get({
            [C6C.WHERE]: { ["actor.actor_id"]: testId },
        } as any);
        expect(data?.rest).toHaveLength(1);
        expect(data?.rest[0].first_name).toBe("Updated");

        await Actor.Delete({
            [C6C.WHERE]: { ["actor.actor_id"]: testId },
            [C6C.DELETE]: true,
        } as any);
        data = await Actor.Get({
            [C6C.WHERE]: { ["actor.actor_id"]: testId },
        } as any);
        expect(Array.isArray(data?.rest)).toBe(true);
        expect(data?.rest.length).toBe(0);
    });
});
