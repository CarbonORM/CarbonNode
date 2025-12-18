import mysql from "mysql2/promise";
import axios from "axios";
import { AddressInfo } from "net";
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { Actor, C6, GLOBAL_REST_PARAMETERS } from "./sakila-db/C6.js";
import { C6C } from "../api/C6Constants";
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

  const app = createTestServer({ C6, mysqlPool: pool });
  server = app.listen(0);
  await new Promise(resolve => server.on("listening", resolve));
  const { port } = server.address() as AddressInfo;

  GLOBAL_REST_PARAMETERS.restURL = `http://127.0.0.1:${port}/rest/`;
  const axiosClient = axios.create();
  axiosClient.interceptors.response.use(
    response => response,
    error => Promise.reject(new Error(error?.message ?? "Request failed")),
  );
  GLOBAL_REST_PARAMETERS.axios = axiosClient;
  GLOBAL_REST_PARAMETERS.verbose = false;
  // ensure HTTP executor is used
  // @ts-ignore
  delete GLOBAL_REST_PARAMETERS.mysqlPool;
});

afterAll(async () => {
  await new Promise(resolve => server.close(resolve));
  await pool.end();
});

describe("HttpExecutor singular e2e", () => {
  it("handles CRUD with singular objects", async () => {
    const first_name = `Test${Date.now()}`;
    const last_name = `User${Date.now()}`;

    // POST
    await Actor.Post({ first_name, last_name } as any);

    // Fetch inserted id using complex query
    let data = await Actor.Get({
      [C6C.WHERE]: { [Actor.FIRST_NAME]: first_name, [Actor.LAST_NAME]: last_name },
      [C6C.PAGINATION]: { [C6C.LIMIT]: 1 },
    });

    expect(data.rest).toHaveLength(1);
    const testId = data.rest[0].actor_id;

    // GET singular
    data = await Actor.Get({ actor_id: testId } as any);
    expect(data.rest).toHaveLength(1);
    expect(data.rest[0].actor_id).toBe(testId);

    // PUT singular
    await Actor.Put({ actor_id: testId, first_name: "Updated" } as any);
    data = await Actor.Get({ actor_id: testId, cacheResults: false } as any);
    expect(data.rest).toHaveLength(1);
    expect(data.rest[0].first_name).toBe("Updated");

    // PUT using fully qualified keys
    const updateStub = vi.fn();
    GLOBAL_REST_PARAMETERS.reactBootstrap = {
      updateRestfulObjectArrays: updateStub,
      deleteRestfulObjectArrays: vi.fn(),
    } as any;
    await Actor.Put({
      [Actor.ACTOR_ID]: testId,
      [Actor.FIRST_NAME]: "UpdatedFQ",
    } as any);
    expect(updateStub).toHaveBeenCalled();
    const args = updateStub.mock.calls[0][0];
    expect(args.dataOrCallback[0]).toHaveProperty("first_name", "UpdatedFQ");
    expect(args.dataOrCallback[0]).toHaveProperty("actor_id", testId);
    expect(args.dataOrCallback[0]).not.toHaveProperty(Actor.FIRST_NAME);
    GLOBAL_REST_PARAMETERS.reactBootstrap = undefined as any;
    data = await Actor.Get({ actor_id: testId, cacheResults: false } as any);
    expect(data.rest).toHaveLength(1);
    expect(data.rest[0].first_name).toBe("UpdatedFQ");

    // DELETE singular
    await Actor.Delete({ actor_id: testId } as any);
    data = await Actor.Get({ actor_id: testId, cacheResults: false } as any);
    expect(Array.isArray(data.rest)).toBe(true);
    expect(data.rest.length).toBe(0);
  });

  it("exposes next when pagination continues", async () => {
    const data = await Actor.Get({
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
    const data = await Actor.Get({
      [C6C.PAGINATION]: { [C6C.LIMIT]: 1 },
    } as any);

    expect(Array.isArray(data.rest)).toBe(true);
    expect(data.rest).toHaveLength(1);
    expect(typeof data.next).toBe("undefined");

  });
});
