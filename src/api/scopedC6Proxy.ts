import type { iC6Object } from "../types/ormInterfaces";

type iScopedBinding = {
    Get?: (request?: Record<string, any>) => Promise<any>;
    Put?: (request?: Record<string, any>) => Promise<any>;
    Post?: (request?: Record<string, any>) => Promise<any>;
    Delete?: (request?: Record<string, any>) => Promise<any>;
    [key: string]: any;
};

export type iScopedNamespace = {
    ORM: Record<string, iScopedBinding>;
} & Record<string, iScopedBinding>;

export type iScopedC6Object<RestTableInterfaces extends { [key: string]: any }> =
    iC6Object<RestTableInterfaces> & Record<string, iScopedNamespace | any>;

type iDatabaseAwareRuntimeConfig = {
    databases?: Record<string, any>;
};

type iScopedC6ProxyOptions = {
    scopedC6ByDatabase?: Record<string, iC6Object<any>>;
};

const isRecord = (value: unknown): value is Record<string, any> =>
    !!value && typeof value === "object" && !Array.isArray(value);

export const isScopedC6Namespace = (value: unknown): value is iScopedNamespace => {
    if (!isRecord(value)) return false;
    return isRecord(value.ORM);
};

const normalizeDatabaseKey = (value: unknown, origin: string): string => {
    if (typeof value !== "string") {
        throw new Error(`${origin} must be a non-empty string.`);
    }
    const trimmed = value.trim();
    if (trimmed === "") {
        throw new Error(`${origin} must be a non-empty string.`);
    }
    return trimmed;
};

export const getScopedC6Namespace = <
    RestTableInterfaces extends { [key: string]: any },
>(
    c6: iScopedC6Object<RestTableInterfaces>,
    databaseKey: string,
): iScopedNamespace => {
    const normalizedDatabaseKey = normalizeDatabaseKey(
        databaseKey,
        "databaseKey",
    );
    const namespace = c6[normalizedDatabaseKey];
    if (!isScopedC6Namespace(namespace)) {
        throw new Error(
            `Unknown or unconfigured C6 database key '${normalizedDatabaseKey}'. Configure GLOBAL_REST_PARAMETERS.databases['${normalizedDatabaseKey}'].`,
        );
    }

    return namespace;
};

const mergeDatabaseRequest = (
    databaseToken: string,
    databaseKey: string,
    request?: Record<string, any>,
): Record<string, any> => {
    if (request == null) {
        return {
            [databaseToken]: databaseKey,
        };
    }

    if (typeof request !== "object" || Array.isArray(request)) {
        throw new Error(`Scoped C6 requests must be objects; received ${typeof request}.`);
    }

    const existing = request[databaseToken] ?? request[databaseToken.toLowerCase()];
    if (existing != null && String(existing).trim() !== databaseKey) {
        throw new Error(
            `Conflicting database selection: scoped key '${databaseKey}' does not match request key '${String(existing)}'.`,
        );
    }

    return {
        ...request,
        [databaseToken]: databaseKey,
    };
};

const wrapScopedBinding = (
    databaseToken: string,
    databaseKey: string,
    binding: iScopedBinding,
): iScopedBinding => {
    const wrap = (method: "Get" | "Put" | "Post" | "Delete") =>
        typeof binding[method] === "function"
            ? (request?: Record<string, any>) =>
                binding[method]!(
                    mergeDatabaseRequest(databaseToken, databaseKey, request),
                )
            : undefined;

    return {
        ...binding,
        Get: wrap("Get") ?? binding.Get,
        Put: wrap("Put") ?? binding.Put,
        Post: wrap("Post") ?? binding.Post,
        Delete: wrap("Delete") ?? binding.Delete,
    };
};

const buildDatabaseNamespace = (
    ormBindings: Record<string, iScopedBinding>,
    databaseToken: string,
    databaseKey: string,
): iScopedNamespace => {
    const scopedOrm = Object.fromEntries(
        Object.entries(ormBindings || {}).map(([bindingName, binding]) => [
            bindingName,
            wrapScopedBinding(databaseToken, databaseKey, binding as iScopedBinding),
        ]),
    ) as Record<string, iScopedBinding>;

    return {
        ORM: scopedOrm,
        ...scopedOrm,
    };
};

const resolveDatabaseToken = (c6: iC6Object<any>): string =>
    typeof c6.DB === "string" && c6.DB.trim().length > 0 ? c6.DB : "DB";

const resolveScopedC6Core = (
    databaseKey: string,
    c6Core: iC6Object<any>,
    globalRestParameters: iDatabaseAwareRuntimeConfig,
    options?: iScopedC6ProxyOptions,
): iC6Object<any> => {
    const staticScoped = options?.scopedC6ByDatabase?.[databaseKey];
    if (staticScoped && isRecord(staticScoped.ORM)) {
        return staticScoped;
    }

    const configuredEntry = globalRestParameters?.databases?.[databaseKey];
    if (isRecord(configuredEntry) && isRecord(configuredEntry.C6?.ORM)) {
        return configuredEntry.C6 as iC6Object<any>;
    }

    return c6Core;
};

const getConfiguredDatabaseKeys = (
    globalRestParameters: iDatabaseAwareRuntimeConfig,
): Set<string> => {
    try {
        const configured = globalRestParameters?.databases;
        if (!configured || typeof configured !== "object") {
            return new Set<string>();
        }

        return new Set<string>(Object.keys(configured));
    } catch {
        return new Set<string>();
    }
};

export const createScopedC6Proxy = <
    RestTableInterfaces extends { [key: string]: any },
>(
    c6Core: iC6Object<RestTableInterfaces>,
    globalRestParameters: iDatabaseAwareRuntimeConfig,
    options?: iScopedC6ProxyOptions,
): iScopedC6Object<RestTableInterfaces> => {
    const fallbackDatabaseToken = resolveDatabaseToken(c6Core);
    const databaseNamespaceCache: Record<
        string,
        {
            namespace: iScopedNamespace;
            ormBindings: Record<string, iScopedBinding>;
            databaseToken: string;
        }
    > = {};

    const resolveDatabaseNamespace = (databaseKey: string): iScopedNamespace => {
        const scopedC6Core = resolveScopedC6Core(
            databaseKey,
            c6Core as iC6Object<any>,
            globalRestParameters,
            options,
        );
        const ormBindings = (scopedC6Core.ORM || c6Core.ORM || {}) as Record<
            string,
            iScopedBinding
        >;
        const databaseToken = resolveDatabaseToken(scopedC6Core) || fallbackDatabaseToken;

        const cached = databaseNamespaceCache[databaseKey];
        if (
            cached &&
            cached.ormBindings === ormBindings &&
            cached.databaseToken === databaseToken
        ) {
            return cached.namespace;
        }

        const namespace = buildDatabaseNamespace(
            ormBindings,
            databaseToken,
            databaseKey,
        );
        databaseNamespaceCache[databaseKey] = {
            namespace,
            ormBindings,
            databaseToken,
        };

        return namespace;
    };

    return new Proxy(c6Core, {
        get(target, prop, receiver) {
            if (typeof prop !== "string") {
                return Reflect.get(target, prop, receiver);
            }

            if (Reflect.has(target, prop)) {
                return Reflect.get(target, prop, receiver);
            }

            const configuredKeys = getConfiguredDatabaseKeys(globalRestParameters);
            if (!configuredKeys.has(prop)) {
                return undefined;
            }

            return resolveDatabaseNamespace(prop);
        },
    }) as iScopedC6Object<RestTableInterfaces>;
};
