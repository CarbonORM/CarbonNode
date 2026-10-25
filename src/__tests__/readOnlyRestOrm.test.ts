import { describe, expect, it } from "vitest";
import { readOnlyRestOrm } from "../api/readOnlyRestOrm";
import restRequest from "../api/restRequest";

const createReadOnlyModel = () => ({
    TABLE_NAME: "actor_info",
    RELATION_TYPE: "VIEW",
    READ_ONLY: true,
    PRIMARY: [],
    PRIMARY_SHORT: [],
    COLUMNS: {
        "actor_info.actor_id": "actor_id",
    },
    TYPE_VALIDATION: {},
    REGEX_VALIDATION: {},
    LIFECYCLE_HOOKS: {
        GET: {},
        PUT: {},
        POST: {},
        DELETE: {},
    },
    TABLE_REFERENCES: {},
    TABLE_REFERENCED_BY: {},
});

describe("readOnlyRestOrm", () => {
    it("only exposes GET for generated read-only relations", () => {
        const restModel = createReadOnlyModel();
        const binding = readOnlyRestOrm<any>(() => ({
            C6: {
                TABLES: {
                    actor_info: restModel,
                },
                PREFIX: "",
                ORM: {},
            },
            restModel,
            axios: {},
        } as any));

        expect(typeof binding.Get).toBe("function");
        expect("Post" in binding).toBe(false);
        expect("Put" in binding).toBe(false);
        expect("Delete" in binding).toBe(false);
    });

    it("blocks non-GET requests against read-only relations at the request facade", async () => {
        const restModel = createReadOnlyModel();
        const request = restRequest<any>({
            C6: {
                TABLES: {
                    actor_info: restModel,
                },
                PREFIX: "",
                ORM: {},
            },
            restModel,
            requestMethod: "POST",
            axios: {},
        } as any);

        await expect(request({} as any)).rejects.toThrow(/read-only.*GET/i);
    });
});
