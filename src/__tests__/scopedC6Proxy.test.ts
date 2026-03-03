import { describe, expect, it, vi } from "vitest";
import { C6Constants } from "../constants/C6Constants";
import { createScopedC6Proxy } from "../api/scopedC6Proxy";

const createTestC6 = () => {
    const get = vi.fn(async (request?: Record<string, any>) => ({ request }));
    const post = vi.fn(async (request?: Record<string, any>) => ({ request }));

    const c6Core = {
        ...C6Constants,
        C6VERSION: "test",
        PREFIX: "",
        TABLES: {},
        ORM: {
            Actor: {
                Get: get,
                Post: post,
                marker: "ok",
            },
        },
    } as any;

    return { c6Core, get, post };
};

describe("createScopedC6Proxy", () => {
    it("exposes configured DB namespaces and caches them", () => {
        const { c6Core } = createTestC6();
        const C6 = createScopedC6Proxy(c6Core, {
            databases: {
                app: {},
                billing: {},
            },
        });

        expect((C6 as any).C6VERSION).toBe("test");
        expect((C6 as any).unknown).toBeUndefined();
        expect((C6 as any).app).toBeDefined();
        expect((C6 as any).app).toBe((C6 as any).app);
        expect(typeof (C6 as any).app.Actor.Get).toBe("function");
        expect(typeof (C6 as any).app.ORM.Actor.Get).toBe("function");
    });

    it("injects DB request metadata and blocks conflicts", async () => {
        const { c6Core, get, post } = createTestC6();
        const C6 = createScopedC6Proxy(c6Core, {
            databases: {
                billing: {},
            },
        });

        await (C6 as any).billing.Actor.Get({ actor_id: 1 });
        expect(get).toHaveBeenCalledWith({
            actor_id: 1,
            [C6Constants.DB]: "billing",
        });

        await (C6 as any).billing.ORM.Actor.Post();
        expect(post).toHaveBeenCalledWith({
            [C6Constants.DB]: "billing",
        });

        expect(() =>
            (C6 as any).billing.Actor.Get({
                [C6Constants.DB]: "app",
            }),
        ).toThrow(/Conflicting database selection/i);

        expect(() => (C6 as any).billing.Actor.Get("invalid" as any)).toThrow(
            /must be objects/i,
        );
    });

    it("returns undefined for scoped keys when no databases are configured", () => {
        const { c6Core } = createTestC6();
        const C6 = createScopedC6Proxy(c6Core, {});
        expect((C6 as any).billing).toBeUndefined();
    });

    it("uses database-specific C6 bindings when provided in proxy options", async () => {
        const { c6Core, get } = createTestC6();
        const scopedGet = vi.fn(async (request?: Record<string, any>) => ({ request }));
        const scopedC6 = {
            ...c6Core,
            ORM: {
                Actor: {
                    Get: scopedGet,
                    marker: "scoped",
                },
            },
        } as any;

        const C6 = createScopedC6Proxy(
            c6Core,
            { databases: { billing: {} } },
            { scopedC6ByDatabase: { billing: scopedC6 } },
        );

        await (C6 as any).billing.Actor.Get({ actor_id: 7 });
        expect(scopedGet).toHaveBeenCalledWith({
            actor_id: 7,
            [C6Constants.DB]: "billing",
        });
        expect(get).not.toHaveBeenCalled();
        expect((C6 as any).billing.Actor.marker).toBe("scoped");
    });

    it("uses runtime database C6 override when configured", async () => {
        const { c6Core, get } = createTestC6();
        const runtimeScopedGet = vi.fn(async (request?: Record<string, any>) => ({ request }));
        const runtimeScopedC6 = {
            ...c6Core,
            ORM: {
                Actor: {
                    Get: runtimeScopedGet,
                    marker: "runtime",
                },
            },
        } as any;

        const C6 = createScopedC6Proxy(c6Core, {
            databases: {
                analytics: {
                    C6: runtimeScopedC6,
                },
            },
        });

        await (C6 as any).analytics.Actor.Get({ actor_id: 11 });
        expect(runtimeScopedGet).toHaveBeenCalledWith({
            actor_id: 11,
            [C6Constants.DB]: "analytics",
        });
        expect(get).not.toHaveBeenCalled();
        expect((C6 as any).analytics.Actor.marker).toBe("runtime");
    });
});
