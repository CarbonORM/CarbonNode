import mysql from "mysql2/promise";
import axios from "axios";
import { AddressInfo } from "net";
import {describe, it, expect, beforeAll, afterAll} from "vitest";
import { restOrm } from "@carbonorm/carbonnode";
import {Actor, C6, Film_Actor} from "./sakila-db/C6.js";
import {C6C} from "../constants/C6Constants";
import createTestServer from "./fixtures/createTestServer";

let pool: mysql.Pool;
let server: any;
let restURL: string;
let axiosClient: ReturnType<typeof axios.create>;
const actorHttp = restOrm<any>(() => ({
    C6,
    restModel: C6.TABLES.actor,
    restURL,
    axios: axiosClient,
    verbose: false,
}));
const filmActorHttp = restOrm<any>(() => ({
    C6,
    restModel: C6.TABLES.film_actor,
    restURL,
    axios: axiosClient,
    verbose: false,
}));

const actorRequest = async (
    method: "GET" | "POST" | "PUT" | "DELETE",
    request: any
) => {
    if (method === "GET") return actorHttp.Get(request as any);
    if (method === "POST") return actorHttp.Post(request as any);
    if (method === "PUT") return actorHttp.Put(request as any);
    return actorHttp.Delete(request as any);
};

const filmActorRequest = async (
    method: "GET" | "POST" | "PUT" | "DELETE",
    request: any
) => {
    if (method === "GET") return filmActorHttp.Get(request as any);
    if (method === "POST") return filmActorHttp.Post(request as any);
    if (method === "PUT") return filmActorHttp.Put(request as any);
    return filmActorHttp.Delete(request as any);
};

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

    restURL = `http://127.0.0.1:${port}/rest/`;
    axiosClient = axios.create();
    axiosClient.interceptors.response.use(
        response => response,
        error => Promise.reject(new Error(error?.message ?? 'Request failed')),
    );
});

afterAll(async () => {
    await new Promise(resolve => server.close(resolve));
    await pool.end();
});

