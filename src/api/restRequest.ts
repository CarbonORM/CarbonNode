import axiosInstance from "api/axiosInstance";
import convertForRequestBody from "api/convertForRequestBody";
import {iC6RestfulModel, iConstraint, iRestApiFunctions} from "api/interfaces/ormInterfaces";
import {AxiosInstance, AxiosPromise, AxiosResponse} from "axios";

import {toast} from "react-toastify";
import isLocal from "variables/isLocal";
import isTest from "variables/isTest";
import isVerbose from "variables/isVerbose";
import {toastOptions, toastOptionsDevs} from "variables/toastOptions";

// When we capture DropExceptions and display them as a custom page, this will change.
export function TestRestfulResponse(response: AxiosResponse | any, success: ((r: AxiosResponse) => (string | void)) | string | undefined, error: ((r: AxiosResponse) => (string | void)) | string | undefined): string | boolean | number {

    if (undefined === response.data?.['ERROR TYPE']
        && (undefined !== response?.data?.rest
            || undefined !== response.data?.created
            || undefined !== response.data?.updated
            || undefined !== response.data?.deleted)) {

        let successReturn: string | undefined | void = 'function' === typeof success ? success?.(response) : success;

        if (typeof successReturn === 'string') {

            toast.success(successReturn, toastOptions);

        }

        // this could end up with bad results for deleting id's === 0
        return response.data.created ?? response.data.updated ?? response.data.deleted ?? true;

    }

    let errorReturn: string | undefined | void = 'function' === typeof error ? error?.(response) : error;

    if (typeof errorReturn === 'string') {

        toast.error(errorReturn, toastOptions);

    }

    return false;


}

export function removeInvalidKeys<iRestObject>(request: any, c6Tables: {
    [key: string]: (iC6RestfulModel & { [key: string]: any })
}): iRestObject {

    let intersection: iRestObject = {} as iRestObject

    let restfulObjectKeys: string[] = [];

    const tableList = Object.values(c6Tables)

    tableList.forEach(table => Object.values(table.COLUMNS).forEach(column => {

        if (false === restfulObjectKeys.includes(column)) {

            restfulObjectKeys.push(column)

        }

    }))

    Object.keys(request).forEach(key => {

        if (restfulObjectKeys.includes(key)) {

            intersection[key] = request[key]

        }

    });

    isTest || console.log('intersection', intersection)

    return intersection

}

// if you can get away with modify over modifyDeep, use modify. The editor will be happier.
export type Modify<T, R> = Omit<T, keyof R> & R;

// @link https://stackoverflow.com/questions/41285211/overriding-interface-property-type-defined-in-typescript-d-ts-file/55032655#55032655
export type ModifyDeep<A, B extends DeepPartialAny<A>> = {
    [K in keyof A | keyof B]?:          // For all keys in A and B:
    K extends keyof A                // ───┐
        ? K extends keyof B            // ───┼─ key K exists in both A and B
            ? A[K] extends AnyObject     //    │  ┴──┐
                ? B[K] extends AnyObject   //    │  ───┼─ both A and B are objects
                    ? ModifyDeep<A[K], B[K]> //    │     │  └─── We need to go deeper (recursively)
                    : B[K]                   //    │     ├─ B is a primitive 🠆 use B as the final type (new type)
                : B[K]                     //    │     └─ A is a primitive 🠆 use B as the final type (new type)
            : A[K]                       //    ├─ key only exists in A 🠆 use A as the final type (original type)
        : B[K]                         //    └─ key only exists in B 🠆 use B as the final type (new type)
}

type AnyObject = Record<string, any>

// This type is here only for some intellisense for the overrides object
type DeepPartialAny<T> = {
    /** Makes each property optional and turns each leaf property into any, allowing for type overrides by narrowing any. */
    [P in keyof T]?: T[P] extends AnyObject ? DeepPartialAny<T[P]> : any
}

export enum eFetchDependencies {
    NONE = 0,
    REFERENCED = 0b1,
    CHILDREN = 0b1,
    REFERENCES = 0b10,
    PARENTS = 0b10,
    ALL = 0b11,
    C6ENTITY = 0b100,
    RECURSIVE = 0b1000,
}

// todo - I don't like that these essentially become reserved words.
export type iAPI<RestTableInterfaces extends { [key: string]: any }> = RestTableInterfaces & {
    dataInsertMultipleRows?: RestTableInterfaces[],
    cacheResults?: boolean, // aka ignoreCache
    // todo - this should really only be used for get requests - add this to the Get interface or throw error (im actually inclined to ts ignore the function and add to iGetC6 atm; back later)
    fetchDependencies?: number | eFetchDependencies | Awaited<apiReturn<iGetC6RestResponse<any>>>[],
    debug?: boolean,
    success?: string | ((r: AxiosResponse) => (string | void)),
    error?: string | ((r: AxiosResponse) => (string | void)),
}

