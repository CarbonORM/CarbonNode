import { beforeEach, describe, expect, it, vi } from "vitest";
import { C6C } from "../constants/C6Constants";
import { restOrm } from "../api/restOrm";
import { clearCache } from "../utils/cacheManager";
import { buildTestConfig } from "./fixtures/c6.fixture";

describe("SqlExecutor PostgreSQL runtime", () => {
    beforeEach(() => {
        clearCache({ ignoreWarning: true });
    });

    it("executes GET through postgresPool with PostgreSQL SQL and placeholders", async () => {
        const client = {
            query: vi.fn(async () => ({
                rows: [
                    {
                        actor_id: 1,
                        first_name: "ALICE",
                        last_name: "ONE",
                    },
                ],
                rowCount: 1,
            })),
            release: vi.fn(),
        };
        const baseConfig = buildTestConfig() as any;
        const actorSql = restOrm<any>(() => ({
            ...baseConfig,
            postgresPool: {
                connect: vi.fn(async () => client),
            },
            verbose: false,
        }));

        const response = await actorSql.Get({ actor_id: 1, cacheResults: false } as any);

        expect(client.query).toHaveBeenCalledTimes(1);
        expect(client.query).toHaveBeenCalledWith(
            'SELECT * FROM "actor" WHERE (actor.actor_id) = $1 LIMIT 100',
            [1],
        );
        expect(response.rest).toEqual([
            {
                actor_id: 1,
                first_name: "ALICE",
                last_name: "ONE",
            },
        ]);
        expect(response.sql?.sql).toBe('SELECT * FROM "actor" WHERE (actor.actor_id) = $1 LIMIT 100');
        expect(client.release).toHaveBeenCalledTimes(1);
    });

    it("executes POST through postgresPool inside a transaction", async () => {
        const client = {
            query: vi.fn(async (sql: string) => {
                if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") {
                    return { rows: [], rowCount: null };
                }
                return {
                    rows: [
                        {
                            actor_id: 7,
                            first_name: "ALICE",
                            last_name: "ONE",
                        },
                    ],
                    rowCount: 1,
                };
            }),
            release: vi.fn(),
        };
        const baseConfig = buildTestConfig() as any;
        const actorSql = restOrm<any>(() => ({
            ...baseConfig,
            postgresPool: {
                connect: vi.fn(async () => client),
            },
            verbose: false,
        }));

        const response = await actorSql.Post({
            INSERT: {
                "actor.first_name": "ALICE",
                "actor.last_name": "ONE",
            },
        } as any);

        expect(client.query).toHaveBeenNthCalledWith(1, "BEGIN");
        expect(client.query).toHaveBeenNthCalledWith(
            2,
            'INSERT INTO "actor" (\n            "first_name", "last_name"\n         ) VALUES\n            ($1, $2) RETURNING *',
            ["ALICE", "ONE"],
        );
        expect(client.query).toHaveBeenNthCalledWith(3, "COMMIT");
        expect(response.affected).toBe(1);
        expect(response.insertId).toBeUndefined();
        expect(response.rest).toEqual([
            {
                actor_id: 7,
                first_name: "ALICE",
                last_name: "ONE",
            },
        ]);
        expect(client.release).toHaveBeenCalledTimes(1);
    });

    it("executes PostgreSQL upserts with ON CONFLICT and RETURNING", async () => {
        const client = {
            query: vi.fn(async (sql: string) => {
                if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") {
                    return { rows: [], rowCount: null };
                }
                return {
                    rows: [
                        {
                            actor_id: 1,
                            first_name: "ALICIA",
                            last_name: "ONE",
                        },
                    ],
                    rowCount: 1,
                };
            }),
            release: vi.fn(),
        };
        const baseConfig = buildTestConfig() as any;
        const actorSql = restOrm<any>(() => ({
            ...baseConfig,
            postgresPool: {
                connect: vi.fn(async () => client),
            },
            verbose: false,
        }));

        const response = await actorSql.Post({
            INSERT: {
                "actor.actor_id": 1,
                "actor.first_name": "ALICIA",
                "actor.last_name": "ONE",
            },
            UPDATE: ["first_name", "last_name"],
        } as any);

        expect(client.query).toHaveBeenNthCalledWith(2,
            'INSERT INTO "actor" (\n            "actor_id", "first_name", "last_name"\n         ) VALUES\n            ($1, $2, $3) ON CONFLICT ("actor_id") DO UPDATE SET "first_name" = EXCLUDED."first_name", "last_name" = EXCLUDED."last_name" RETURNING *',
            [1, "ALICIA", "ONE"],
        );
        expect(response.affected).toBe(1);
        expect(response.rest).toEqual([
            {
                actor_id: 1,
                first_name: "ALICIA",
                last_name: "ONE",
            },
        ]);
    });

    it("executes PostgreSQL DELETE USING for inner joins", async () => {
        const client = {
            query: vi.fn(async (sql: string) => {
                if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") {
                    return { rows: [], rowCount: null };
                }
                return { rows: [], rowCount: 2 };
            }),
            release: vi.fn(),
        };
        const baseConfig = buildTestConfig() as any;
        const actorSql = restOrm<any>(() => ({
            ...baseConfig,
            postgresPool: {
                connect: vi.fn(async () => client),
            },
            verbose: false,
        }));

        const response = await actorSql.Delete({
            JOIN: {
                [C6C.INNER]: {
                    "film_actor fa": {
                        "fa.actor_id": [C6C.EQUAL, "actor.actor_id"],
                    },
                },
            },
            WHERE: {
                "actor.actor_id": [C6C.GREATER_THAN, 100],
            },
        } as any);

        expect(client.query).toHaveBeenNthCalledWith(1, "BEGIN");
        expect(client.query).toHaveBeenNthCalledWith(
            2,
            'DELETE FROM "actor" USING "film_actor" AS "fa" WHERE ((fa.actor_id) = actor.actor_id) AND ((actor.actor_id) > $1)',
            [100],
        );
        expect(client.query).toHaveBeenNthCalledWith(3, "COMMIT");
        expect(response.affected).toBe(2);
    });

    it("rolls back and releases PostgreSQL connections when write execution fails", async () => {
        const executionError = new Error("insert failed");
        const client = {
            query: vi.fn(async (sql: string) => {
                if (sql === "BEGIN" || sql === "ROLLBACK") {
                    return { rows: [], rowCount: null };
                }
                if (sql === "COMMIT") {
                    throw new Error("COMMIT should not run after failed insert");
                }
                throw executionError;
            }),
            release: vi.fn(),
        };
        const baseConfig = buildTestConfig() as any;
        const actorSql = restOrm<any>(() => ({
            ...baseConfig,
            postgresPool: {
                connect: vi.fn(async () => client),
            },
            verbose: false,
        }));

        await expect(actorSql.Post({
            INSERT: {
                "actor.first_name": "ALICE",
                "actor.last_name": "ONE",
            },
        } as any)).rejects.toThrow("insert failed");

        expect(client.query).toHaveBeenNthCalledWith(1, "BEGIN");
        expect(client.query).toHaveBeenNthCalledWith(
            2,
            'INSERT INTO "actor" (\n            "first_name", "last_name"\n         ) VALUES\n            ($1, $2) RETURNING *',
            ["ALICE", "ONE"],
        );
        expect(client.query).toHaveBeenNthCalledWith(3, "ROLLBACK");
        expect(client.query).not.toHaveBeenCalledWith("COMMIT");
        expect(client.release).toHaveBeenCalledTimes(1);
    });
});
