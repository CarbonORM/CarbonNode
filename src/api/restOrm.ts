import restRequest from "./restRequest";
import {iRest} from "./types/ormInterfaces";

export function restOrm<
    RestShortTableName extends string = any,
    RestTableInterface extends { [key: string]: any } = any,
    PrimaryKey extends Extract<keyof RestTableInterface, string> = Extract<keyof RestTableInterface, string>,
    CustomAndRequiredFields extends { [key: string]: any } = any,
    RequestTableOverrides extends { [key in keyof RestTableInterface]: any } = { [key in keyof RestTableInterface]: any }
>(config: Omit<iRest<
    RestShortTableName,
    RestTableInterface,
    PrimaryKey
>, "requestMethod">) {
    return {
        Get: restRequest<
            "GET",
            RestShortTableName,
            RestTableInterface,
            PrimaryKey,
            CustomAndRequiredFields,
            RequestTableOverrides
        >({
            ...config,
            requestMethod: "GET",
        }),
        Put: restRequest<
            "PUT",
            RestShortTableName,
            RestTableInterface,
            PrimaryKey,
            CustomAndRequiredFields,
            RequestTableOverrides
        >({
            ...config,
            requestMethod: "PUT",
        }),
        Post: restRequest<
            "POST",
            RestShortTableName,
            RestTableInterface,
            PrimaryKey,
            CustomAndRequiredFields,
            RequestTableOverrides
        >({
                ...config,
                requestMethod: "POST",
            }),
        Delete: restRequest<
            "DELETE",
            RestShortTableName,
            RestTableInterface,
            PrimaryKey,
            CustomAndRequiredFields,
            RequestTableOverrides
        >({
            ...config,
            requestMethod: "DELETE",
        }),
    }
}
