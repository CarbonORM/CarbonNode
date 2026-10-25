import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { C6Constants as C6C } from "../constants/C6Constants";
import { restOrm } from "../api/restOrm";
import { buildTestConfig } from "./fixtures/c6.fixture";

const { Pool } = require("pg");

const livePostgresUrl = process.env.C6_LIVE_POSTGRES_URL || "postgres://rtm@127.0.0.1:5432/postgres";
const runLivePostgres = process.env.C6_LIVE_POSTGRES === "1" || !!process.env.C6_LIVE_POSTGRES_URL;
const schemaName = "carbonnode_pg_smoke";

describe.runIf(runLivePostgres)("SqlExecutor PostgreSQL live smoke", () => {
    let adminPool: any;
    let appPool: any;

    beforeAll(async () => {
        adminPool = new Pool({
            connectionString: livePostgresUrl,
        });
        appPool = new Pool({
            connectionString: livePostgresUrl,
            options: `-c search_path=${schemaName}`,
        });

        await adminPool.query(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE`);
        await adminPool.query(`CREATE SCHEMA ${schemaName}`);
        await adminPool.query(`
            CREATE TABLE ${schemaName}.actor (
                actor_id integer PRIMARY KEY,
                first_name text NOT NULL,
                last_name text NOT NULL,
                json_data jsonb
            )
        `);
        await adminPool.query(`
            CREATE TABLE ${schemaName}.film_actor (
                actor_id integer NOT NULL REFERENCES ${schemaName}.actor(actor_id),
                film_id integer NOT NULL,
                PRIMARY KEY (actor_id, film_id)
            )
        `);
    });

    afterAll(async () => {
        await adminPool?.query(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE`);
        await appPool?.end();
        await adminPool?.end();
    });

    it("executes real PostgreSQL CRUD through pg.Pool", async () => {
        const baseConfig = buildTestConfig() as any;
        const actorSql = restOrm<any>(() => ({
            ...baseConfig,
            postgresPool: appPool,
            verbose: false,
        }));

        const created = await actorSql.Post({
            INSERT: {
                "actor.actor_id": 101,
                "actor.first_name": "ALICE",
                "actor.last_name": "ONE",
                "actor.json_data": { source: "live" },
            },
        } as any);

        expect(created.affected).toBe(1);
        expect(created.rest).toMatchObject([
            {
                actor_id: 101,
                first_name: "ALICE",
                last_name: "ONE",
                json_data: { source: "live" },
            },
        ]);

        const found = await actorSql.Get({
            WHERE: {
                "actor.actor_id": [C6C.EQUAL, 101],
            },
            cacheResults: false,
        } as any);

        expect(found.rest).toMatchObject([
            {
                actor_id: 101,
                first_name: "ALICE",
                last_name: "ONE",
            },
        ]);

        const updated = await actorSql.Put({
            UPDATE: {
                "actor.last_name": "TWO",
            },
            WHERE: {
                "actor.actor_id": [C6C.EQUAL, 101],
            },
        } as any);

        expect(updated.affected).toBe(1);

        const deleted = await actorSql.Delete({
            WHERE: {
                "actor.actor_id": [C6C.EQUAL, 101],
            },
        } as any);

        expect(deleted.affected).toBe(1);
    });
});
