import restRequest from "./restRequest";
import {OrmGenerics} from "./types/ormGenerics";
import {iRest, iRestMethods} from "./types/ormInterfaces";

type iCallRest = "Get" | "Put" | "Post" | "Delete";

export function restOrm<
    G extends Omit<OrmGenerics, "requestMethod">
>(
    configFn: () =>
        Omit<iRest<G['RestShortTableName'], G['RestTableInterface'], G['PrimaryKey']>, "requestMethod">
): {
    [key in iCallRest]: ReturnType<typeof restRequest<G>>;
} {

    const methods: iRestMethods[] = ["GET", "PUT", "POST", "DELETE"];

    return methods.reduce((acc, method) => ({
        ...acc,
        [method[0] + method.slice(1).toLowerCase()]: restRequest<G>(() => ({
            // configFn - absolutely must be called and deconstructed here, not earlier
            ...configFn(),
            requestMethod: method as iRestMethods,
        }))
    }), {} as { [key in iCallRest]: ReturnType<typeof restRequest<G>> })
}