interface iCacheAPI<ResponseDataType = any> {
    requestArgumentsSerialized: string,
    request: AxiosPromise<ResponseDataType>,
    response?: AxiosResponse,
    final?: boolean,
}


// do not remove entries from this array. It is used to track the progress of API requests.
// position in array is important. Do not sort. To not add to begging.
let apiRequestCache: iCacheAPI[] = [];

let userCustomClearCache: (() => void)[] = [];

export function checkAllRequestsComplete(): true | (string[]) {

    const stillRunning = apiRequestCache.filter((cache) => undefined === cache.response)

    if (stillRunning.length !== 0) {

        if (document === null || document === undefined) {

            throw new Error('document is undefined while waiting for API requests to complete (' + JSON.stringify(apiRequestCache) + ')')

        }

        // when requests return emtpy sets in full renders, it may not be possible to track their progress.
        console.warn('stillRunning...', stillRunning)

        return stillRunning.map((cache) => cache.requestArgumentsSerialized)

    }

    return true

}


interface iClearCache {
    ignoreWarning: boolean
}


function checkCache<ResponseDataType = any, RestShortTableNames = string>(cacheResult: iCacheAPI<ResponseDataType>, requestMethod: string, tableName: RestShortTableNames | RestShortTableNames[], request: any): false | undefined | null | AxiosPromise<ResponseDataType> {

    if (undefined === cacheResult?.response) {

        console.groupCollapsed('%c API: The request on (' + tableName + ') is in cache and the response is undefined. The request has not finished. Returning the request Promise!', 'color: #0c0')

        console.log('%c ' + requestMethod + ' ' + tableName, 'color: #0c0')

        console.log('%c Request Data (note you may see the success and/or error prompt):', 'color: #0c0', request)

        console.groupEnd()

        return cacheResult.request;

    }

    if (true === cacheResult?.final) {

        if (false === isTest || true === isVerbose) {

            console.groupCollapsed('%c API: Rest api cache (' + requestMethod + '  ' + tableName + ') has reached the final result. Returning undefined!', 'color: #cc0')

            console.log('%c ' + requestMethod + ' ' + tableName, 'color: #cc0')

            console.log('%c Request Data (note you may see the success and/or error prompt):', 'color: #cc0', request)

            console.log('%c Response Data:', 'color: #cc0', cacheResult?.response?.data?.rest || cacheResult?.response?.data || cacheResult?.response)

            console.groupEnd()

        }

        return undefined;

    }

    return false;
}

function sortAndSerializeQueryObject(tables: String, query: Object) {
    const orderedQuery = Object.keys(query).sort().reduce(
        (obj, key) => {
            obj[key] = query[key];
            return obj;
        },
        {}
    );

    return tables + ' ' + JSON.stringify(orderedQuery);
}


export function clearCache(props?: iClearCache) {

    if (false === props?.ignoreWarning) {

        console.warn('The rest api clearCache should only be used with extreme care! Avoid using this in favor of using `cacheResults : boolean`.')

    }

    userCustomClearCache.map((f) => 'function' === typeof f && f());

    userCustomClearCache = apiRequestCache = []

}


export function removePrefixIfExists(tableName: string, prefix: string): string {
    if (tableName.startsWith(prefix.toLowerCase())) {
        return tableName.slice(prefix.length);
    }
    return tableName;
}

/**
 * the first argument ....
 *
 * Our api returns a zero argument function iff the method is get and the previous request reached the predefined limit.
 * This function can be aliased as GetNextPageOfResults(). If the end is reached undefined will be returned.
 *
 *
 * For POST, PUT, and DELETE requests one can expect the primary key of the new or modified index, or a boolean success
 * indication if no primary key exists.
 **/
export const POST = 'POST';

export const PUT = 'PUT';


export const GET = 'GET';


export const DELETE = 'DELETE';


export type iRestMethods = 'GET' | 'POST' | 'PUT' | 'DELETE';


//wip
export type RequestGetPutDeleteBody = {
    SELECT?: any,
    UPDATE?: any,
    DELETE?: any,
    WHERE?: any,
    JOIN?: {
        LEFT?: any,
        RIGHT?: any,
        INNER?: any,
    },
    PAGINATION?: {
        PAGE?: number,
        LIMIT?: number,
    }
}

export type RequestQueryBody<RestTableInterfaces extends { [key: string]: any }> =
    iAPI<RestTableInterfaces>
    | RequestGetPutDeleteBody;

export function isPromise(x) {
    return Object(x).constructor === Promise
}

