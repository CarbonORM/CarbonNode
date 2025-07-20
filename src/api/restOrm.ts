import restRequest from "./restRequest";
import {OrmGenerics} from "./types/ormGenerics";
import {iRest} from "./types/ormInterfaces";

export function restOrm<
    G extends Omit<OrmGenerics, "requestMethod">
>(
    configFn: () =>
        Omit<iRest<G['RestShortTableName'], G['RestTableInterface'], G['PrimaryKey']>, "requestMethod">
) {

    return {
        Get: restRequest<G & { requestMethod: "GET" }>(() => ({
            ...configFn(),
            requestMethod: "GET"
        })),
        Put: restRequest<G & { requestMethod: "PUT" }>(() => ({
            ...configFn(),
            requestMethod: "PUT"
        })),
        Post: restRequest<G & { requestMethod: "POST" }>(() => ({
            ...configFn(),
            requestMethod: "POST"
        })),
        Delete: restRequest<G & { requestMethod: "DELETE" }>(() => ({
            ...configFn(),
            requestMethod: "DELETE"
        }))
    };

}
