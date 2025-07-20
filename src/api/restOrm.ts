import restRequest from "./restRequest";
import {OrmGenerics} from "./types/ormGenerics";
import {iRest} from "./types/ormInterfaces";

export function restOrm<
    G extends Omit<OrmGenerics, "RequestMethod">
>(
    configFn: () =>
        Omit<iRest<G['RestShortTableName'], G['RestTableInterface'], G['PrimaryKey']>, "requestMethod">
) {

    return {
        Get: restRequest<G & { RequestMethod: "GET" }>(() => ({
            ...configFn(),
            requestMethod: "GET"
        })),
        Put: restRequest<G & { RequestMethod: "PUT" }>(() => ({
            ...configFn(),
            requestMethod: "PUT"
        })),
        Post: restRequest<G & { RequestMethod: "POST" }>(() => ({
            ...configFn(),
            requestMethod: "POST"
        })),
        Delete: restRequest<G & { RequestMethod: "DELETE" }>(() => ({
            ...configFn(),
            requestMethod: "DELETE"
        }))
    };

}