interface iC6RestResponse<RestData> {
    rest: RestData,
    session?: any,
    sql?: any
}


interface iChangeC6Data {
    rowCount: number,
}

export interface iDeleteC6RestResponse<RestData = any, RequestData = any> extends iChangeC6Data, iC6RestResponse<RestData> {
    deleted: boolean | number | string | RequestData,
}

export interface iPostC6RestResponse<RestData = any> extends iC6RestResponse<RestData> {
    created: boolean | number | string,
}

export interface iPutC6RestResponse<RestData = any, RequestData = any> extends iChangeC6Data, iC6RestResponse<RestData> {
    updated: boolean | number | string | RequestData,
}

export interface iC6Object {
    C6VERSION: string,
    TABLES: {
        [key: string]: iC6RestfulModel &
            { [key: string]: string | number }
    },
    PREFIX: string,
    IMPORT: (tableName: string) => Promise<{
        default: iRestApiFunctions
    }>,

    [key: string]: any
}

export type iGetC6RestResponse<ResponseDataType, ResponseDataOverrides = {}> = iC6RestResponse<Modify<ResponseDataType, ResponseDataOverrides> | Modify<ResponseDataType, ResponseDataOverrides>[]>

// returning undefined means no more results are available, thus we've queried everything possible
// null means the request is currently being executed
// https://www.typescriptlang.org/docs/handbook/2/conditional-types.html
export type apiReturn<Response> =
    null
    | undefined
    | AxiosPromise<Response>
    | (Response extends iPutC6RestResponse | iDeleteC6RestResponse | iPostC6RestResponse ? null : (() => apiReturn<Response>))


interface iRest<CustomAndRequiredFields extends { [key: string]: any }, RestTableInterfaces extends {
    [key: string]: any
}, RequestTableOverrides = {
    [key in keyof RestTableInterfaces]: any
}, ResponseDataType = any,
    RestShortTableNames extends string = any> {
    C6: iC6Object,
    axios?: AxiosInstance,
    restURL?: string,
    withCredentials?: boolean,
    tableName: RestShortTableNames | RestShortTableNames[],
    requestMethod: iRestMethods,
    clearCache?: () => void,
    skipPrimaryCheck?: boolean,
    queryCallback: RequestQueryBody<Modify<RestTableInterfaces, RequestTableOverrides>> | ((request: iAPI<Modify<RestTableInterfaces, RequestTableOverrides>> & CustomAndRequiredFields) => (null | undefined | RequestQueryBody<Modify<RestTableInterfaces, RequestTableOverrides>>)),
    responseCallback: (response: AxiosResponse<ResponseDataType>,
                       request: iAPI<Modify<RestTableInterfaces, RequestTableOverrides>> & CustomAndRequiredFields,
                       success: (ResponseDataType extends iPutC6RestResponse | iDeleteC6RestResponse ? RequestQueryBody<Modify<RestTableInterfaces, RequestTableOverrides>> : string) | string | number | boolean) => any // keep this set to any, it allows easy arrow functions and the results unused here
}

export function extendedTypeHints<RestTableInterfaces extends {
    [key: string]: any
}, RestShortTableNames extends string>() {
    return <CustomAndRequiredFields extends {
        [key: string]: any
    } = any, RequestTableTypes extends RestTableInterfaces = any, RequestTableOverrides extends {
        [key: string]: any
    } = any, ResponseDataType extends {
        [key: string]: any
    } = any>(argv) => restApi<CustomAndRequiredFields, RequestTableTypes, RequestTableOverrides, ResponseDataType, RestShortTableNames>(argv)
}

export default function restApi<
    CustomAndRequiredFields extends {
        [key: string]: any;
    } = any,
    RestTableInterfaces extends {
        [key: string]: any
    } = any,
    RequestTableOverrides extends {
        [key: string]: any;
    } = any,
    ResponseDataType = any,
    RestShortTableNames extends string = any
