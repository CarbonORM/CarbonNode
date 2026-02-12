import isNode from "../variables/isNode";

type AllowListCacheEntry = {
    allowList: Set<string>;
    mtimeMs: number;
    size: number;
};

const allowListCache = new Map<string, AllowListCacheEntry>();

const ANSI_ESCAPE_REGEX = /\x1b\[[0-9;]*m/g;
const COLLAPSED_BIND_ROW_REGEX = /\(\?\s*×\d+\)/g;

function collapseBindGroups(sql: string): string {
    let normalized = sql.replace(
        /\(\s*(\?(?:\s*,\s*\?)*)\s*\)/g,
        (_match, binds: string) => {
            const bindCount = (binds.match(/\?/g) ?? []).length;
            return `(? ×${bindCount})`;
        },
    );

    normalized = normalized.replace(
        /(\(\?\s*×\d+\))(?:\s*,\s*\1)+/g,
        (_match, row) => `${row} ×*`,
    );

    normalized = normalized.replace(
        /\b(VALUES|VALUE)\s+(\(\?\s*×\d+\))(?:\s*×\d+|\s*×\*)?/gi,
        (_match, keyword: string, row: string) => `${keyword} ${row} ×*`,
    );

    normalized = normalized.replace(
        /\bIN\s*\(\?\s*×\d+\)/gi,
        "IN (? ×*)",
    );

    normalized = normalized.replace(
        /\(\?\s*×\d+\)\s*×\d+/g,
        (match) => {
            const row = match.match(COLLAPSED_BIND_ROW_REGEX)?.[0];
            return row ? `${row} ×*` : match;
        },
    );

    return normalized;
}

function normalizeLimitOffset(sql: string): string {
    return sql
        .replace(/\bLIMIT\s+\d+\s*,\s*\d+\b/gi, "LIMIT ?, ?")
        .replace(/\bLIMIT\s+\d+\s+OFFSET\s+\d+\b/gi, "LIMIT ? OFFSET ?")
        .replace(/\bLIMIT\s+\d+\b/gi, "LIMIT ?")
        .replace(/\bOFFSET\s+\d+\b/gi, "OFFSET ?");
}

function normalizeGeomFromTextLiterals(sql: string): string {
    let normalized = sql.replace(
        /ST_GEOMFROMTEXT\(\s*'POINT\([^']*\)'\s*,\s*(?:\d+|\?)\s*\)/gi,
        "ST_GEOMFROMTEXT('POINT(? ?)', ?)",
    );

    normalized = normalized.replace(
        /ST_GEOMFROMTEXT\(\s*'POLYGON\(\([^']*\)\)'\s*,\s*(?:\d+|\?)\s*\)/gi,
        "ST_GEOMFROMTEXT('POLYGON((?))', ?)",
    );

    return normalized;
}

function normalizeGeoFunctionNames(sql: string): string {
    return sql
        .replace(/\bST_DISTANCE_SPHERE\b/gi, "ST_DISTANCE_SPHERE")
        .replace(/\bST_GEOMFROMTEXT\b/gi, "ST_GEOMFROMTEXT")
        .replace(/\bMBRCONTAINS\b/gi, "MBRCONTAINS");
}

function normalizeTokenPunctuationSpacing(sql: string): string {
    return sql.replace(/`,\s*`/g, "`, `");
}

export const normalizeSql = (sql: string): string => {
    let normalized = sql.replace(ANSI_ESCAPE_REGEX, " ");
    normalized = normalized.replace(/\s+/g, " ").trim();
    normalized = normalizeGeoFunctionNames(normalized);
    normalized = normalizeTokenPunctuationSpacing(normalized);
    normalized = collapseBindGroups(normalized);
    normalized = normalizeLimitOffset(normalized);
    normalized = normalizeGeomFromTextLiterals(normalized);
    normalized = normalized.replace(/;\s*$/, "");
    return normalized.replace(/\s+/g, " ").trim();
};

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
    if (!isNode()) {
        throw new Error("SQL allowlist validation requires a Node runtime.");
    }

    const {readFile, stat} = await import("node:fs/promises");

    let fileStat: { mtimeMs: number; size: number };
    try {
        fileStat = await stat(allowListPath);
    } catch (error) {
        throw new Error(`SQL allowlist file not found at ${allowListPath}.`);
    }

    const cached = allowListCache.get(allowListPath);
    if (
        cached &&
        cached.mtimeMs === fileStat.mtimeMs &&
        cached.size === fileStat.size
    ) {
        return cached.allowList;
    }

    let raw: string;
    try {
        raw = await readFile(allowListPath, "utf-8");
    } catch (error) {
        throw new Error(`SQL allowlist file not found at ${allowListPath}.`);
    }

    const sqlEntries = parseAllowList(raw, allowListPath);
    const allowList = new Set(sqlEntries);
    allowListCache.set(allowListPath, {
        allowList,
        mtimeMs: fileStat.mtimeMs,
        size: fileStat.size,
    });
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
