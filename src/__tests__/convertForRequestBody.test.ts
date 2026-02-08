import { describe, expect, it } from "vitest";
import convertForRequestBody from "../api/convertForRequestBody";
import { C6Constants as C6C } from "../constants/C6Constants";

const C6 = {
  TABLES: {
    actor: {
      TABLE_NAME: "actor",
      ACTOR_ID: "actor.actor_id",
      FIRST_NAME: "actor.first_name",
      LAST_NAME: "actor.last_name",
      COLUMNS: {
        "actor.actor_id": "actor_id",
        "actor.first_name": "first_name",
        "actor.last_name": "last_name",
      },
      REGEX_VALIDATION: {},
    },
  },
} as any;

describe("convertForRequestBody", () => {
  it("preserves primitive control keys and maps shorthand columns", () => {
    const payload = convertForRequestBody(
      {
        actor_id: 5,
        [C6C.DELETE]: true,
        cacheResults: false,
      } as any,
      "actor",
      C6,
    );

    expect(payload).toMatchObject({
      "actor.actor_id": 5,
      [C6C.DELETE]: true,
      cacheResults: false,
    });
  });

  it("normalizes object control keys deterministically", () => {
    const payload = convertForRequestBody(
      {
        [C6C.WHERE]: {
          "actor.last_name": "B",
          "actor.first_name": "A",
        },
      } as any,
      "actor",
      C6,
    );

    expect(Object.keys(payload[C6C.WHERE])).toEqual([
      "actor.first_name",
      "actor.last_name",
    ]);
  });
});
