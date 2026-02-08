import type {Request, Response, Router} from "express";
import {C6C} from "../constants/C6Constants";
import restRequest from "../api/restRequest";
import {iRest, iRestMethods} from "../types/ormInterfaces";
import {LogLevel, logWithLevel} from "../utils/logLevel";
import {OrmGenerics} from "../types/ormGenerics";


export function restExpressRequest<G extends OrmGenerics>(
    routerConfig: {
        router: Pick<Router, "all">;
        routePath?: string;
    } &
        Omit<
            iRest<G['RestShortTableName'], G['RestTableInterface']>,
            "requestMethod" | "restModel"
        >
) {
    const {router, routePath = "/rest/:table{/:primary}", ...handlerConfig} = routerConfig;

    router.all(routePath, ExpressHandler<G>(handlerConfig));
}

// TODO - WE MUST make this a generic - optional, but helpful
// note sure how it would help anyone actually...
export function ExpressHandler<
    G extends OrmGenerics
>(configX: (() => Omit<
    iRest<G['RestShortTableName'], G['RestTableInterface']>,
    "requestMethod" | "restModel"
>) | Omit<
    iRest<G['RestShortTableName'], G['RestTableInterface']>,
    "requestMethod" | "restModel"
>) {

    return async (req: Request, res: Response) => {
        try {
            const config = typeof configX === "function" ? configX() : configX;
            const {
                C6
            } = config;

            const incomingMethod = req.method.toUpperCase() as iRestMethods;
            const table = req.params.table;
            let primary = req.params.primary;
            // Support Axios interceptor promoting large GETs to POST with ?METHOD=GET
            const methodOverrideRaw = (req.query?.METHOD ?? req.query?.method) as unknown;
            const methodOverride = typeof methodOverrideRaw === 'string' ? methodOverrideRaw.toUpperCase() : undefined;

            const treatAsGet = incomingMethod === 'POST' && methodOverride === 'GET';

            const method: iRestMethods = treatAsGet ? 'GET' : incomingMethod;
            const payload: any = treatAsGet ? {...(req.body as any)} : (method === 'GET' ? req.query : req.body);

            // Remove transport-only METHOD flag so it never leaks into ORM parsing
            if (treatAsGet && 'METHOD' in payload) {
                try {
                    delete (payload as any).METHOD
                } catch { /* noop */
                }
            }

            // Warn for unsupported overrides but continue normally
            if (incomingMethod !== 'GET' && methodOverride && methodOverride !== 'GET') {
                logWithLevel(
                    LogLevel.WARN,
                    undefined,
                    console.warn,
                    `Ignoring unsupported METHOD override: ${methodOverride}`,
                );
            }

            if (!(table in C6.TABLES)) {
                res.status(400).json({error: `Invalid table: ${table}`});
                return;
            }

            const restModel = C6.TABLES[table];
            const primaryKeys = restModel.PRIMARY;
            const primaryShortKeys = restModel.PRIMARY_SHORT ?? [];
            const columnMap = restModel.COLUMNS ?? {};
            const resolveShortKey = (fullKey: string, index: number) =>
                (columnMap as any)[fullKey] ?? primaryShortKeys[index] ?? fullKey.split('.').pop() ?? fullKey;
            const hasPrimaryKeyValues = (data: any) => {
                if (!data || typeof data !== 'object') return false;
                const whereClause = (data as any)[C6C.WHERE];
                const hasKeyValue = (obj: any, fullKey: string, shortKey: string) => {
                    if (!obj || typeof obj !== 'object') return false;
                    const fullValue = obj[fullKey];
                    if (fullValue !== undefined && fullValue !== null) return true;
                    const shortValue = shortKey ? obj[shortKey] : undefined;
                    return shortValue !== undefined && shortValue !== null;
                };
                return primaryKeys.every((fullKey, index) => {
                    const shortKey = resolveShortKey(fullKey, index);
                    return hasKeyValue(whereClause, fullKey, shortKey) || hasKeyValue(data, fullKey, shortKey);
                });
            };

            if (primary && primaryKeys.length !== 1) {
                if (primaryKeys.length > 1 && hasPrimaryKeyValues(payload)) {
                    primary = undefined;
                } else if (primaryKeys.length > 1) {
                    res.status(400).json({error: `Table ${table} has multiple primary keys. Cannot implicitly determine key.`});
                    return;
                } else {
                    res.status(400).json({
                        error: `Table ${table} has no primary keys. Please specify one.`
                    });
                    return;
                }
            }

            const primaryKeyName = primaryKeys[0];

            // If a primary key was provided in the URL, merge it into the payload.
            // Support both complex requests using WHERE and singular requests
            // where the primary key lives at the root of the payload.
            if (primary) {
                if (payload[C6C.WHERE]) {
                    payload[C6C.WHERE][primaryKeyName] =
                        payload[C6C.WHERE][primaryKeyName] ?? primary;
                } else {
                    (payload as any)[primaryKeyName] =
                        (payload as any)[primaryKeyName] ?? primary;
                }
            }

            const response = await restRequest({
                ...config,
                requestMethod: method,
                restModel: C6.TABLES[table]
            })(payload);

            res.status(200).json({success: true, ...response});

        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            logWithLevel(LogLevel.ERROR, undefined, console.error, message);
            res.status(500).json({success: false, error: message});
        }
    };
}