>({
      C6,
      axios = axiosInstance,
      restURL = '/rest/',
      withCredentials = true,
      tableName,
      requestMethod = GET,
      queryCallback = {},
      responseCallback,
      skipPrimaryCheck = false,
      clearCache = undefined
  }: iRest<CustomAndRequiredFields, RestTableInterfaces, RequestTableOverrides, ResponseDataType, RestShortTableNames>
) {

    const fullTableList = Array.isArray(tableName) ? tableName : [tableName];

    const operatingTableFullName = fullTableList[0];

    const operatingTable = removePrefixIfExists(operatingTableFullName, C6.PREFIX);

    const tables = fullTableList.join(',')

    switch (requestMethod) {
        case GET:
        case POST:
        case PUT:
        case DELETE:
            break;
        default:
            throw Error('Bad request method passed to getApi')
    }

    if (null !== clearCache || undefined !== clearCache) {

        userCustomClearCache[tables + requestMethod] = clearCache;

    }

    return (request: iAPI<Modify<RestTableInterfaces, RequestTableOverrides>> & CustomAndRequiredFields = {} as iAPI<Modify<RestTableInterfaces, RequestTableOverrides>> & CustomAndRequiredFields) => {

        console.groupCollapsed('%c API: (' + requestMethod + ') Request for (' + operatingTable + ')', 'color: #0c0')

        console.log('request', request)

        console.groupEnd()

        // an undefined query would indicate queryCallback returned undefined,
        // thus the request shouldn't fire as is in custom cache
        let query: RequestQueryBody<Modify<RestTableInterfaces, RequestTableOverrides>> | undefined | null;

        if ('function' === typeof queryCallback) {

            query = queryCallback(request); // obj or obj[]

        } else {

            query = queryCallback;

        }

        if (undefined === query || null === query) {

            if (request.debug && isLocal) {

                toast.warning("DEV: queryCallback returned undefined, signaling in Custom Cache. (returning null)", toastOptionsDevs)

            }

            console.groupCollapsed('%c API: (' + requestMethod + ') Request Query for (' + operatingTable + ') undefined, returning null (will not fire ajax)!', 'color: #c00')

            console.log('%c Returning (undefined|null) for a query would indicate a custom cache hit (outside API.tsx), thus the request should not fire.', 'color: #c00')

            console.trace();

            console.groupEnd()

            return null;

        }

        if (C6.GET === requestMethod) {

            if (undefined === query[C6.PAGINATION]) {

                query[C6.PAGINATION] = {}

            }

            query[C6.PAGINATION][C6.PAGE] = query[C6.PAGINATION][C6.PAGE] || 1;

            query[C6.PAGINATION][C6.LIMIT] = query[C6.PAGINATION][C6.LIMIT] || 100;

        }

        // this could return itself with a new page number, or undefined if the end is reached
        function apiRequest(): apiReturn<ResponseDataType> {

            request.cacheResults ??= (C6.GET === requestMethod)

            if (C6.GET === requestMethod
                && undefined !== query?.[C6.PAGINATION]?.[C6.PAGE]
                && 1 !== query[C6.PAGINATION][C6.PAGE]) {

                console.groupCollapsed('Request on table (' + tableName + ') is firing for page (' + query[C6.PAGINATION][C6.PAGE] + '), please wait!')

                console.log('Request Data (note you may see the success and/or error prompt):', request)

                console.trace();

                console.groupEnd()

            }

            // The problem with creating cache keys with a stringified object is the order of keys matters and it's possible for the same query to be stringified differently.
            // Here we ensure the key order will be identical between two of the same requests. https://stackoverflow.com/questions/5467129/sort-javascript-object-by-key

            // literally impossible for query to be undefined or null here but the editor is too busy licking windows to understand that
            let querySerialized: string = sortAndSerializeQueryObject(tables, query ?? {});

            let cacheResult: iCacheAPI | undefined = apiRequestCache.find(cache => cache.requestArgumentsSerialized === querySerialized);

            let cachingConfirmed = false;

            // determine if we need to paginate.
            if (requestMethod === C6.GET) {

                if (undefined === query?.[C6.PAGINATION]) {

                    if (undefined === query || null === query) {

                        query = {}

                    }

                    query[C6.PAGINATION] = {}

                }

                query[C6.PAGINATION][C6.PAGE] = query[C6.PAGINATION][C6.PAGE] || 1;

                query[C6.PAGINATION][C6.LIMIT] = query[C6.PAGINATION][C6.LIMIT] || 100;

                // this will evaluate true most the time
                if (true === request.cacheResults) {

                    // just find the next, non-fetched, page and return a function to request it
                    if (undefined !== cacheResult) {

                        do {

                            const cacheCheck = checkCache<ResponseDataType>(cacheResult, requestMethod, tableName, request);

                            if (false !== cacheCheck) {

                                return cacheCheck;

                            }

                            // this line incrementing page is why we return recursively
                            ++query[C6.PAGINATION][C6.PAGE];

                            // this json stringify is to capture the new page number
                            querySerialized = sortAndSerializeQueryObject(tables, query ?? {});

                            cacheResult = apiRequestCache.find(cache => cache.requestArgumentsSerialized === querySerialized)

                        } while (undefined !== cacheResult)

                        if (request.debug && isLocal) {

                            toast.warning("DEVS: Request in cache. (" + apiRequestCache.findIndex(cache => cache.requestArgumentsSerialized === querySerialized) + "). Returning function to request page (" + query[C6.PAGINATION][C6.PAGE] + ")", toastOptionsDevs);

                        }

                        // @ts-ignore - this is an incorrect warning on TS, it's well typed
                        return apiRequest;

                    }

                    cachingConfirmed = true;

                } else {

                    if (request.debug && isLocal) {

                        toast.info("DEVS: Ignore cache was set to true.", toastOptionsDevs);

                    }

                }

                if (request.debug && isLocal) {

                    toast.success("DEVS: Request not in cache." + (requestMethod === C6.GET ? "Page (" + query[C6.PAGINATION][C6.PAGE] + ")." : '') + " Logging cache 2 console.", toastOptionsDevs);

                }

            } else if (request.cacheResults) { // if we are not getting, we are updating, deleting, or inserting

                if (cacheResult) {
                    const cacheCheck = checkCache<ResponseDataType>(cacheResult, requestMethod, tableName, request);

                    if (false !== cacheCheck) {

                        return cacheCheck;

                    }
                }

                cachingConfirmed = true;
                // push to cache so we do not repeat the request

            }

            let addBackPK: (() => void) | undefined;

            let apiResponse: string | boolean | number | undefined;

            let returnGetNextPageFunction = false;

            let restRequestUri: string = restURL + operatingTable + '/';

            const needsConditionOrPrimaryCheck = (PUT === requestMethod || DELETE === requestMethod)
                && false === skipPrimaryCheck;

            const TABLES = C6.TABLES;

            // todo - aggregate primary key check with condition check
            // check if PK exists in query, clone so pop does not affect the real data
            const primaryKey = structuredClone(TABLES[operatingTable]?.PRIMARY)?.pop()?.split('.')?.pop();

            if (needsConditionOrPrimaryCheck) {

                if (undefined === primaryKey) {

                    if (null === query
                        || undefined === query
                        || undefined === query?.[C6.WHERE]
                        || (true === Array.isArray(query[C6.WHERE])
                            || query[C6.WHERE].length === 0)
                        || (Object.keys(query?.[C6.WHERE]).length === 0)
                    ) {

                        console.error(query)

                        throw Error('Failed to parse primary key information. Query: (' + JSON.stringify(query) + ') Primary Key: (' + JSON.stringify(primaryKey) + ') TABLES[operatingTable]?.PRIMARY: (' + JSON.stringify(TABLES[operatingTable]?.PRIMARY) + ') for operatingTable (' + operatingTable + ').')

                    }

                } else {

                    if (undefined === query
                        || null === query
                        || false === primaryKey in query) {

                        if (true === request.debug && isLocal) {

                            toast.error('DEVS: The primary key (' + primaryKey + ') was not provided!!')

                        }

                        throw Error('You must provide the primary key (' + primaryKey + ') for table (' + operatingTable + '). Request (' + JSON.stringify(request, undefined, 4) + ') Query (' + JSON.stringify(query) + ')');

                    }

                    if (undefined === query?.[primaryKey]
                        || null === query?.[primaryKey]) {

                        toast.error('The primary key (' + primaryKey + ') provided is undefined or null explicitly!!')

                        throw Error('The primary key (' + primaryKey + ') provided in the request was exactly equal to undefined.');

                    }

                }

            }

            // A part of me exists that wants to remove this, but it's a good feature
            // this allows developers the ability to cache requests based on primary key
            // for tables like `photos` this can be a huge performance boost
            if (undefined !== query
                && null !== query
                && undefined !== primaryKey
                && primaryKey in query) {

                restRequestUri += query[primaryKey] + '/'

                const removedPkValue = query[primaryKey];

                addBackPK = () => {
                    query ??= {}
                    query[primaryKey] = removedPkValue
                }

                delete query[primaryKey]

                console.log('query', query, 'primaryKey', primaryKey, 'removedPkValue', removedPkValue)

            } else {

                console.log('query', query)

            }

            try {

                console.groupCollapsed('%c API: (' + requestMethod + ') Request Query for (' + operatingTable + ') is about to fire, will return with promise!', 'color: #A020F0')

                console.log(request)

                console.log('%c If this is the first request for this datatype; thus the value being set is currently undefined, please remember to update the state to null.', 'color: #A020F0')

                console.log('%c Remember undefined indicated the request has not fired, null indicates the request is firing, an empty array would signal no data was returned for the sql stmt.', 'color: #A020F0')

                console.trace()

                console.groupEnd()

                const axiosActiveRequest: AxiosPromise<ResponseDataType> = axios[requestMethod.toLowerCase()]<ResponseDataType>(
                    restRequestUri,
                    ...((() => {

                        // @link - https://axios-http.com/docs/instance
                        // How configuration vs data is passed is variable, use documentation above for reference
                        if (requestMethod === GET) {

                            return [{
                                withCredentials: withCredentials,
                                params: query
                            }]

                        } else if (requestMethod === POST) {

                            if (undefined !== request?.dataInsertMultipleRows) {

                                return [
                                    request.dataInsertMultipleRows.map(data =>
                                        convertForRequestBody<typeof data>(data, fullTableList, C6, (message) => toast.error(message, toastOptions))),
                                    {
                                        withCredentials: withCredentials,
                                    }
                                ]

                            }

                            return [
                                convertForRequestBody<RestTableInterfaces>(query as RestTableInterfaces, fullTableList, C6, (message) => toast.error(message, toastOptions)),
                                {
                                    withCredentials: withCredentials,
                                }
                            ]

                        } else if (requestMethod === PUT) {

                            return [
                                convertForRequestBody<RestTableInterfaces>(query as RestTableInterfaces, fullTableList, C6, (message) => toast.error(message, toastOptions)),
                                {
                                    withCredentials: withCredentials,
                                }
                            ]
                        } else if (requestMethod === DELETE) {

                            return [{
                                withCredentials: withCredentials,
                                data: convertForRequestBody<RestTableInterfaces>(query as RestTableInterfaces, fullTableList, C6, (message) => toast.error(message, toastOptions))
                            }]

                        } else {

                            throw new Error('The request method (' + requestMethod + ') was not recognized.')

                        }

                    })())
                );

                if (cachingConfirmed) {

                    // push to cache so we do not repeat the request
                    apiRequestCache.push({
                        requestArgumentsSerialized: querySerialized,
                        request: axiosActiveRequest
                    });

                }

                // todo - wip verify this works
                // we had removed the value from the request to add to the URI.
                addBackPK?.();  // adding back so post-processing methods work

                // returning the promise with this then is important for tests. todo - we could make that optional.
                // https://rapidapi.com/guides/axios-async-await
                return axiosActiveRequest.then(async (response): Promise<AxiosResponse<ResponseDataType, any>> => {

                        if (typeof response.data === 'string') {

                            if (isTest) {

                                console.trace()

                                throw new Error('The response data was a string this typically indicated html was sent. Make sure all cookies (' + JSON.stringify(response.config.headers) + ') needed are present! (' + response.data + ')')

                            }

                            return Promise.reject(response);

                        }

                        if (cachingConfirmed) {

                            const cacheIndex = apiRequestCache.findIndex(cache => cache.requestArgumentsSerialized === querySerialized);

                            apiRequestCache[cacheIndex].final = false === returnGetNextPageFunction

                            // only cache get method requests
                            apiRequestCache[cacheIndex].response = response

                        }

                        apiResponse = TestRestfulResponse(response, request?.success, request?.error ?? "An unexpected API error occurred!")

                        if (false === apiResponse) {

                            if (request.debug && isLocal) {

                                toast.warning("DEVS: TestRestfulResponse returned false for (" + operatingTable + ").", toastOptionsDevs);

                            }

                            return response;

                        }

                        // stateful operations are done in the response callback - its leverages rest generated functions
                        responseCallback(response, request, apiResponse)

                        if (C6.GET === requestMethod) {

                            const responseData = response.data as iGetC6RestResponse<any>;

                            returnGetNextPageFunction = 1 !== query?.[C6.PAGINATION]?.[C6.LIMIT] &&
                                query?.[C6.PAGINATION]?.[C6.LIMIT] === responseData.rest.length

                            if (false === isTest || true === isVerbose) {

                                console.groupCollapsed('%c API: Response (' + requestMethod + ' ' + tableName + ') returned length (' + responseData.rest?.length + ') of possible (' + query?.[C6.PAGINATION]?.[C6.LIMIT] + ') limit!', 'color: #0c0')

                                console.log('%c ' + requestMethod + ' ' + tableName, 'color: #0c0')

                                console.log('%c Request Data (note you may see the success and/or error prompt):', 'color: #0c0', request)

                                console.log('%c Response Data:', 'color: #0c0', responseData.rest)

                                console.log('%c Will return get next page function:' + (1 !== query?.[C6.PAGINATION]?.[C6.LIMIT] ? '' : ' (Will not return with explicit limit 1 set)'), 'color: #0c0', true === returnGetNextPageFunction)

                                console.trace();

                                console.groupEnd()

                            }

                            if (false === returnGetNextPageFunction
                                && true === request.debug
                                && isLocal) {

                                toast.success("DEVS: Response returned length (" + responseData.rest?.length + ") less than limit (" + query?.[C6.PAGINATION]?.[C6.LIMIT] + ").", toastOptionsDevs);

                            }

                            request.fetchDependencies ??= eFetchDependencies.NONE;

                            if (request.fetchDependencies
                                && 'number' === typeof request.fetchDependencies
                                && responseData.rest.length > 0) {

                                const fetchDependencies = request.fetchDependencies as number;

                                console.groupCollapsed('%c API: Fetch Dependencies segment (' + requestMethod + ' ' + tableName + ')'
                                    + (fetchDependencies & eFetchDependencies.CHILDREN ? ' | (CHILDREN|REFERENCED) ' : '')
                                    + (fetchDependencies & eFetchDependencies.PARENTS ? ' | (PARENTS|REFRENCED_BY)' : '')
                                    + (fetchDependencies & eFetchDependencies.C6ENTITY ? ' | (C6ENTITY)' : '')
                                    + (fetchDependencies & eFetchDependencies.RECURSIVE ? ' | (RECURSIVE)' : ''), 'color: #33ccff')

                                console.groupCollapsed('Collapsed JS Trace');
                                console.trace(); // hidden in collapsed group
                                console.groupEnd();

                                // noinspection JSBitwiseOperatorUsage
                                let dependencies: {
                                    [key: string]: iConstraint[]
                                } = {};

                                if (fetchDependencies & eFetchDependencies.C6ENTITY) {


                                    dependencies = operatingTable.endsWith("carbon_carbons")
                                        ? {
                                            // the context of the entity system is a bit different
                                            ...fetchDependencies & eFetchDependencies.CHILDREN // REFERENCED === CHILDREN
                                                ? C6.TABLES[operatingTable].TABLE_REFERENCED_BY
                                                : {},
                                            ...fetchDependencies & eFetchDependencies.PARENTS // REFERENCES === PARENTS
                                                ? C6.TABLES[operatingTable].TABLE_REFERENCES
                                                : {}
                                        } : {
                                            // the context of the entity system is a bit different
                                            ...fetchDependencies & eFetchDependencies.CHILDREN // REFERENCED === CHILDREN
                                                ? {
                                                    ...Object.keys(C6.TABLES[operatingTable].TABLE_REFERENCES).reduce((accumulator, columnName) => {

                                                        if (!C6.TABLES[operatingTable].PRIMARY_SHORT.includes(columnName)) {
                                                            accumulator[columnName] = C6.TABLES[operatingTable].TABLE_REFERENCES[columnName]
                                                        }

                                                        return accumulator
                                                    }, {}),
                                                    ...C6.TABLES[operatingTable].TABLE_REFERENCED_BY // it is unlikely that a C6 table will have any TABLE_REFERENCED_BY
                                                }
                                                : {},
                                            ...fetchDependencies & eFetchDependencies.PARENTS // REFERENCES === PARENTS
                                                ? C6.TABLES[operatingTable].PRIMARY_SHORT.reduce((accumulator, primaryKey) => {
                                                    if (primaryKey in C6.TABLES[operatingTable].TABLE_REFERENCES) {
                                                        accumulator[primaryKey] = C6.TABLES[operatingTable].TABLE_REFERENCES[primaryKey]
                                                    }
                                                    return accumulator
                                                }, {})
                                                : {}
                                        }

                                } else {

                                    // this is the natural mysql context
                                    dependencies = {
                                        ...fetchDependencies & eFetchDependencies.REFERENCED // REFERENCED === CHILDREN
                                            ? C6.TABLES[operatingTable].TABLE_REFERENCED_BY
                                            : {},
                                        ...fetchDependencies & eFetchDependencies.REFERENCES // REFERENCES === PARENTS
                                            ? C6.TABLES[operatingTable].TABLE_REFERENCES
                                            : {}
                                    };

                                }

                                let fetchReferences: {
                                    [externalTable: string]: {
                                        [column: string]: string[]
                                    }
                                } = {}

                                let apiRequestPromises: Array<Awaited<apiReturn<iGetC6RestResponse<any>>>> = []

                                console.log('%c Dependencies', 'color: #005555', dependencies)

                                Object.keys(
                                    dependencies
                                ).forEach(column => dependencies[column].forEach((constraint) => {
                                    fetchReferences[constraint.TABLE] ??= {};
                                    fetchReferences[constraint.TABLE][constraint.COLUMN] ??= []
                                    // carbon_users -> user_id | user_photo -> carbon_carbons -> entity_id
                                    fetchReferences[constraint.TABLE][constraint.COLUMN].push(responseData.rest[column] ?? responseData.rest.map((row) => row[column]).filter(n => n)) // todo - we are mapping all carbons received to every fk reference despite its tag name
                                    console.log('fetchReferences[constraint.TABLE][constraint.COLUMN]', constraint.TABLE, constraint.COLUMN, fetchReferences[constraint.TABLE][constraint.COLUMN], responseData.rest)
                                }));

                                console.log('fetchReferences', fetchReferences)

                                for (const tableToFetch in fetchReferences) {

                                    if (fetchDependencies & eFetchDependencies.C6ENTITY
                                        && 'string' === typeof tableName
                                        && tableName.endsWith("carbon_carbons")) {

                                        // this more or less implies
                                        // todo - rethink the table ref entity system - when tables are renamed? no hooks exist in mysql
                                        // since were already filtering on column, we can assume the first row constraint is the same as the rest

                                        const referencesTables: string[] = responseData.rest.reduce((accumulator: string[], row) => {
                                            if ('entity_tag' in row && !accumulator.includes(row['entity_tag'])) {
                                                accumulator.push(row['entity_tag']);
                                            }
                                            return accumulator;
                                        }, []).map((entityTag) => entityTag.split('\\').pop().toLowerCase());

                                        const shouldContinue = referencesTables.find((referencesTable) => tableToFetch.endsWith(referencesTable))

                                        if (!shouldContinue) {

                                            console.log('%c C6ENTITY: The constraintTableName (' + tableToFetch + ') did not end with any value in referencesTables', 'color: #c00', referencesTables)

                                            continue;

                                        }

                                        console.log('%c C6ENTITY: The constraintTableName (' + tableToFetch + ') will be fetched.', 'color: #0c0')

                                    }

                                    const fetchTable = await C6.IMPORT(tableToFetch)

                                    const RestApi = fetchTable.default

                                    console.log('%c Fetch Dependencies will select (' + tableToFetch + ') using GET request', 'color: #33ccff')

                                    let nextFetchDependencies = eFetchDependencies.NONE

                                    if (fetchDependencies & eFetchDependencies.RECURSIVE) {

                                        if (fetchDependencies & eFetchDependencies.ALL) {

                                            throw Error('Recursive fetch dependencies with both PARENT and CHILD reference will result in an infin1ite loop. As there is not real ending condition, this is not supported.')

                                        }

                                        nextFetchDependencies = fetchDependencies

                                    } else if (fetchDependencies & eFetchDependencies.C6ENTITY) {

                                        if (tableToFetch === "carbon_carbons") {

                                            nextFetchDependencies = fetchDependencies

                                        } else {

                                            nextFetchDependencies = fetchDependencies ^ eFetchDependencies.C6ENTITY

                                        }

                                    }

                                    console.log('fetchReferences', fetchReferences[tableToFetch], "Current fetchDependencies for (" + operatingTable + "):", fetchDependencies, "New fetchDependencies for (" + tableToFetch + "): ", nextFetchDependencies)

                                    // todo - filter out ids that exist in state?!? note - remember that this does not necessarily mean the pk, but only known is its an FK to somewhere
                                    // it not certain that they are using carbons' entities either

                                    // this is a dynamic call to the rest api, any generated table may resolve with (RestApi)
                                    // todo - using value to avoid joins.... but. maybe this should be a parameterizable option -- think race conditions; its safer to join
                                    apiRequestPromises.push(await RestApi.Get({
                                            [C6.WHERE]: {
                                                0: Object.keys(fetchReferences[tableToFetch]).reduce((sum, column) => {

                                                    fetchReferences[tableToFetch][column] = fetchReferences[tableToFetch][column].flat(Infinity)

                                                    if (0 === fetchReferences[tableToFetch][column].length) {

                                                        console.warn('The column (' + column + ') was not found in the response data. We will not fetch.', responseData)

                                                        return false;

                                                    }

                                                    sum[column] = fetchReferences[tableToFetch][column].length === 1
                                                        ? fetchReferences[tableToFetch][column][0]
                                                        : [
                                                            C6.IN, fetchReferences[tableToFetch][column]
                                                        ]

                                                    return sum
                                                }, {})
                                            },
                                            fetchDependencies: nextFetchDependencies
                                        }
                                    ));

                                }

                                await Promise.all(apiRequestPromises)

                                request.fetchDependencies = apiRequestPromises

                                console.groupEnd()

                            }


                        }

                        if (request.debug && isLocal) {

                            toast.success("DEVS: (" + requestMethod + ") request complete.", toastOptionsDevs);

                        }

                        return response;

                    }
                )
                    ;

            } catch
                (error) {

                if (isTest) {

                    throw new Error(JSON.stringify(error))

                }

                console.groupCollapsed('%c API: An error occurred in the try catch block. returning null!', 'color: #ff0000')

                console.log('%c ' + requestMethod + ' ' + tableName, 'color: #A020F0')

                console.warn(error)

                console.trace()

                console.groupEnd()

                TestRestfulResponse(error, request?.success, request?.error || "An restful API error occurred!")

                return null;

            }

        }

        return apiRequest()

    }

}

