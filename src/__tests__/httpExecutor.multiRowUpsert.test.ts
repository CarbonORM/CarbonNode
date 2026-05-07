import { describe, expect, it, vi } from "vitest";
import { C6C, restOrm } from "@carbonorm/carbonnode";
import { buildTestConfig } from "./fixtures/c6.fixture";

describe("HttpExecutor multi-row upsert payload", () => {
  it("preserves UPDATE metadata when posting dataInsertMultipleRows", async () => {
    const post = vi.fn().mockResolvedValue({
      data: {
        created: 1,
        rest: {},
      },
    });

    const baseConfig = buildTestConfig() as any;
    const actorHttp = restOrm<any>(() => ({
      ...baseConfig,
      requestMethod: C6C.POST,
      restURL: "http://127.0.0.1:9999/rest/",
      axios: { post },
      verbose: false,
    }));

    await actorHttp.Post({
      dataInsertMultipleRows: [
        {
          "actor.actor_id": 1,
          "actor.first_name": "ALICE",
          "actor.last_name": "ONE",
        },
        {
          "actor.actor_id": 2,
          "actor.first_name": "BOB",
          "actor.last_name": "TWO",
        },
      ],
      [C6C.UPDATE]: ["first_name", "last_name"],
    } as any);

    expect(post).toHaveBeenCalledTimes(1);

    const payload = post.mock.calls[0][1];
    expect(payload[C6C.UPDATE]).toEqual(["first_name", "last_name"]);
    expect(payload.dataInsertMultipleRows).toHaveLength(2);
    expect(payload.dataInsertMultipleRows[0]).toMatchObject({
      "actor.actor_id": 1,
      "actor.first_name": "ALICE",
      "actor.last_name": "ONE",
    });
  });

  it("does not log a composite-key warning when merged rows already include all primary keys", async () => {
    vi.stubEnv("NODE_ENV", "development");

    const post = vi.fn().mockResolvedValue({
      data: {
        rest: {},
      },
    });
    const updateRestfulObjectArrays = vi.fn();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const baseConfig = buildTestConfig() as any;
      const filmActorHttp = restOrm<any>(() => ({
        ...baseConfig,
        restModel: baseConfig.C6.TABLES.film_actor,
        requestMethod: C6C.POST,
        restURL: "http://127.0.0.1:9999/rest/",
        axios: { post },
        reactBootstrap: {
          updateRestfulObjectArrays,
          deleteRestfulObjectArrays: vi.fn(),
        },
        verbose: false,
      }));

      await filmActorHttp.Post({
        "film_actor.actor_id": 1,
        "film_actor.film_id": 2,
      } as any);

      expect(consoleError).not.toHaveBeenCalledWith(
        "C6 received unexpected results given the primary key length",
      );
      expect(updateRestfulObjectArrays).toHaveBeenCalledTimes(1);
      expect(updateRestfulObjectArrays.mock.calls[0][0].dataOrCallback).toEqual([
        {
          actor_id: 1,
          film_id: 2,
        },
      ]);
    } finally {
      consoleError.mockRestore();
      vi.unstubAllEnvs();
    }
  });
});
