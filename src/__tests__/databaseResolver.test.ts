import { describe, expect, it } from "vitest";
import { C6C } from "../constants/C6Constants";
import {
    extractDatabaseKeyFromRequest,
    resolveDatabaseSelection,
    resolveRestConfigForRequest,
    stripDatabaseKeyFromRequest,
} from "../api/databaseResolver";
import { buildTestConfig } from "./fixtures/c6.fixture";

const makePool = () => ({
    getConnection: async () => ({
        release: () => undefined,
    }),
}) as any;

describe("databaseResolver", () => {
    it("extracts and strips DB selection metadata", () => {
        expect(extractDatabaseKeyFromRequest({ [C6C.DB]: "billing" })).toBe("billing");
        expect(extractDatabaseKeyFromRequest({ db: "analytics" })).toBe("analytics");

        const request = {
            [C6C.DB]: "billing",
            db: "billing",
            actor_id: 3,
        };
        expect(stripDatabaseKeyFromRequest(request)).toEqual({ actor_id: 3 });
    });

    it("routes to shorthand pool entries and clears HTTP transport", () => {
        const base = buildTestConfig() as any;
        const pool = makePool();
        base.axios = { defaults: {} };
        base.databases = { billing: pool };

        const { config, databaseKey } = resolveDatabaseSelection(base, { [C6C.DB]: "billing" });
        expect(databaseKey).toBe("billing");
        expect(config.mysqlPool).toBe(pool);
        expect(config.axios).toBeUndefined();
    });

    it("supports defaultDatabase when request does not pass DB", () => {
        const base = buildTestConfig() as any;
        const pool = makePool();
        base.databases = { app: pool };
        base.defaultDatabase = "app";

        const { config, databaseKey } = resolveDatabaseSelection(base, {});
        expect(databaseKey).toBe("app");
        expect(config.mysqlPool).toBe(pool);
    });

    it("supports per-database axios transport and clears mysqlPool", () => {
        const base = buildTestConfig() as any;
        base.mysqlPool = makePool();
        const axios = { defaults: {} };
        base.databases = {
            remote: { axios, restURL: "https://example.test/rest/" },
        };

        const { config } = resolveDatabaseSelection(base, { [C6C.DB]: "remote" });
        expect(config.axios).toBe(axios);
        expect(config.mysqlPool).toBeUndefined();
        expect(config.restURL).toBe("https://example.test/rest/");
    });

    it("remaps restModel when switching to a DB-specific C6 schema", () => {
        const base = buildTestConfig() as any;
        const alternate = buildTestConfig() as any;
        alternate.C6.C6VERSION = "alternate";
        base.databases = {
            billing: {
                mysqlPool: makePool(),
                C6: alternate.C6,
            },
        };

        const { config } = resolveRestConfigForRequest(base, { [C6C.DB]: "billing" });
        expect(config.C6).toBe(alternate.C6);
        expect(config.restModel).toBe(alternate.C6.TABLES.actor);
    });

    it("throws when selected C6 schema does not contain the requested table", () => {
        const base = buildTestConfig() as any;
        const alternateC6 = {
            ...base.C6,
            TABLES: {
                film_actor: base.C6.TABLES.film_actor,
            },
        };
        base.databases = {
            reporting: {
                mysqlPool: makePool(),
                C6: alternateC6,
            },
        };

        expect(() =>
            resolveRestConfigForRequest(base, { [C6C.DB]: "reporting" }),
        ).toThrow(/does not expose table/i);
    });

    it("throws on unknown DB keys", () => {
        const base = buildTestConfig() as any;
        base.databases = { app: makePool() };

        expect(() =>
            resolveDatabaseSelection(base, { [C6C.DB]: "missing" }),
        ).toThrow(/Unknown database key/);
    });
});
