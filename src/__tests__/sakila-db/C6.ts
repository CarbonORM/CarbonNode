// noinspection JSUnusedGlobalSymbols,SpellCheckingInspection

import "./C6.generated/tables";
// @ts-ignore createScopedC6Proxy is available in CarbonNode >= 7.0.0
import { createScopedC6Proxy } from "@carbonorm/carbonnode";
import {
    C6Core,
    GLOBAL_REST_PARAMETERS,
} from "./C6.generated/core";
import { SCOPED_C6_BY_DATABASE } from "./C6.generated/scoped";

export {
    COLUMNS,
    GLOBAL_REST_PARAMETERS,
    initialRestfulObjectsState,
    RestTablePrefix,
    TABLES,
} from "./C6.generated/core";
export type {
    iRestfulObjectArrayTypes,
    RestShortTableNames,
    RestTableInterfaces,
    RestTableNames,
    tRestfulObjectArrayValues,
    tStatefulApiData,
} from "./C6.generated/core";
export * from "./C6.generated/tables";

export const C6 = createScopedC6Proxy(C6Core, GLOBAL_REST_PARAMETERS, {
    scopedC6ByDatabase: SCOPED_C6_BY_DATABASE,
});
