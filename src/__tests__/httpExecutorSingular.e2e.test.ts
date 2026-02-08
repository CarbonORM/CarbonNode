import mysql from "mysql2/promise";
import axios from "axios";
import { AddressInfo } from "net";
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { restOrm } from "@carbonorm/carbonnode";
import { Actor, C6 } from "./sakila-db/C6.js";
import { C6C } from "../constants/C6Constants";
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

const actorRequest = async (
  method: "GET" | "POST" | "PUT" | "DELETE",
  request: any
) => {
  if (method === "GET") return actorHttp.Get(request as any);
  if (method === "POST") return actorHttp.Post(request as any);
  if (method === "PUT") return actorHttp.Put(request as any);
  return actorHttp.Delete(request as any);
};

beforeAll(async () => {
  pool = mysql.createPool({
    host: "127.0.0.1",
    user: "root",
    password: "password",
    database: "sakila",
  });

  const app = createTestServer({ C6, mysqlPool: pool });
  server = app.listen(0);
  await new Promise(resolve => server.on("listening", resolve));
  const { port } = server.address() as AddressInfo;

  restURL = `http://127.0.0.1:${port}/rest/`;
  axiosClient = axios.create();
  axiosClient.interceptors.response.use(
    response => response,
    error => {
      const serverError = error?.response?.data?.error;
      const message =
        serverError?.message
        ?? (typeof serverError === "string" ? serverError : undefined)
        ?? error?.message
        ?? "Request failed";
      return Promise.reject(new Error(message));
    },
  );
});

afterAll(async () => {
  await new Promise(resolve => server.close(resolve));
  await pool.end();
});

describe("HttpExecutor singular e2e", () => {
  it("handles CRUD with singular objects", async () => {
    const first_name = `Test${Date.now()}`;
    const last_name = `User${Date.now()}`;
    let step = "POST";

    try {
      // POST
      await actorRequest("POST", { first_name, last_name } as any);

      step = "GET-complex";
      // Fetch inserted id using complex query
      let data = await actorRequest("GET", {
        [C6C.WHERE]: { [Actor.FIRST_NAME]: first_name, [Actor.LAST_NAME]: last_name },
        [C6C.PAGINATION]: { [C6C.LIMIT]: 1 },
      });

      expect(data.rest).toHaveLength(1);
      const testId = data.rest[0].actor_id;

      step = "GET-singular";
      // GET singular
      data = await actorRequest("GET", { actor_id: testId } as any);
      expect(data.rest).toHaveLength(1);
      expect(data.rest[0].actor_id).toBe(testId);

      step = "PUT-singular";
      // PUT singular
      await actorRequest("PUT", { actor_id: testId, first_name: "Updated" } as any);
      data = await actorRequest("GET", { actor_id: testId, cacheResults: false } as any);
      expect(data.rest).toHaveLength(1);
      expect(data.rest[0].first_name).toBe("Updated");

      step = "PUT-fq-react";
      // PUT using fully qualified keys
      const updateStub = vi.fn();
      const reactBootstrap = {
        updateRestfulObjectArrays: updateStub,
        deleteRestfulObjectArrays: vi.fn(),
      } as any;
      const actorHttpWithReact = restOrm<any>(() => ({
        C6,
        restModel: C6.TABLES.actor,
        restURL,
        axios: axiosClient,
        verbose: false,
        reactBootstrap,
      }));
      await actorHttpWithReact.Put({
        [Actor.ACTOR_ID]: testId,
        [Actor.FIRST_NAME]: "UpdatedFQ",
      } as any);
      expect(updateStub).toHaveBeenCalled();
      const args = updateStub.mock.calls[0][0];
      expect(args.dataOrCallback[0]).toHaveProperty("first_name", "UpdatedFQ");
      expect(args.dataOrCallback[0]).toHaveProperty("actor_id", testId);
      expect(args.dataOrCallback[0]).not.toHaveProperty(Actor.FIRST_NAME);

      step = "DELETE-singular";
      // DELETE singular
      await actorRequest("DELETE", { actor_id: testId } as any);
      data = await actorRequest("GET", { actor_id: testId, cacheResults: false } as any);
      expect(Array.isArray(data.rest)).toBe(true);
      expect(data.rest.length).toBe(0);
    } catch (error: any) {
      throw new Error(`Failed at step ${step}: ${String(error?.message ?? error)}`);
    }
  });

  it("exposes next when pagination continues", async () => {
    const data = await actorRequest("GET", {
      [C6C.PAGINATION]: { [C6C.LIMIT]: 2 },
    } as any);

    expect(Array.isArray(data.rest)).toBe(true);
    expect(data.rest).toHaveLength(2);
    expect(typeof data.next).toBe("function");

    const nextPage = await data.next?.();
    expect(nextPage?.rest).toBeDefined();
    expect(Array.isArray(nextPage?.rest)).toBe(true);
    expect(nextPage?.rest?.length).toBeGreaterThan(0);
  });

  it("exposes limit 1 does not expose next", async () => {
    const data = await actorRequest("GET", {
      [C6C.PAGINATION]: { [C6C.LIMIT]: 1 },
    } as any);

    expect(Array.isArray(data.rest)).toBe(true);
    expect(data.rest).toHaveLength(1);
    expect(typeof data.next).toBe("undefined");

  });
});
