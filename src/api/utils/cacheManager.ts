import {AxiosPromise} from "axios";
import { iCacheAPI } from "../types/ormInterfaces";

// do not remove entries from this array. It is used to track the progress of API requests.
// position in array is important. Do not sort. To not add to begging.
export let apiRequestCache: iCacheAPI[] = [];

export let userCustomClearCache: (() => void)[] = [];

interface iClearCache {
    ignoreWarning: boolean
}

export function clearCache(props?: iClearCache) {

    if (false === props?.ignoreWarning) {

        console.warn('The rest api clearCache should only be used with extreme care! Avoid using this in favor of using `cacheResults : boolean`.')

    }

    userCustomClearCache.map((f) => 'function' === typeof f && f());

    userCustomClearCache = apiRequestCache = []

}

export function checkCache<ResponseDataType = any, RestShortTableNames = string>(cacheResult: iCacheAPI<ResponseDataType>, requestMethod: string, tableName: RestShortTableNames | RestShortTableNames[], request: any): false | AxiosPromise<ResponseDataType> {

    if (undefined === cacheResult) {

        return false;

    }

    console.groupCollapsed('%c API: The request on (' + tableName + ') is in cache. Returning the request Promise!', 'color: #0c0')

    console.log('%c ' + requestMethod + ' ' + tableName, 'color: #0c0')

    console.log('%c Request Data (note you may see the success and/or error prompt):', 'color: #0c0', request)

    console.groupEnd()

    return cacheResult.request;

}
