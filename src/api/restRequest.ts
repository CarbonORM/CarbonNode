import isNode from '../variables/isNode';
import {Modify} from "./types/modifyTypes";
import {apiReturn, iAPI, iRest} from "./types/ormInterfaces";

/**
 * Facade: routes API calls to SQL or HTTP executors based on runtime context.
 */
export default function restRequest<
    RestShortTableName extends string = any,
    RestTableInterface extends { [key: string]: any } = any,
    PrimaryKey extends Extract<keyof RestTableInterface, string> = Extract<keyof RestTableInterface, string>,
    CustomAndRequiredFields extends { [key: string]: any } = any,
    RequestTableOverrides extends { [key: string]: any } = { [key in keyof RestTableInterface]: any },
    ResponseDataType = any
>(
    config: iRest<
        RestShortTableName,
        RestTableInterface,
        PrimaryKey,
        CustomAndRequiredFields,
        RequestTableOverrides,
        ResponseDataType
    >
) {
    return async (
        request: iAPI<Modify<RestTableInterface, RequestTableOverrides>> & CustomAndRequiredFields = {} as iAPI<Modify<RestTableInterface, RequestTableOverrides>> & CustomAndRequiredFields
    ): Promise<apiReturn<ResponseDataType>> => {

        // SQL path if on Node with a provided pool
        if (isNode && config.mysqlPool) {
            const {SqlExecutor} = await import('./executors/SqlExecutor');
            const executor = new SqlExecutor<
                RestShortTableName,
                RestTableInterface,
                PrimaryKey,
                CustomAndRequiredFields,
                RequestTableOverrides,
                ResponseDataType
            >(config, request);
            return executor.execute();
        }

        // HTTP path fallback
        const {HttpExecutor} = await import('./executors/HttpExecutor');
        const http = new HttpExecutor<
            RestShortTableName,
            RestTableInterface,
            PrimaryKey,
            CustomAndRequiredFields,
            RequestTableOverrides,
            ResponseDataType
        >(config, request);
        return http.execute();
    };
}
