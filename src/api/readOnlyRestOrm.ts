import restRequest from "./restRequest";
import {OrmGenerics} from "../types/ormGenerics";
import {iRest} from "../types/ormInterfaces";

type WithGetMethod<G extends Omit<OrmGenerics, "RequestMethod">> =
    Omit<G, "RequestMethod"> & { RequestMethod: "GET" };

export function readOnlyRestOrm<G extends Omit<OrmGenerics, "RequestMethod">>(
    configFn: () => Omit<iRest<G['RestShortTableName'], G['RestTableInterface'], G['PrimaryKey']>, "requestMethod">
) {
    return {
        Get: restRequest<WithGetMethod<G>>(() => ({
            ...configFn(),
            requestMethod: "GET",
        })),
    };
}
