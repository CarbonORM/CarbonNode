import type { Pool } from "mysql2/promise";
import { C6C } from "../constants/C6Constants";
import type {
    C6RestfulModel,
    iDatabaseRuntimeConfig,
    iRest,
} from "../types/ormInterfaces";

type iDatabaseSelectableConfig = {
    C6: any;
    databases?: Record<string, iDatabaseRuntimeConfig>;
    defaultDatabase?: string;
    mysqlPool?: Pool;
    axios?: any;
    restURL?: string;
    withCredentials?: boolean;
};

const hasOwn = (obj: Record<string, unknown>, key: string): boolean =>
    Object.prototype.hasOwnProperty.call(obj, key);

const isRecord = (value: unknown): value is Record<string, unknown> =>
    !!value && typeof value === "object" && !Array.isArray(value);

const isMysqlPoolLike = (value: unknown): value is Pool =>
    !!value && typeof (value as Pool).getConnection === "function";

const normalizeDatabaseKey = (raw: unknown, origin: string): string => {
    if (typeof raw !== "string") {
        throw new Error(`${origin} must be a non-empty string.`);
    }

    const trimmed = raw.trim();
    if (trimmed === "") {
        throw new Error(`${origin} must be a non-empty string.`);
    }

    return trimmed;
};

const resolveTableModelForC6 = (
    c6: any,
    baseModel: C6RestfulModel<string, any, any>,
): C6RestfulModel<string, any, any> | undefined => {
    if (!c6 || typeof c6 !== "object" || !c6.TABLES || typeof c6.TABLES !== "object") {
        return undefined;
    }

    const rawTableName = String(baseModel?.TABLE_NAME ?? "").trim();
    if (!rawTableName) return undefined;

    const prefix = typeof c6.PREFIX === "string" ? c6.PREFIX : "";
    const candidates: string[] = [
        rawTableName,
        rawTableName.toLowerCase(),
    ];

    if (prefix && rawTableName.startsWith(prefix)) {
        candidates.push(rawTableName.slice(prefix.length));
    }

    if (prefix && !rawTableName.startsWith(prefix)) {
        candidates.push(`${prefix}${rawTableName}`);
    }

    for (const candidate of candidates) {
        if (!candidate) continue;
        if (candidate in c6.TABLES) {
            return c6.TABLES[candidate] as C6RestfulModel<string, any, any>;
        }
    }

    return undefined;
};

const mergeDatabaseEntry = <
    T extends iDatabaseSelectableConfig,
>(
    baseConfig: T,
    entry: iDatabaseRuntimeConfig,
): T => {
    if (isMysqlPoolLike(entry)) {
        return {
            ...baseConfig,
            mysqlPool: entry,
            axios: undefined,
        };
    }

    if (!isRecord(entry)) {
        throw new Error("Database configuration entries must be a mysql pool or a configuration object.");
    }

    const merged = {
        ...baseConfig,
        ...(entry as Record<string, unknown>),
    } as T;

    const hasMysqlField = hasOwn(entry, "mysqlPool");
    const hasAxiosField = hasOwn(entry, "axios");
    const mysqlPool = (entry as Record<string, unknown>).mysqlPool;
    const axios = (entry as Record<string, unknown>).axios;

    if (hasMysqlField && !hasAxiosField && mysqlPool) {
        merged.axios = undefined;
    } else if (hasAxiosField && !hasMysqlField && axios) {
        merged.mysqlPool = undefined;
    }

    return merged;
};

export const extractDatabaseKeyFromRequest = (request: unknown): string | undefined => {
    if (!isRecord(request)) return undefined;

    if (hasOwn(request, C6C.DB)) {
        return normalizeDatabaseKey(request[C6C.DB], `[${C6C.DB}]`);
    }

    const lowercaseKey = C6C.DB.toLowerCase();
    if (hasOwn(request, lowercaseKey)) {
        return normalizeDatabaseKey(request[lowercaseKey], `[${lowercaseKey}]`);
    }

    return undefined;
};

export const stripDatabaseKeyFromRequest = <T>(request: T): T => {
    if (!isRecord(request)) return request;

    const hasUpper = hasOwn(request, C6C.DB);
    const lowercaseKey = C6C.DB.toLowerCase();
    const hasLower = hasOwn(request, lowercaseKey);

    if (!hasUpper && !hasLower) {
        return request;
    }

    const cloned = {
        ...request,
    } as Record<string, unknown>;

    if (hasUpper) delete cloned[C6C.DB];
    if (hasLower) delete cloned[lowercaseKey];

    return cloned as T;
};

export const resolveDatabaseSelection = <
    T extends iDatabaseSelectableConfig,
>(
    baseConfig: T,
    request?: unknown,
): { config: T; databaseKey?: string } => {
    const requestDbKey = extractDatabaseKeyFromRequest(request);
    const defaultDbKey = baseConfig.defaultDatabase != null
        ? normalizeDatabaseKey(baseConfig.defaultDatabase, "defaultDatabase")
        : undefined;

    const databaseKey = requestDbKey ?? defaultDbKey;
    if (!databaseKey) {
        return { config: baseConfig };
    }

    const configuredDatabases = baseConfig.databases;
    if (!configuredDatabases || typeof configuredDatabases !== "object") {
        throw new Error(
            `Request selected database '${databaseKey}', but config.databases is not configured.`,
        );
    }

    const entry = configuredDatabases[databaseKey];
    if (!entry) {
        throw new Error(
            `Unknown database key '${databaseKey}'. Known keys: ${Object.keys(configuredDatabases).join(", ") || "(none)"}.`,
        );
    }

    return {
        config: mergeDatabaseEntry(baseConfig, entry),
        databaseKey,
    };
};

export const resolveRestConfigForRequest = (
    baseConfig: iRest<any, any, any>,
    request?: unknown,
): { config: iRest<any, any, any>; databaseKey?: string } => {
    const { config: selectedConfig, databaseKey } = resolveDatabaseSelection(baseConfig, request);

    if (selectedConfig.C6 === baseConfig.C6) {
        return { config: selectedConfig, databaseKey };
    }

    const mappedRestModel = resolveTableModelForC6(selectedConfig.C6, baseConfig.restModel as any);
    if (!mappedRestModel) {
        const tableName = String(baseConfig.restModel?.TABLE_NAME ?? "").trim();
        throw new Error(
            `Selected database '${databaseKey}' does not expose table '${tableName}' in its C6 schema.`,
        );
    }

    return {
        config: {
            ...selectedConfig,
            restModel: mappedRestModel,
        },
        databaseKey,
    };
};
