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
});
