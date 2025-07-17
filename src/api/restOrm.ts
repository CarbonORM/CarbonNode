import restRequest from "./restRequest";
import {OrmGenerics} from "./types/ormGenerics";
import {iRest, iRestMethods} from "./types/ormInterfaces";

export function restOrm<
    G extends Omit<OrmGenerics, "requestMethod">
>(
    configFn: () => (
        Omit<iRest<G['RestShortTableName'], G['RestTableInterface'], G['PrimaryKey']>, "requestMethod">
        )
) {

    const methods: iRestMethods[] = ["GET", "PUT", "POST", "DELETE"];

    // this is so runtime variables can be used in the restOrm function and not just constants
    const userConfig = configFn();

    return {
        ...userConfig.restModel,
        ...Object.fromEntries(
            methods.map(method => [
                method[0] + method.slice(1).toLowerCase(), // Capitalize e.g. "Get"
                restRequest<G>(() => ({
                    ...userConfig,
                    requestMethod: method as iRestMethods,
                }))
            ])
        )
    }
}
