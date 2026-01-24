import isNode from "../variables/isNode";

const allowListCache = new Map<string, Set<string>>();

export const normalizeSql = (sql: string): string =>
    sql.replace(/\s+/g, " ").trim();

const parseAllowList = (raw: string, sourcePath: string): string[] => {
    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch (error) {
        throw new Error(`SQL allowlist at ${sourcePath} is not valid JSON.`);
    }

    if (!Array.isArray(parsed)) {
        throw new Error(`SQL allowlist at ${sourcePath} must be a JSON array of strings.`);
    }

    const sqlEntries = parsed
        .filter((entry): entry is string => typeof entry === "string")
        .map(normalizeSql)
        .filter((entry) => entry.length > 0);

    if (sqlEntries.length !== parsed.length) {
        throw new Error(`SQL allowlist at ${sourcePath} must contain only string entries.`);
    }

    return sqlEntries;
};

export const loadSqlAllowList = async (allowListPath: string): Promise<Set<string>> => {
    if (allowListCache.has(allowListPath)) {
        return allowListCache.get(allowListPath)!;
    }

    if (!isNode()) {
        throw new Error("SQL allowlist validation requires a Node runtime.");
    }

    const {readFile} = await import("node:fs/promises");

    let raw: string;
    try {
        raw = await readFile(allowListPath, "utf-8");
    } catch (error) {
        throw new Error(`SQL allowlist file not found at ${allowListPath}.`);
    }

    const sqlEntries = parseAllowList(raw, allowListPath);
    const allowList = new Set(sqlEntries);
    allowListCache.set(allowListPath, allowList);
    return allowList;
};

export const extractSqlEntries = (payload: unknown): string[] => {
    if (typeof payload === "string") {
        return [payload];
    }


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

export const collectSqlAllowListEntries = (
    payload: unknown,
    entries: Set<string> = new Set<string>()
): Set<string> => {
    const sqlEntries = extractSqlEntries(payload)
        .map(normalizeSql)
        .filter((entry) => entry.length > 0);

    sqlEntries.forEach((entry) => entries.add(entry));

    return entries;
};

export const compileSqlAllowList = async (
    allowListPath: string,
    entries: Iterable<string>
): Promise<string[]> => {
    if (!isNode()) {
        throw new Error("SQL allowlist compilation requires a Node runtime.");
    }

    const {writeFile, mkdir} = await import("node:fs/promises");
    const path = await import("node:path");

    await mkdir(path.dirname(allowListPath), {recursive: true});

    const compiled = Array.from(new Set(
        Array.from(entries)
            .map(normalizeSql)
            .filter((entry) => entry.length > 0)
    )).sort();

    await writeFile(allowListPath, JSON.stringify(compiled, null, 2));

    return compiled;
};
