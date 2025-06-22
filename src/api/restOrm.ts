import restRequest from "./restRequest";
import { iRest, iRestMethods } from "./types/ormInterfaces";

export function restOrm<
    RestShortTableName extends string = any,
    RestTableInterface extends { [key: string]: any } = any,
    PrimaryKey extends Extract<keyof RestTableInterface, string> = Extract<keyof RestTableInterface, string>,
    CustomAndRequiredFields extends { [key: string]: any } = any,
    RequestTableOverrides extends { [key in keyof RestTableInterface]: any } = { [key in keyof RestTableInterface]: any }
>(config: () => Omit<iRest<RestShortTableName, RestTableInterface, PrimaryKey>, "requestMethod">) {

    const methods: iRestMethods[] = ["GET", "PUT", "POST", "DELETE"];

    return Object.fromEntries(
        methods.map(method => [
            method[0] + method.slice(1).toLowerCase(), // Capitalize e.g. "Get"
            restRequest<
                typeof method,
                RestShortTableName,
                RestTableInterface,
                PrimaryKey,
                CustomAndRequiredFields,
                RequestTableOverrides
            >(() => ({
                ...config(),
                requestMethod: method as iRestMethods,
            }))
        ])
    )
}
