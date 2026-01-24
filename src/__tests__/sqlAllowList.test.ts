import {describe, expect, it, vi} from "vitest";
import path from "node:path";
import {mkdir, readdir, readFile, writeFile} from "node:fs/promises";
import {Actor, C6, GLOBAL_REST_PARAMETERS} from "./sakila-db/C6.js";
import {collectSqlAllowListEntries, compileSqlAllowList, extractSqlEntries, loadSqlAllowList, normalizeSql} from "../utils/sqlAllowList";

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

const compileSqlAllowListFromFixtures = async (): Promise<string[]> => {
  const entries = await readdir(fixturesDir);
  const sqlEntries = new Set<string>();

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
    collectSqlAllowListEntries(payload, sqlEntries);
  }

  return await compileSqlAllowList(compiledPath, sqlEntries);
};

const globalRestParameters = GLOBAL_REST_PARAMETERS as typeof GLOBAL_REST_PARAMETERS & {
  mysqlPool?: unknown;
  sqlAllowListPath?: string;
  verbose?: boolean;
};

const snapshotGlobals = () => ({
  mysqlPool: globalRestParameters.mysqlPool,
  sqlAllowListPath: globalRestParameters.sqlAllowListPath,
  verbose: globalRestParameters.verbose,
});

const restoreGlobals = (snapshot: ReturnType<typeof snapshotGlobals>) => {
  globalRestParameters.mysqlPool = snapshot.mysqlPool;
  globalRestParameters.sqlAllowListPath = snapshot.sqlAllowListPath;
  globalRestParameters.verbose = snapshot.verbose;
};

describe("SQL allowlist", () => {
  it("compiles fixtures into a SQL allowlist", async () => {
    await mkdir(fixturesDir, {recursive: true});

    const {pool} = buildMockPool([
      {actor_id: 1, first_name: "PENELOPE", last_name: "GUINESS"},
    ]);

    const originalGlobals = snapshotGlobals();
    try {
      globalRestParameters.mysqlPool = pool as any;
      globalRestParameters.sqlAllowListPath = undefined;
      globalRestParameters.verbose = false;

      const response = await Actor.Get({
        [C6.PAGINATION]: {[C6.LIMIT]: 1},
      } as any);

      await writeFile(fixturePath, JSON.stringify(response, null, 2));

      const compiled = await compileSqlAllowListFromFixtures();
      expect(compiled.length).toBeGreaterThan(0);

      const allowList = await loadSqlAllowList(compiledPath);
      const responseSql = normalizeSql((response as any).sql.sql as string);
      expect(allowList.has(responseSql)).toBe(true);

      globalRestParameters.sqlAllowListPath = compiledPath;

      const allowedResponse = await Actor.Get({
        [C6.PAGINATION]: {[C6.LIMIT]: 1},
      } as any);

      expect(allowedResponse.rest).toEqual(response.rest);
    } finally {
      restoreGlobals(originalGlobals);
    }
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

    const originalGlobals = snapshotGlobals();
    try {
      globalRestParameters.mysqlPool = pool as any;
      globalRestParameters.sqlAllowListPath = blockedPath;
      globalRestParameters.verbose = false;

      await expect(
        Actor.Get({
          [C6.PAGINATION]: {[C6.LIMIT]: 1},
        } as any)
      ).rejects.toThrow("SQL statement is not permitted");
    } finally {
      restoreGlobals(originalGlobals);
    }
  });
});
