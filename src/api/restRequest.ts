import isNode from '../variables/isNode';
import {OrmGenerics} from "../types/ormGenerics";
import {
    DetermineResponseDataType,
    iRest, RequestQueryBody
} from "../types/ormInterfaces";
import {applyLogLevelDefaults, getLogContext, LogLevel, logWithLevel} from "../utils/logLevel";
import {resolveRestConfigForRequest, stripDatabaseKeyFromRequest} from "./databaseResolver";
import {validateQueryRequest} from '../utils/querySafety';

/**
 * Facade: routes API calls to SQL or HTTP executors based on runtime context.
 */
export default function restRequest<
    G extends OrmGenerics
>(
    configX: (() => iRest<
        G['RestTableInterface'],
        G['RestShortTableName'],
        G['PrimaryKey']
    >) | iRest<
        G['RestShortTableName'],
        G['RestTableInterface'],
        G['PrimaryKey']
    >
) {
    return async (
        request: RequestQueryBody<
            G['RequestMethod'],
            G['RestTableInterface'],
            G['CustomAndRequiredFields'],
            G['RequestTableOverrides']
        > | (Partial<G['RestTableInterface']> & {
            [Table in G['RestShortTableName'] & string]?: Partial<G['RestTableInterface']>
        }),
    ): Promise<DetermineResponseDataType<G['RequestMethod'], G['RestTableInterface']>> => {

        const baseConfig = {...(typeof configX === "function" ? configX() : configX)};
        const { config } = resolveRestConfigForRequest(baseConfig as any, request as any);
        validateQueryRequest(request, config);

        if ((config.restModel as any)?.READ_ONLY === true && config.requestMethod !== "GET") {
            const relationName = (config.restModel as any)?.TABLE_NAME ?? "relation";
            throw new Error(`Relation '${relationName}' is read-only and only supports GET requests.`);
        }

        applyLogLevelDefaults(config, request);

        const logContext = getLogContext(config, request);

        if (!config.mysqlPool && !config.postgresPool && !config.axios) {
            throw new Error("No execution method available: neither mysqlPool, postgresPool, nor axios instance provided in config.");
        }

        // SQL path if on Node with a provided pool
        if (config.mysqlPool || config.postgresPool) {
            logWithLevel(LogLevel.DEBUG, logContext, console.log, "Using SQL Executor");
            const {SqlExecutor} = await import('../executors/SqlExecutor');
            const sanitizedRequest = stripDatabaseKeyFromRequest(request);
            const executor = new SqlExecutor<G>(config as any, sanitizedRequest as any);
            return executor.execute();
        }

        logWithLevel(LogLevel.DEBUG, logContext, console.log, "Using HTTP Executor", {
            isNode: isNode(),
        });

        // HTTP path fallback
        const {HttpExecutor} = await import('../executors/HttpExecutor');
        const http = new HttpExecutor<G>(config as any, request as any);
        return http.execute();
    };
}
