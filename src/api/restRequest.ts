import isNode from '../variables/isNode';
import isVerbose from '../variables/isVerbose';
import {OrmGenerics} from "../types/ormGenerics";
import {
    DetermineResponseDataType,
    iRest, RequestQueryBody
} from "../types/ormInterfaces";

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
        >,
    ): Promise<DetermineResponseDataType<G['RequestMethod'], G['RestTableInterface']>> => {

        const config = typeof configX === "function" ? configX() : configX;

        config.verbose ??= isVerbose(); // Default to env-driven verbosity if not set

        if (!config.mysqlPool && !config.axios) {
            throw new Error("No execution method available: neither mysqlPool nor axios instance provided in config.");
        }

        // SQL path if on Node with a provided pool
        if (config.mysqlPool) {
            config.verbose && console.log("Using SQL Executor");
            const {SqlExecutor} = await import('../executors/SqlExecutor');
            const executor = new SqlExecutor<G>(config, request);
            return executor.execute();
        }

        config.verbose && console.log("Using HTTP Executor", {
            isNode: isNode(),
        });

        // HTTP path fallback
        const {HttpExecutor} = await import('../executors/HttpExecutor');
        const http = new HttpExecutor<G>(config, request);
        return http.execute();
    };
}
