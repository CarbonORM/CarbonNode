import restRequest from "./restRequest";
import { OrmGenerics } from "./types/ormGenerics";
import { iC6RestfulModel, iRest, iRestMethods } from "./types/ormInterfaces";

type iCallRest = "Get" | "Put" | "Post" | "Delete";

type RestOrmReturnType<G extends Omit<OrmGenerics, "requestMethod">> = {
    [key in iCallRest]: ReturnType<typeof restRequest<G>>;
} & iC6RestfulModel<G['RestShortTableName'], G['RestTableInterface'], G['PrimaryKey']>;

export function restOrm<
    G extends Omit<OrmGenerics, "requestMethod">
>(
    configFn: () => (
        Omit<iRest<G['RestShortTableName'], G['RestTableInterface'], G['PrimaryKey']>, "requestMethod">
        )
): RestOrmReturnType<G> {

    const methods: iRestMethods[] = ["GET", "PUT", "POST", "DELETE"];

    const userConfig = configFn();

    const restMethods = methods.reduce((acc, method) => ({
        ...acc,
        [method[0] + method.slice(1).toLowerCase()]: restRequest<G>(() => ({
            ...userConfig,
            requestMethod: method as iRestMethods,
        }))
    }), {} as { [key in iCallRest]: ReturnType<typeof restRequest<G>> });

    return {
        ...userConfig.restModel,
        ...restMethods,
    };
}
