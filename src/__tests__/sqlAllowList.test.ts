import {describe, expect, it, vi} from "vitest";
import path from "node:path";
import {mkdir, readdir, readFile, writeFile} from "node:fs/promises";
import restRequest from "../api/restRequest";
import {Actor, C6} from "./sakila-db/C6.js";
import {loadSqlAllowList, normalizeSql} from "../api/utils/sqlAllowList";

const fixturesDir = path.join(process.cwd(), "src/__tests__/fixtures/sqlResponses");
const fixturePath = path.join(fixturesDir, "actor.get.json");
const compiledPath = path.join(fixturesDir, "sqlAllowList.json");

const buildMockPool = (rows: Record<string, any>[]) => {
  const connection = {
    query: vi.fn().mockResolvedValue([rows]),
    release: vi.fn(),
  };
  const pool = {
    getConnection: vi.fn().mockResolvedValue(connection),
  };
  return {pool, connection};
};

const extractSqlEntries = (payload: unknown): string[] => {
  if (Array.isArray(payload)) {
    return payload.flatMap(extractSqlEntries);
  }
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const sqlValue = (payload as {sql?: unknown}).sql;
  if (typeof sqlValue === "string") {
    return [sqlValue];
  }
  if (sqlValue && typeof sqlValue === "object") {
    const nested = (sqlValue as {sql?: unknown}).sql;
    if (typeof nested === "string") {
      return [nested];
    }
  }

  return [];
};

const compileSqlAllowList = async (): Promise<string[]> => {
  const entries = await readdir(fixturesDir);
  const sqlEntries: string[] = [];

  for (const entry of entries) {
    if (!entry.endsWith(".json") || entry.startsWith("sqlAllowList")) {
      continue;
    }
    const raw = await readFile(path.join(fixturesDir, entry), "utf-8");
    const payload = JSON.parse(raw);
    const extracted = extractSqlEntries(payload);
    if (extracted.length === 0) {
      throw new Error(`No SQL found in fixture ${entry}`);
    }
    sqlEntries.push(...extracted);
  }

  const compiled = Array.from(new Set(sqlEntries.map(normalizeSql))).sort();
  await writeFile(compiledPath, JSON.stringify(compiled, null, 2));
  return compiled;
};

describe("SQL allowlist", () => {
  it("compiles fixtures into a SQL allowlist", async () => {
    await mkdir(fixturesDir, {recursive: true});

    const {pool} = buildMockPool([
      {actor_id: 1, first_name: "PENELOPE", last_name: "GUINESS"},
    ]);

    const response = await restRequest({
      C6,
      mysqlPool: pool as any,
      restModel: Actor,
      requestMethod: "GET",
      verbose: false,
    })({
      [C6.PAGINATION]: {[C6.LIMIT]: 1},
    } as any);

    await writeFile(fixturePath, JSON.stringify(response, null, 2));

    const compiled = await compileSqlAllowList();
    expect(compiled.length).toBeGreaterThan(0);

    const allowList = await loadSqlAllowList(compiledPath);
    const responseSql = normalizeSql((response as any).sql.sql as string);
    expect(allowList.has(responseSql)).toBe(true);

    const allowedResponse = await restRequest({
      C6,
      mysqlPool: pool as any,
      restModel: Actor,
      requestMethod: "GET",
      sqlAllowListPath: compiledPath,
      verbose: false,
    })({
      [C6.PAGINATION]: {[C6.LIMIT]: 1},
    } as any);

    expect(allowedResponse.rest).toEqual(response.rest);
  });

  it("throws when allowlist file is missing", async () => {
    await expect(loadSqlAllowList(path.join(fixturesDir, "missing.json")))
      .rejects
      .toThrow("SQL allowlist file not found");
  });

  it("rejects SQL that is not on the allowlist", async () => {
    const blockedPath = path.join(fixturesDir, "sqlAllowList.blocked.json");
    await writeFile(blockedPath, JSON.stringify(["SELECT 1"], null, 2));

    const {pool} = buildMockPool([
      {actor_id: 1, first_name: "PENELOPE", last_name: "GUINESS"},
    ]);

    await expect(
      restRequest({
        C6,
        mysqlPool: pool as any,
        restModel: Actor,
        requestMethod: "GET",
        sqlAllowListPath: blockedPath,
        verbose: false,
      })({
        [C6.PAGINATION]: {[C6.LIMIT]: 1},
      } as any)
    ).rejects.toThrow("SQL statement is not permitted");
  });
});
