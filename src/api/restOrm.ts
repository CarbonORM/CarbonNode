import restRequest from "./restRequest";
import {OrmGenerics} from "../types/ormGenerics";
import {iRest, iRestMethods} from "../types/ormInterfaces";

type WithMethod<G extends Omit<OrmGenerics, "RequestMethod">, M extends iRestMethods> =
    Omit<G, "RequestMethod"> & { RequestMethod: M };

export function restOrm<G extends Omit<OrmGenerics, "RequestMethod">>(
    configFn: () => Omit<iRest<G['RestShortTableName'], G['RestTableInterface'], G['PrimaryKey']>, "requestMethod">
) {
    return {
        Get: restRequest<WithMethod<G, "GET">>(() => ({
            ...configFn(),
            requestMethod: "GET"
        })),
        Put: restRequest<WithMethod<G, "PUT">>(() => ({
            ...configFn(),
            requestMethod: "PUT"
        })),
        Post: restRequest<WithMethod<G, "POST">>(() => ({
            ...configFn(),
            requestMethod: "POST"
        })),
        Delete: restRequest<WithMethod<G, "DELETE">>(() => ({
            ...configFn(),
            requestMethod: "DELETE"
        }))
    };
}
