import restRequest from "./restRequest";
import {OrmGenerics} from "./types/ormGenerics";
import { iRest, iRestMethods } from "./types/ormInterfaces";

export function restOrm<
    G extends Omit<OrmGenerics, "requestMethod">
>(config: () => Omit<iRest<G['RestShortTableName'], G['RestTableInterface'], G['PrimaryKey']>, "requestMethod">) {

    const methods: iRestMethods[] = ["GET", "PUT", "POST", "DELETE"];

    return Object.fromEntries(
        methods.map(method => [
            method[0] + method.slice(1).toLowerCase(), // Capitalize e.g. "Get"
            restRequest<G>(() => ({
                ...config(),
                requestMethod: method as iRestMethods,
            }))
        ])
    )
}
