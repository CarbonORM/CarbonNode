import isNode from "../../variables/isNode";

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
