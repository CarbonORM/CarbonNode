import type {Request, Response, Router} from "express";
import {C6C} from "../constants/C6Constants";
import restRequest from "../api/restRequest";
import {iRest, iRestMethods} from "../types/ormInterfaces";
import {LogLevel, logWithLevel} from "../utils/logLevel";
import {OrmGenerics} from "../types/ormGenerics";
import {resolveDatabaseSelection, stripDatabaseKeyFromRequest} from "../api/databaseResolver";
import {validateQueryRequest} from '../utils/querySafety';


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
            const baseConfig = typeof configX === "function" ? configX() : configX;

            const incomingMethod = req.method.toUpperCase() as iRestMethods;
            const table = req.params.table;
            let primary = req.params.primary;
            // Support Axios interceptor promoting large GETs to POST with ?METHOD=GET
            const methodOverrideRaw = (req.query?.METHOD ?? req.query?.method) as unknown;
            const methodOverride = typeof methodOverrideRaw === 'string' ? methodOverrideRaw.toUpperCase() : undefined;

            const treatAsGet = incomingMethod === 'POST' && methodOverride === 'GET';

            const method: iRestMethods = treatAsGet ? 'GET' : incomingMethod;
            const payload: any = {...(treatAsGet ? req.body : (method === 'GET' ? req.query : req.body))};
            delete payload.debug;

            // Query strings are text; coerce known boolean controls.
            if (typeof payload?.cacheResults === "string") {
                const normalized = payload.cacheResults.toLowerCase();
                if (normalized === "false") payload.cacheResults = false;
                if (normalized === "true") payload.cacheResults = true;
            }

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

            const { config: selectedConfig } = resolveDatabaseSelection(baseConfig as any, payload);
            // Restrict the entire expression surface, not just the route's root table.
            // Views can otherwise be reached through JOIN and scalar/derived SELECTs.
            const allowedViews = selectedConfig.restViewAllowlist ?? [];
            const config = {
                ...selectedConfig,
                enforceRestFunctionPolicy: true,
                statementTimeoutMs: selectedConfig.statementTimeoutMs ?? 5000,
                C6: {
                    ...selectedConfig.C6,
                    TABLES: Object.fromEntries(Object.entries(selectedConfig.C6.TABLES).filter(([name, model]) =>
                        (model as any).RELATION_TYPE !== 'VIEW' || allowedViews.includes(name))),
                },
            };
            const { C6 } = config;
            validateQueryRequest(payload, config);

            if (!Object.prototype.hasOwnProperty.call(C6.TABLES, table)) {
                res.status(400).json({error: `Invalid table: ${table}`});
                return;
            }

            const restModel = C6.TABLES[table];
            const primaryKeys = restModel.PRIMARY;
            const primaryShortKeys = restModel.PRIMARY_SHORT ?? [];
            const columnMap = restModel.COLUMNS ?? {};
            const resolveShortKey = (fullKey: string, index: number) =>
                (columnMap as any)[fullKey] ?? primaryShortKeys[index] ?? fullKey.split('.').pop() ?? fullKey;
            if (primary !== undefined && primaryKeys.length !== 1) {
                if (primaryKeys.length > 1) {
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

            // URL identity is authoritative, including complex WHERE requests.
            if (primary !== undefined) {
                const shortKey = resolveShortKey(primaryKeyName, 0);
                if (payload[C6C.WHERE] || payload[C6C.SELECT] || payload[C6C.UPDATE] || payload[C6C.DELETE]) {
                    const existing = payload[C6C.WHERE];
                    const routeCondition = { [primaryKeyName]: [C6C.EQUAL, [C6C.LIT, primary]] };
                    payload[C6C.WHERE] = existing
                        ? { [C6C.AND]: [existing, routeCondition] }
                        : routeCondition;
                    delete payload[shortKey];
                    delete payload[primaryKeyName];
                } else {
                    delete payload[shortKey];
                    payload[primaryKeyName] = primary;
                }
            }

            const response = await restRequest({
                ...config,
                // Selection is already resolved. Do not reapply a database entry's
                // original C6 and restore views excluded at this REST boundary.
                databases: undefined,
                defaultDatabase: undefined,
                requestMethod: method,
                restModel: C6.TABLES[table]
            })(stripDatabaseKeyFromRequest(payload));

            const {sql: _sql, ...publicResponse} = response as any;
            res.status(200).json({success: true, ...publicResponse});

        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            logWithLevel(LogLevel.ERROR, undefined, console.error, message);
            res.status(500).json({success: false, error: "Request failed"});
        }
    };
}
