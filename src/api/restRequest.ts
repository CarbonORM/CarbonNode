import isNode from '../variables/isNode';
import {Modify} from "./types/modifyTypes";
import {apiReturn, iAPI, iRest} from "./types/ormInterfaces";

/**
 * Facade: routes API calls to SQL or HTTP executors based on runtime context.
 */
export default function restRequest<
    CustomAndRequiredFields extends {
        [key: string]: any;
    } = any,
    RestTableInterfaces extends {
        [key: string]: any
    } = any,
    RequestTableOverrides extends {
        [key: string]: any;
    } = any,
    ResponseDataType = any,
    RestShortTableNames extends string = any
>(
    config: iRest<CustomAndRequiredFields, RestTableInterfaces, RequestTableOverrides, ResponseDataType, RestShortTableNames>
) {
    return async (
        request: iAPI<Modify<RestTableInterfaces, RequestTableOverrides>> & CustomAndRequiredFields = {} as iAPI<Modify<RestTableInterfaces, RequestTableOverrides>> & CustomAndRequiredFields
    ): Promise<apiReturn<ResponseDataType>> => {

        // SQL path if on Node with a provided pool
        if (isNode && config.mysqlPool) {
            const {SqlExecutor} = await import('./executors/SqlExecutor');
            const executor = new SqlExecutor<CustomAndRequiredFields, RestTableInterfaces, RequestTableOverrides, ResponseDataType, RestShortTableNames>(config, request);
            return executor.execute();
        }

        // HTTP path fallback
        const {HttpExecutor} = await import('./executors/HttpExecutor');
        const http = new HttpExecutor<CustomAndRequiredFields, RestTableInterfaces, RequestTableOverrides, ResponseDataType, RestShortTableNames>(config, request);
        return http.execute();
    };
}
