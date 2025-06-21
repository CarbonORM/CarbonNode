import isNode from '../variables/isNode';
import {
    apiReturn, DetermineResponseDataType,
    iRest, iRestMethods, RequestQueryBody
} from "./types/ormInterfaces";

/**
 * Facade: routes API calls to SQL or HTTP executors based on runtime context.
 */
export default function restRequest<
    RequestMethod extends iRestMethods,
    RestShortTableName extends string = any,
    RestTableInterface extends { [key: string]: any } = any,
    PrimaryKey extends Extract<keyof RestTableInterface, string> = Extract<keyof RestTableInterface, string>,
    CustomAndRequiredFields extends { [key: string]: any } = any,
    RequestTableOverrides extends { [key in keyof RestTableInterface]: any } = { [key in keyof RestTableInterface]: any }
>(
    configFn: () => iRest<
        RestShortTableName,
        RestTableInterface,
        PrimaryKey
    >
) {
    return async (
        request: RequestQueryBody<
            RequestMethod,
            RestTableInterface,
            CustomAndRequiredFields,
            RequestTableOverrides
        >,
    ): Promise<apiReturn<DetermineResponseDataType<RequestMethod, RestTableInterface>>> => {

        const config = configFn();

        // SQL path if on Node with a provided pool
        if (isNode && config.mysqlPool) {
            const {SqlExecutor} = await import('./executors/SqlExecutor');
            const executor = new SqlExecutor<
                RequestMethod,
                RestShortTableName,
                RestTableInterface,
                PrimaryKey,
                CustomAndRequiredFields,
                RequestTableOverrides
            >(config, request);
            return executor.execute();
        }

        // HTTP path fallback
        const {HttpExecutor} = await import('./executors/HttpExecutor');
        const http = new HttpExecutor<
            RequestMethod,
            RestShortTableName,
            RestTableInterface,
            PrimaryKey,
            CustomAndRequiredFields,
            RequestTableOverrides
        >(config, request);
        return http.execute();
    };
}

