import {AxiosPromise, AxiosResponse} from "axios";
import {toast} from "react-toastify";
import isLocal from "../../variables/isLocal";
import isTest from "../../variables/isTest";
import convertForRequestBody from "../convertForRequestBody";
import {eFetchDependencies} from "../types/dynamicFetching";
import {OrmGenerics} from "../types/ormGenerics";
import {
    DELETE, DetermineResponseDataType,
    GET,
    iCacheAPI,
    iConstraint,
    iGetC6RestResponse,
    POST,
    PUT, RequestQueryBody
} from "../types/ormInterfaces";
import {removeInvalidKeys, removePrefixIfExists, TestRestfulResponse} from "../utils/apiHelpers";
import {apiRequestCache, checkCache, userCustomClearCache} from "../utils/cacheManager";
import {sortAndSerializeQueryObject} from "../utils/sortAndSerializeQueryObject";
import {Executor} from "./Executor";
import {toastOptions, toastOptionsDevs} from "variables/toastOptions";
import {normalizeSingularRequest} from "../utils/normalizeSingularRequest";

export class HttpExecutor<
    G extends OrmGenerics
>
    extends Executor<G> {

    public putState(
        response: AxiosResponse<DetermineResponseDataType<G['RequestMethod'], G['RestTableInterface']>>,
        request: RequestQueryBody<
            G['RequestMethod'],
            G['RestTableInterface'],
            G['CustomAndRequiredFields'],
            G['RequestTableOverrides']
        >,
        callback: () => void
    ) {
        this.config.reactBootstrap?.updateRestfulObjectArrays<G['RestTableInterface']>({
            callback,
            dataOrCallback: [
                removeInvalidKeys<G['RestTableInterface']>({
                    ...request,
                    ...response?.data?.rest,
                }, this.config.C6.TABLES)
            ],
            stateKey: this.config.restModel.TABLE_NAME,
            uniqueObjectId: this.config.restModel.PRIMARY_SHORT
        })
    }

    public postState(
        response: AxiosResponse<DetermineResponseDataType<G['RequestMethod'], G['RestTableInterface']>>,
        request: RequestQueryBody<
            G['RequestMethod'],
            G['RestTableInterface'],
            G['CustomAndRequiredFields'],
            G['RequestTableOverrides']
        >,
        callback: () => void
    ) {

        if (1 !== this.config.restModel.PRIMARY_SHORT.length) {

            console.error("C6 received unexpected result's given the primary key length");

        } else {

            const pk = this.config.restModel.PRIMARY_SHORT[0];

            // TODO - should overrides be handled differently? Why override: (react/php), driver missmatches, aux data..
            // @ts-ignore - this is technically a correct error, but we allow it anyway...
            request[pk] = response.data?.created as RestTableInterface[PrimaryKey]

        }

        this.config.reactBootstrap?.updateRestfulObjectArrays<G['RestTableInterface']>({
            callback,
            dataOrCallback: undefined !== request.dataInsertMultipleRows
                ? request.dataInsertMultipleRows.map((request, index) => {
                    return removeInvalidKeys<G['RestTableInterface']>({
                        ...request,
                        ...(index === 0 ? response?.data?.rest : {}),
                    }, this.config.C6.TABLES)
                })
                : [
                    removeInvalidKeys<G['RestTableInterface']>({
                        ...request,
                        ...response?.data?.rest,
                    }, this.config.C6.TABLES)
                ],
            stateKey: this.config.restModel.TABLE_NAME,
            uniqueObjectId: this.config.restModel.PRIMARY_SHORT as (keyof G['RestTableInterface'])[]
        })
    }

    public deleteState(
        _response: AxiosResponse<DetermineResponseDataType<G['RequestMethod'], G['RestTableInterface']>>,
        request: RequestQueryBody<
            G['RequestMethod'],
            G['RestTableInterface'],
            G['CustomAndRequiredFields'],
            G['RequestTableOverrides']
        >,
        callback: () => void
    ) {
        this.config.reactBootstrap?.deleteRestfulObjectArrays<G['RestTableInterface']>({
            callback,
            dataOrCallback: [
                request as unknown as G['RestTableInterface'],
            ],
            stateKey: this.config.restModel.TABLE_NAME,
            uniqueObjectId: this.config.restModel.PRIMARY_SHORT as (keyof G['RestTableInterface'])[]
        })
    }

    public async execute(): Promise<DetermineResponseDataType<G['RequestMethod'], G['RestTableInterface']>> {

        type ResponseDataType = DetermineResponseDataType<G['RequestMethod'], G['RestTableInterface']>;

        const {
            C6,
            axios,
            restURL,
            withCredentials,
            restModel,
            reactBootstrap,
            requestMethod,
            skipPrimaryCheck,
            clearCache,
        } = this.config

        await this.runLifecycleHooks<"beforeProcessing">(
            "beforeProcessing", {
                config: this.config,
                request: this.request,
            });

        const tableName = restModel.TABLE_NAME as string;

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

        console.groupCollapsed('%c API: (' + requestMethod + ') Request for (' + tableName + ')', 'color: #0c0')

        console.log('request', this.request)

        console.groupEnd()

        // an undefined query would indicate queryCallback returned undefined,
        // thus the request shouldn't fire as is in custom cache
        if (undefined === this.request || null === this.request) {

            console.groupCollapsed('%c API: (' + requestMethod + ') Request Query for (' + tableName + ') undefined, returning null (will not fire)!', 'color: #c00')

            console.log('request', this.request)

            console.log('%c Returning (undefined|null) for a query would indicate a custom cache hit (outside API.tsx), thus the request should not fire.', 'color: #c00')

            console.trace();

            console.groupEnd()

            return null;

        }

        let query = this.request;

        if (C6.GET === requestMethod) {

            if (undefined === query[C6.PAGINATION]) {

                query[C6.PAGINATION] = {}

            }

            query[C6.PAGINATION][C6.PAGE] = query[C6.PAGINATION][C6.PAGE] || 1;

            query[C6.PAGINATION][C6.LIMIT] = query[C6.PAGINATION][C6.LIMIT] || 100;

        }

        // this is parameterless and could return itself with a new page number, or undefined if the end is reached
        const apiRequest = async (): Promise<DetermineResponseDataType<G['RequestMethod'], G['RestTableInterface']>> => {

            const {
                debug,
                cacheResults = (C6.GET === requestMethod),
                dataInsertMultipleRows,
                success,
                fetchDependencies = eFetchDependencies.NONE,
                error = "An unexpected API error occurred!"
            } = this.request

            if (C6.GET === requestMethod
                && undefined !== query?.[C6.PAGINATION]?.[C6.PAGE]
                && 1 !== query[C6.PAGINATION][C6.PAGE]) {

                console.groupCollapsed('Request on table (' + tableName + ') is firing for page (' + query[C6.PAGINATION][C6.PAGE] + '), please wait!')

                console.log('Request Data (note you may see the success and/or error prompt):', this.request)

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

                        query = {} as RequestQueryBody<
                            G['RequestMethod'],
                            G['RestTableInterface'],
                            G['CustomAndRequiredFields'],
                            G['RequestTableOverrides']
                        >

                    }

                    query[C6.PAGINATION] = {}

                }

                query[C6.PAGINATION][C6.PAGE] = query[C6.PAGINATION][C6.PAGE] || 1;

                query[C6.PAGINATION][C6.LIMIT] = query[C6.PAGINATION][C6.LIMIT] || 100;

                // this will evaluate true most the time
                if (true === cacheResults) {

                    // just find the next, non-fetched, page and return a function to request it
                    if (undefined !== cacheResult) { // we will return in this loop

                        do {

                            const cacheCheck = checkCache<ResponseDataType>(cacheResult, requestMethod, tableName, this.request);

                            if (false !== cacheCheck) {

                                return (await cacheCheck).data;

                            }

                            // this line incrementing page is why we return recursively
                            ++query[C6.PAGINATION][C6.PAGE];

                            // this json stringify is to capture the new page number
                            querySerialized = sortAndSerializeQueryObject(tables, query ?? {});

                            cacheResult = apiRequestCache.find(cache => cache.requestArgumentsSerialized === querySerialized)

                        } while (undefined !== cacheResult)

                        if (debug && isLocal()) {

                            toast.warning("DEVS: Request in cache. (" + apiRequestCache.findIndex(cache => cache.requestArgumentsSerialized === querySerialized) + "). Returning function to request page (" + query[C6.PAGINATION][C6.PAGE] + ")", toastOptionsDevs);

                        }

                        // @ts-ignore - this is an incorrect warning on TS, it's well typed
                        return apiRequest;

                    }

                    cachingConfirmed = true;

                } else {

                    if (debug && isLocal()) {

                        toast.info("DEVS: Ignore cache was set to true.", toastOptionsDevs);

                    }

                }

                if (debug && isLocal()) {

                    toast.success("DEVS: Request not in cache." + (requestMethod === C6.GET ? "Page (" + query[C6.PAGINATION][C6.PAGE] + ")." : '') + " Logging cache 2 console.", toastOptionsDevs);

                }

            } else if (cacheResults) { // if we are not getting, we are updating, deleting, or inserting

                if (cacheResult) {
                    const cacheCheck = checkCache<ResponseDataType>(cacheResult, requestMethod, tableName, this.request);

                    if (false !== cacheCheck) {

                        return (await cacheCheck).data;

                    }
                }

                cachingConfirmed = true;
                // push to cache so we do not repeat the request

            }

            let addBackPK: (() => void) | undefined;
            let removedPrimaryKV: { key: string; value: any } | undefined;

            let apiResponse: G['RestTableInterface'][G['PrimaryKey']] | string | boolean | number | undefined;

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

                        if (true === debug && isLocal()) {

                            toast.error('DEVS: The primary key (' + primaryKey + ') was not provided!!')

                        }

                        throw Error('You must provide the primary key (' + primaryKey + ') for table (' + operatingTable + '). Request (' + JSON.stringify(this.request, undefined, 4) + ') Query (' + JSON.stringify(query) + ')');

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
            if (POST !== requestMethod
                && undefined !== query
                && null !== query
                && undefined !== primaryKey
                && primaryKey in query) {

                restRequestUri += query[primaryKey] + '/'

                const removedPkValue = query[primaryKey];
                removedPrimaryKV = { key: primaryKey, value: removedPkValue };

                addBackPK = () => {
                    query ??= {} as RequestQueryBody<
                        G['RequestMethod'],
                        G['RestTableInterface'],
                        G['CustomAndRequiredFields'],
                        G['RequestTableOverrides']
                    >;
                    query[primaryKey] = removedPkValue;
                }

                delete query[primaryKey]

                console.log('query', query, 'primaryKey', primaryKey, 'removedPkValue', removedPkValue)

            } else {

                console.log('query', query)

            }

            try {

                console.groupCollapsed('%c API: (' + requestMethod + ') Request Query for (' + operatingTable + ') is about to fire, will return with promise!', 'color: #A020F0')

                console.log(this.request)

                console.log('%c If this is the first request for this datatype; thus the value being set is currently undefined, please remember to update the state to null.', 'color: #A020F0')

                console.log('%c Remember undefined indicated the request has not fired, null indicates the request is firing, an empty array would signal no data was returned for the sql stmt.', 'color: #A020F0')

                console.trace()

                console.groupEnd()

                this.runLifecycleHooks<"beforeExecution">(
                    "beforeExecution", {
                        config: this.config,
                        request: this.request
                    })

                const axiosActiveRequest: AxiosPromise<ResponseDataType> = axios![requestMethod.toLowerCase()]<ResponseDataType>(
                    restRequestUri,
                    ...(() => {
                        const convert = (data: any) =>
                            convertForRequestBody<
                                G['RequestMethod'],
                                G['RestTableInterface'],
                                G['CustomAndRequiredFields'],
                                G['RequestTableOverrides']
                            >(
                                data,
                                fullTableList,
                                C6,
                                (message) => toast.error(message, toastOptions)
                            );

                        const baseConfig = {
                            withCredentials: withCredentials,
                        };

                        // Normalize singular request (GET/PUT/DELETE) into complex ORM shape
                        const normalizedQuery = normalizeSingularRequest(
                            requestMethod as any,
                            query as any,
                            restModel as any,
                            removedPrimaryKV
                        ) as typeof query;

                        switch (requestMethod) {
                            case GET:
                                return [{
                                    ...baseConfig,
                                    params: normalizedQuery
                                }];

                            case POST:
                                if (dataInsertMultipleRows !== undefined) {
                                    return [
                                        dataInsertMultipleRows.map(convert),
                                        baseConfig
                                    ];
                                }
                                return [convert(query), baseConfig];

                            case PUT:
                                return [convert(normalizedQuery), baseConfig];

                            case DELETE:
                                return [{
                                    ...baseConfig,
                                    data: convert(normalizedQuery)
                                }];

                            default:
                                throw new Error(`The request method (${requestMethod}) was not recognized.`);
                        }
                    })()
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
                return axiosActiveRequest.then(async (response: AxiosResponse<ResponseDataType, any>): Promise<AxiosResponse<ResponseDataType, any>> => {

                        // noinspection SuspiciousTypeOfGuard
                        if (typeof response.data === 'string') {

                            if (isTest()) {

                                console.trace()

                                throw new Error('The response data was a string this typically indicated html was sent. Make sure all cookies (' + JSON.stringify(response.config.headers) + ') needed are present! (' + response.data + ')')

                            }

                            return Promise.reject(response);

                        }

                        if (cachingConfirmed) {

                            const cacheIndex = apiRequestCache.findIndex(cache => cache.requestArgumentsSerialized === querySerialized);

                            // TODO - currently nonthing is setting this correctly
                            apiRequestCache[cacheIndex].final = false === returnGetNextPageFunction

                            // only cache get method requests
                            apiRequestCache[cacheIndex].response = response

                        }

                        this.runLifecycleHooks<"afterExecution">(
                            "afterExecution", {
                                config: this.config,
                                request: this.request,
                                response
                            })

                        // todo - this feels dumb now, but i digress
                        apiResponse = TestRestfulResponse(response, success, error)

                        if (false === apiResponse) {

                            if (debug && isLocal()) {

                                toast.warning("DEVS: TestRestfulResponse returned false for (" + operatingTable + ").", toastOptionsDevs);

                            }

                            return response;

                        }

                        const callback = () => this.runLifecycleHooks<"afterCommit">(
                            "afterCommit", {
                                config: this.config,
                                request: this.request,
                                response
                            });

                        if (undefined !== reactBootstrap && response) {
                            switch (requestMethod) {
                                case GET:
                                    response.data && reactBootstrap.updateRestfulObjectArrays<G['RestTableInterface']>({
                                        dataOrCallback: Array.isArray(response.data.rest) ? response.data.rest : [response.data.rest],
                                        stateKey: this.config.restModel.TABLE_NAME,
                                        uniqueObjectId: this.config.restModel.PRIMARY_SHORT as (keyof G['RestTableInterface'])[],
                                        callback
                                    })
                                    break;
                                case POST:
                                    this.postState(response, this.request, callback);
                                    break;
                                case PUT:
                                    this.putState(response, this.request, callback);
                                    break;
                                case DELETE:
                                    this.deleteState(response, this.request, callback);
                                    break;
                            }
                        } else {
                            callback();
                        }

                        if (C6.GET === requestMethod) {

                            const responseData = response.data as iGetC6RestResponse<any>;

                            returnGetNextPageFunction = 1 !== query?.[C6.PAGINATION]?.[C6.LIMIT] &&
                                query?.[C6.PAGINATION]?.[C6.LIMIT] === responseData.rest.length

                            if (false === isTest() || this.config.verbose) {

                                console.groupCollapsed('%c API: Response (' + requestMethod + ' ' + tableName + ') returned length (' + responseData.rest?.length + ') of possible (' + query?.[C6.PAGINATION]?.[C6.LIMIT] + ') limit!', 'color: #0c0')

                                console.log('%c ' + requestMethod + ' ' + tableName, 'color: #0c0')

                                console.log('%c Request Data (note you may see the success and/or error prompt):', 'color: #0c0', this.request)

                                console.log('%c Response Data:', 'color: #0c0', responseData.rest)

                                console.log('%c Will return get next page function:' + (returnGetNextPageFunction ? '' : ' (Will not return with explicit limit 1 set)'), 'color: #0c0', true === returnGetNextPageFunction)

                                console.trace();

                                console.groupEnd()

                            }

                            if (false === returnGetNextPageFunction) {

                                responseData.next = apiRequest

                            } else {

                                responseData.next = undefined;

                                if (true === debug
                                    && isLocal()) {
                                    toast.success("DEVS: Response returned length (" + responseData.rest?.length + ") less than limit (" + query?.[C6.PAGINATION]?.[C6.LIMIT] + ").", toastOptionsDevs);
                                }
                            }


                            if (fetchDependencies
                                && 'number' === typeof fetchDependencies
                                && responseData.rest.length > 0) {

                                console.groupCollapsed('%c API: Fetch Dependencies segment (' + requestMethod + ' ' + tableName + ')'
                                    + (fetchDependencies & eFetchDependencies.CHILDREN ? ' | (CHILDREN|REFERENCED) ' : '')
                                    + (fetchDependencies & eFetchDependencies.PARENTS ? ' | (PARENTS|REFERENCED_BY)' : '')
                                    + (fetchDependencies & eFetchDependencies.C6ENTITY ? ' | (C6ENTITY)' : '')
                                    + (fetchDependencies & eFetchDependencies.RECURSIVE ? ' | (RECURSIVE)' : ''), 'color: #33ccff')

                                console.groupCollapsed('Collapsed JS Trace');
                                console.trace(); // hidden in collapsed group
                                console.groupEnd();

                                // noinspection JSBitwiseOperatorUsage
                                let dependencies: {
                                    [key: string]: iConstraint[]
                                } = {};

                                // Remember this is a binary bitwise operation, so we can check for multiple dependencies at once
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

                                let apiRequestPromises: Array<Promise<DetermineResponseDataType<"GET", any>>> = []

                                console.log('%c Dependencies', 'color: #005555', dependencies)

                                Object.keys(dependencies)
                                    .forEach(column => dependencies[column]
                                        .forEach((constraint) => {

                                            const columnValues = responseData.rest[column] ?? responseData.rest.map((row) => {

                                                if (operatingTable.endsWith("carbons")
                                                    && 'entity_tag' in row
                                                    && !constraint.TABLE.endsWith(row['entity_tag'].split('\\').pop().toLowerCase())) {

                                                    return false; // map

                                                }

                                                if (!(column in row)) {
                                                    return false
                                                }

                                                // todo - row[column] is a FK value, we should optionally remove values that are already in state
                                                // this could be any column in the table constraint.TABLE, not just the primary key

                                                return row[column]

                                            }).filter(n => n) ?? [];

                                            if (columnValues.length === 0) {

                                                return; // forEach

                                            }

                                            fetchReferences[constraint.TABLE] ??= {};

                                            fetchReferences[constraint.TABLE][constraint.COLUMN] ??= []

                                            fetchReferences[constraint.TABLE][constraint.COLUMN].push(columnValues)

                                        }));

                                console.log('fetchReferences', fetchReferences)

                                for (const tableToFetch in fetchReferences) {

                                    if (fetchDependencies & eFetchDependencies.C6ENTITY
                                        && 'string' === typeof tableName
                                        && tableName.endsWith("carbon_carbons")) {

                                        // todo - rethink the table ref entity system - when tables are renamed? no hooks exist in mysql
                                        // since were already filtering on column, we can assume the first row constraint is the same as the rest

                                        const referencesTables: string[] = responseData.rest.reduce((accumulator: string[], row: {
                                            [x: string]: string;
                                        }) => {
                                            if ('entity_tag' in row && !accumulator.includes(row['entity_tag'])) {
                                                accumulator.push(row['entity_tag']);
                                            }
                                            return accumulator;
                                        }, []).map((entityTag) => entityTag.split('\\')?.pop()?.toLowerCase()!);

                                        const shouldContinue = referencesTables.find((referencesTable) => tableToFetch.endsWith(referencesTable))

                                        if (!shouldContinue) {

                                            console.log('%c C6ENTITY: The constraintTableName (' + tableToFetch + ') did not end with any value in referencesTables', 'color: #c00', referencesTables)

                                            continue;

                                        }

                                        console.log('%c C6ENTITY: The constraintTableName (' + tableToFetch + ') will be fetched.', 'color: #0c0')

                                    }

                                    const ormKey = tableToFetch
                                        .split('_')
                                        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
                                        .join('_');

                                    const RestApi = C6.ORM[ormKey] ?? new Error(`Fetch Dependencies could not find table (${ormKey}) in the set ∉ [ ${Object.keys(C6.ORM).join(', ')} ]`);

                                    console.log('%c Fetch Dependencies will select (' + tableToFetch + ') using GET request', 'color: #33ccff')

                                    let nextFetchDependencies = eFetchDependencies.NONE

                                    if (fetchDependencies & eFetchDependencies.RECURSIVE) {
                                        const hasParents  = !!(fetchDependencies & eFetchDependencies.PARENTS);
                                        const hasChildren = !!(fetchDependencies & eFetchDependencies.CHILDREN);

                                        if (hasParents && hasChildren) {
                                            throw Error(
                                                'Recursive fetch with both PARENT and CHILD references would loop forever. ' +
                                                'Use only one of PARENTS or CHILDREN when RECURSIVE is set.'
                                            );
                                        }

                                        nextFetchDependencies = fetchDependencies;

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

                                    console.log('RestApi object', RestApi)

                                    // this is a dynamic call to the rest api, any generated table may resolve with (RestApi)
                                    // todo - using value to avoid joins.... but. maybe this should be a parameterizable option -- think race conditions; its safer to join
                                    apiRequestPromises.push(RestApi.Get({
                                            [C6.WHERE]: Object.keys(fetchReferences[tableToFetch]).reduce((sum, column) => {

                                                    fetchReferences[tableToFetch][column] = fetchReferences[tableToFetch][column].flat(Infinity)

                                                    if (0 === fetchReferences[tableToFetch][column].length) {

                                                        console.warn('The column (' + column + ') was not found in the response data. We will not fetch.', responseData)

                                                        return false;

                                                    }

                                                    sum[`${tableToFetch}.${column}`] = fetchReferences[tableToFetch][column].length === 1
                                                        ? fetchReferences[tableToFetch][column][0]
                                                        : [
                                                            C6.IN, fetchReferences[tableToFetch][column]
                                                        ]

                                                    return sum

                                                }, {}),
                                            fetchDependencies: nextFetchDependencies
                                        }
                                    ));

                                }

                                console.groupEnd()

                                await Promise.all(apiRequestPromises)

                                apiRequestPromises.map(async (promise) => {
                                    if (!Array.isArray(this.request.fetchDependencies)) {
                                        // to reassign value we must ref the root
                                        this.request.fetchDependencies = [];
                                    }
                                    this.request.fetchDependencies.push(await promise)
                                })

                            }


                        }

                        if (debug && isLocal()) {

                            toast.success("DEVS: (" + requestMethod + ") request complete.", toastOptionsDevs);

                        }

                        // this is the literal axios return
                        return response;

                    }
                ).then(response => response.data); // this escapes from axios context

            } catch (throwableError) {

                if (isTest()) {

                    throw new Error(JSON.stringify(throwableError))

                }

                console.groupCollapsed('%c API: An error occurred in the try catch block. returning null!', 'color: #ff0000')

                console.log('%c ' + requestMethod + ' ' + tableName, 'color: #A020F0')

                console.warn(throwableError)

                console.trace()

                console.groupEnd()

                TestRestfulResponse(throwableError, success, error)

                return null;

            }

        }

        return await apiRequest()

    }
}