describe("ExpressHandler e2e", () => {
    it("handles GET requests", async () => {
        const data = await actorRequest("GET", {
            [C6C.PAGINATION]: {
                [C6C.LIMIT]: 1
            },
        });
        expect(Array.isArray(data?.rest)).toBe(true);
        expect(data?.rest?.length).toBeGreaterThan(0);
    });


    it("handles empty get requests", async () => {
        const data = await actorRequest("GET", {});
        expect(Array.isArray(data?.rest)).toBe(true);
        expect(data?.rest?.length).toBeGreaterThan(0);
    });

    it("handles POST, GET by id, PUT, and DELETE", async () => {
        const first_name = `Test${Date.now()}`;
        const last_name = `User${Date.now()}`;

        await actorRequest("POST", {
            first_name,
            last_name,
        } as any);

        let data = await actorRequest("GET", {
            [C6C.WHERE]: { [Actor.FIRST_NAME]: first_name, [Actor.LAST_NAME]: last_name },
            [C6C.PAGINATION]: { [C6C.LIMIT]: 1 },
        } as any);

        expect(data?.rest).toHaveLength(1);
        const testId = data?.rest[0].actor_id;

        await actorRequest("PUT", {
            [C6C.WHERE]: { [Actor.ACTOR_ID]: testId },
            [C6C.UPDATE]: { first_name: "Updated" },
        } as any);

        data = await actorRequest("GET", {
            [C6C.WHERE]: { [Actor.ACTOR_ID]: testId },
        } as any);
        expect(data?.rest).toHaveLength(1);
        expect(data?.rest[0].first_name).toBe("Updated");

        await actorRequest("DELETE", {
            [C6C.WHERE]: { [Actor.ACTOR_ID]: testId },
            [C6C.DELETE]: true,
        } as any);
        data = await actorRequest("GET", {
            [C6C.WHERE]: { [Actor.ACTOR_ID]: testId },
            cacheResults: false,
        } as any);
        expect(Array.isArray(data?.rest)).toBe(true);
        expect(data?.rest.length).toBe(0);
    });

    it("stringifies plain object values in PUT updates", async () => {
        const first_name = `Json${Date.now()}`;
        const last_name = `User${Date.now()}`;

        await actorRequest("POST", {
            first_name,
            last_name,
        } as any);

        const payload = { greeting: "hello", flags: [1, true] };

        let data = await actorRequest("GET", {
            [C6C.WHERE]: { [Actor.FIRST_NAME]: first_name, [Actor.LAST_NAME]: last_name },
            [C6C.PAGINATION]: { [C6C.LIMIT]: 1 },
        } as any);

        const actorId = data?.rest?.[0]?.actor_id;
        expect(actorId).toBeTruthy();

        await actorRequest("PUT", {
            [C6C.WHERE]: { [Actor.ACTOR_ID]: actorId },
            [C6C.UPDATE]: { first_name: payload },
        } as any);

        data = await actorRequest("GET", {
            [C6C.WHERE]: { [Actor.ACTOR_ID]: actorId },
        } as any);

        expect(data?.rest?.[0]?.first_name).toBe(JSON.stringify(payload));
    });

    it("rejects operator-like objects in PUT updates", async () => {
        const first_name = `Invalid${Date.now()}`;
        const last_name = `User${Date.now()}`;

        await actorRequest("POST", {
            first_name,
            last_name,
        } as any);

        const data = await actorRequest("GET", {
            [C6C.WHERE]: { [Actor.FIRST_NAME]: first_name, [Actor.LAST_NAME]: last_name },
            [C6C.PAGINATION]: { [C6C.LIMIT]: 1 },
        } as any);

        const actorId = data?.rest?.[0]?.actor_id;
        expect(actorId).toBeTruthy();

        const operatorLike = { [C6C.GREATER_THAN]: "oops" } as any;

        try {
            const actorSql = restOrm<any>(() => ({
                C6,
                restModel: C6.TABLES.actor,
                mysqlPool: pool,
                verbose: false,
            }));
            await actorSql.Put({
                [C6C.WHERE]: { [Actor.ACTOR_ID]: actorId },
                [C6C.UPDATE]: { first_name: operatorLike },
            } as any);
            throw new Error('Expected PUT to reject for operator-like payload.');
        } catch (error: any) {
            const message = String(error?.message ?? error);
            expect(message).toMatch(/operand/i);
        }
    });

    it("respects METHOD=GET override on POST", async () => {
        const table = Actor.TABLE_NAME;

        const response = await axios.post(`${restURL}${table}?METHOD=GET`, {
            [C6C.PAGINATION]: { [C6C.LIMIT]: 2 }
        });

        expect(response.status).toBe(200);
        expect(Array.isArray(response.data?.rest)).toBe(true);
        expect(response.data?.rest?.length).toBeGreaterThan(0);
    });

    it("ignores unsupported METHOD overrides", async () => {
        const table = Actor.TABLE_NAME;

        const first_name = `Override${Date.now()}`;
        const last_name = `User${Date.now()}`;

        const response = await axios.post(`${restURL}${table}?METHOD=PUT`, {
            first_name,
            last_name,
        } as any);

        expect(response.status).toBe(200);
        expect(response.data?.success).toBeTruthy();
    });

    it("allows composite keys when a URL primary is present", async () => {
        const table = Film_Actor.TABLE_NAME;

        const seed = await filmActorRequest("GET", {
            [C6C.PAGINATION]: { [C6C.LIMIT]: 1 },
        } as any);

        const filmActor = seed.rest[0];
        expect(filmActor).toBeTruthy();

        const response = await axios.post(`${restURL}${table}/${filmActor.actor_id}?METHOD=GET`, {
            [C6C.WHERE]: {
                [Film_Actor.ACTOR_ID]: filmActor.actor_id,
                [Film_Actor.FILM_ID]: filmActor.film_id,
            },
        });

        expect(response.status).toBe(200);
        expect(response.data?.rest).toHaveLength(1);
        expect(response.data?.rest?.[0]?.actor_id).toBe(filmActor.actor_id);
        expect(response.data?.rest?.[0]?.film_id).toBe(filmActor.film_id);
    });
});
