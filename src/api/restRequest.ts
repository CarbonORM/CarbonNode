import isNode from '../variables/isNode';
import {OrmGenerics} from "./types/ormGenerics";
import {
    DetermineResponseDataType,
    iRest, RequestQueryBody
} from "./types/ormInterfaces";

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

        config.verbose ??= true; // Default to verbose logging if not set

        // SQL path if on Node with a provided pool
        if (isNode() && config.mysqlPool) {
            const {SqlExecutor} = await import('./executors/SqlExecutor');
            const executor = new SqlExecutor<G>(config, request);
            return executor.execute();
        }

        // HTTP path fallback
        const {HttpExecutor} = await import('./executors/HttpExecutor');
        const http = new HttpExecutor<G>(config, request);
        return http.execute();
    };
}

