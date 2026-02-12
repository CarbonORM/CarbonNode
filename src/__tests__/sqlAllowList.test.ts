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
          cacheResults: false,
        } as any)
      ).rejects.toThrow("SQL statement is not permitted");
    } finally {
      restoreGlobals(originalGlobals);
    }
  });

  it("normalizes multi-row VALUES with variable row counts", () => {
    const oneRow = `
      INSERT INTO \`valuation_report_comparables\` (\`report_id\`, \`unit_id\`, \`subject_unit_id\`)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE \`subject_unit_id\` = VALUES(\`subject_unit_id\`)
    `;
    const manyRows = `
      INSERT INTO \`valuation_report_comparables\` (\`report_id\`, \`unit_id\`, \`subject_unit_id\`)
      VALUES (?, ?, ?), (?, ?, ?), (?, ?, ?), (?, ?, ?)
      ON DUPLICATE KEY UPDATE \`subject_unit_id\` = VALUES(\`subject_unit_id\`)
    `;

    expect(normalizeSql(oneRow)).toContain("VALUES (? ×3) ×*");
    expect(normalizeSql(manyRows)).toContain("VALUES (? ×3) ×*");
    expect(normalizeSql(oneRow)).toBe(normalizeSql(manyRows));
  });

  it("normalizes IN bind list cardinality", () => {
    const smallIn = "SELECT * FROM `geometries` WHERE ( geometries.geometry_id IN (?, ?, ?) ) LIMIT 100";
    const largeIn = "SELECT * FROM `geometries` WHERE ( geometries.geometry_id IN (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ) LIMIT 250";

    const normalizedSmall = normalizeSql(smallIn);
    const normalizedLarge = normalizeSql(largeIn);

    expect(normalizedSmall).toContain("IN (? ×*)");
    expect(normalizedLarge).toContain("IN (? ×*)");
    expect(normalizedSmall).toContain("LIMIT ?");
    expect(normalizedLarge).toContain("LIMIT ?");
    expect(normalizedSmall).toBe(normalizedLarge);
  });

  it("normalizes LIMIT and OFFSET numeric literals", () => {
    expect(normalizeSql("SELECT * FROM `actor` LIMIT 100")).toBe(
      normalizeSql("SELECT * FROM `actor` LIMIT 25"),
    );
    expect(normalizeSql("SELECT * FROM `actor` LIMIT 10, 50")).toBe(
      "SELECT * FROM `actor` LIMIT ?, ?",
    );
    expect(normalizeSql("SELECT * FROM `actor` LIMIT 50 OFFSET 100")).toBe(
      "SELECT * FROM `actor` LIMIT ? OFFSET ?",
    );
  });

  it("normalizes variable ST_GEOMFROMTEXT POINT and POLYGON literals", () => {
    const q1 = `
      SELECT * FROM \`property_units\`
      WHERE MBRCONTAINS(
        ST_GEOMFROMTEXT('POLYGON((39.1 -105.1, 39.2 -105.1, 39.2 -105.0, 39.1 -105.0, 39.1 -105.1))', 4326),
        property_units.location
      )
      ORDER BY ST_DISTANCE_SPHERE(
        property_units.location,
        ST_GEOMFROMTEXT('POINT(39.15 -105.05)', 4326)
      )
      LIMIT 100
    `;
    const q2 = `
      SELECT * FROM \`property_units\`
      WHERE MBRCONTAINS(
        ST_GEOMFROMTEXT('POLYGON((39.3 -105.3, 39.7 -105.3, 39.7 -104.8, 39.3 -104.8, 39.3 -105.3))', 4326),
        property_units.location
      )
      ORDER BY ST_DISTANCE_SPHERE(
        property_units.location,
        ST_GEOMFROMTEXT('POINT(39.5321821 -105.0035613)', 4326)
      )
      LIMIT 250
    `;

    const normalized1 = normalizeSql(q1);
    const normalized2 = normalizeSql(q2);

    expect(normalized1).toContain("ST_GEOMFROMTEXT('POLYGON((?))', ?)");
    expect(normalized1).toContain("ST_GEOMFROMTEXT('POINT(? ?)', ?)");
    expect(normalized1).toContain("ST_DISTANCE_SPHERE(");
    expect(normalized1).toContain("LIMIT ?");
    expect(normalized1).toBe(normalized2);
  });

  it("normalizes geo function casing and FORCE INDEX spacing", () => {
    const a =
      "SELECT * FROM `property_units` FORCE INDEX (`idx_county_id`,`idx_property_units_location`) WHERE ST_Distance_Sphere(property_units.location, ST_GeomFromText('POINT(39.5 -105.0)', 4326)) <= 50 LIMIT 100";
    const b =
      "SELECT * FROM `property_units` FORCE INDEX (`idx_county_id`, `idx_property_units_location`) WHERE st_distance_sphere(property_units.location, st_geomfromtext('POINT(39.7 -104.9)', 4326)) <= 25 LIMIT 25";

    const normalizedA = normalizeSql(a);
    const normalizedB = normalizeSql(b);

    expect(normalizedA).toContain("FORCE INDEX (`idx_county_id`, `idx_property_units_location`)");
    expect(normalizedA).toContain("ST_DISTANCE_SPHERE");
    expect(normalizedA).toContain("ST_GEOMFROMTEXT('POINT(? ?)', ?)");
    expect(normalizedA).toContain("LIMIT ?");
    expect(normalizedB).toContain("FORCE INDEX (`idx_county_id`, `idx_property_units_location`)");
    expect(normalizedB).toContain("ST_DISTANCE_SPHERE");
    expect(normalizedB).toContain("ST_GEOMFROMTEXT('POINT(? ?)', ?)");
    expect(normalizedB).toContain("LIMIT ?");
  });

});
