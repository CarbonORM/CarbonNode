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

export class HttpExecutor<
    G extends OrmGenerics
>
    extends Executor<G> {

    private isRestResponse<T extends Record<string, any>>(
        r: AxiosResponse<any>
    ): r is AxiosResponse<iGetC6RestResponse<T>> {
        return !!r && r.data != null && typeof r.data === 'object' && 'rest' in r.data;
    }

    private stripTableNameFromKeys<T extends Record<string, any>>(obj: Partial<T> | undefined | null): Partial<T> {
        const columns = this.config.restModel.COLUMNS as Record<string, string>;
        const source: Record<string, any> = (obj ?? {}) as Record<string, any>;
        const out: Partial<T> = {} as Partial<T>;
        for (const [key, value] of Object.entries(source)) {
            const short = columns[key] ?? (key.includes('.') ? key.split('.').pop()! : key);
            (out as any)[short] = value;
        }
        return out;
    }

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
        const normalized = this.stripTableNameFromKeys(request as Record<string, any>);
        this.config.reactBootstrap?.updateRestfulObjectArrays<G['RestTableInterface']>({
            callback,
            dataOrCallback: [
                removeInvalidKeys<G['RestTableInterface']>({
                    ...normalized,
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
        type RT = G['RestTableInterface'];
        type PK = G['PrimaryKey'];

        if (this.config.restModel.PRIMARY_SHORT.length === 1) {
            const pk = this.config.restModel.PRIMARY_SHORT[0] as PK;
            try {
                (request as unknown as Record<PK, RT[PK]>)[pk] = (response.data as any)?.created as RT[PK];
            } catch {/* best-effort */}
        } else if (isLocal()) {
            console.error("C6 received unexpected results given the primary key length");
        }

        this.config.reactBootstrap?.updateRestfulObjectArrays<RT>({
            callback,
            dataOrCallback: undefined !== request.dataInsertMultipleRows
                ? request.dataInsertMultipleRows.map((row, index) => {
                    const normalizedRow = this.stripTableNameFromKeys<RT>(row as Partial<RT>);
                    return removeInvalidKeys<RT>({
                        ...normalizedRow,
                        ...(index === 0 ? (response?.data as any)?.rest : {}),
                    }, this.config.C6.TABLES)
                })
                : [
                    removeInvalidKeys<RT>({
                        ...this.stripTableNameFromKeys<RT>(request as unknown as Partial<RT>),
                        ...(response?.data as any)?.rest,
                    }, this.config.C6.TABLES)
                ],
            stateKey: this.config.restModel.TABLE_NAME,
            uniqueObjectId: this.config.restModel.PRIMARY_SHORT as (keyof RT)[]
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
        const normalized = this.stripTableNameFromKeys(request as Record<string, any>);
        this.config.reactBootstrap?.deleteRestfulObjectArrays<G['RestTableInterface']>({
            callback,
            dataOrCallback: [
                removeInvalidKeys<G['RestTableInterface']>(normalized, this.config.C6.TABLES),
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

        if (clearCache != null) {
            userCustomClearCache.push(clearCache);
        }

        if (isLocal() && (this.config.verbose || (this.request as any)?.debug)) {
            console.groupCollapsed('%c API:', 'color: #0c0', `(${requestMethod}) Request for (${tableName})`)
            console.log('request', this.request)
            console.groupEnd()
        }

        // an undefined query would indicate queryCallback returned undefined,
        // thus the request shouldn't fire as is in custom cache
        if (undefined === this.request || null === this.request) {

            if (isLocal()) {
                console.groupCollapsed(`API: (${requestMethod}) (${tableName}) query undefined/null → returning null`)
                console.log('request', this.request)
                console.groupEnd()
            }

            return null;

        }

        let query = this.request;

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
                && 1 !== query[C6.PAGINATION][C6.PAGE]
                && isLocal()) {
                console.groupCollapsed(`Request (${tableName}) page (${query[C6.PAGINATION][C6.PAGE]})`)
                console.log('request', this.request)
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
                    if (undefined !== cacheResult) {
                        do {
                            const cacheCheck = checkCache<ResponseDataType>(cacheResult, requestMethod, tableName, this.request);
                            if (false !== cacheCheck) {
                                return (await cacheCheck).data;
                            }
                            ++query[C6.PAGINATION][C6.PAGE];
                            querySerialized = sortAndSerializeQueryObject(tables, query ?? {});
                            cacheResult = apiRequestCache.find(cache => cache.requestArgumentsSerialized === querySerialized)
                        } while (undefined !== cacheResult)
                        if (debug && isLocal()) {
                            toast.warning("DEVS: Request pages exhausted in cache; firing network.", toastOptionsDevs);
                        }
                    }
                    cachingConfirmed = true;
                } else {
                    if (debug && isLocal()) toast.info("DEVS: Ignore cache was set to true.", toastOptionsDevs);
                }

                if (debug && isLocal()) {
                    toast.success("DEVS: Request not in cache." + (requestMethod === C6.GET ? " Page (" + query[C6.PAGINATION][C6.PAGE] + ")" : ''), toastOptionsDevs);
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

            let apiResponse: G['RestTableInterface'][G['PrimaryKey']] | string | boolean | number | undefined;

            let returnGetNextPageFunction = false;

            let restRequestUri: string = restURL + operatingTable + '/';

            const needsConditionOrPrimaryCheck = (PUT === requestMethod || DELETE === requestMethod)
                && false === skipPrimaryCheck;

            const TABLES = C6.TABLES;

            // todo - aggregate primary key check with condition check
            // check if PK exists in query, clone so pop does not affect the real data
            const primaryKeyList = structuredClone(TABLES[operatingTable]?.PRIMARY);
            const primaryKeyFullyQualified = primaryKeyList?.pop();
            const primaryKey = primaryKeyFullyQualified?.split('.')?.pop();

            if (needsConditionOrPrimaryCheck) {

                if (undefined === primaryKey) {

                    const whereVal = query?.[C6.WHERE];
                    const whereIsEmpty =
                        whereVal == null ||
                        (Array.isArray(whereVal) && whereVal.length === 0) ||
                        (typeof whereVal === 'object' && !Array.isArray(whereVal) && Object.keys(whereVal).length === 0);

                    if (whereIsEmpty) {

                        console.error(query)

                        throw Error('Failed to parse primary key information. Query: (' + JSON.stringify(query) + ') Primary Key: (' + JSON.stringify(primaryKey) + ') TABLES[operatingTable]?.PRIMARY: (' + JSON.stringify(TABLES[operatingTable]?.PRIMARY) + ') for operatingTable (' + operatingTable + ').')

                    }

                } else {

                    if (undefined === query
                        || null === query
                        || (!(primaryKey! in query) && !(primaryKeyFullyQualified && primaryKeyFullyQualified in query))) {

                        if (true === debug && isLocal()) {

                            toast.error('DEVS: The primary key (' + primaryKey + ') was not provided!!')

                        }

                        throw Error('You must provide the primary key (' + primaryKey + ') for table (' + operatingTable + '). Request (' + JSON.stringify(this.request, undefined, 4) + ') Query (' + JSON.stringify(query) + ')');

                    }

                    const providedPrimary = query?.[primaryKey!] ?? (primaryKeyFullyQualified ? query?.[primaryKeyFullyQualified] : undefined);
                    if (undefined === providedPrimary || null === providedPrimary) {

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
                && undefined !== primaryKey) {

                const primaryVal = query[primaryKey!] ?? (primaryKeyFullyQualified ? query[primaryKeyFullyQualified] : undefined);

                if (undefined !== primaryVal) {

                    restRequestUri += primaryVal + '/'

                    if (isLocal() && (this.config.verbose || (this.request as any)?.debug)) {
                        console.log('query', query, 'primaryKey', primaryKey)
                    }

                } else {

                    if (isLocal() && (this.config.verbose || (this.request as any)?.debug)) {
                        console.log('query', query)
                    }

                }

            } else {

                if (isLocal() && (this.config.verbose || (this.request as any)?.debug)) {
                    console.log('query', query)
                }

            }

            try {

                if (isLocal() && (this.config.verbose || (this.request as any)?.debug)) {
                    console.groupCollapsed('%c API:', 'color: #A020F0', `(${requestMethod}) (${operatingTable}) firing`)
                    console.log(this.request)
                    console.groupEnd()
                }

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

                        switch (requestMethod) {
                            case GET:
                                return [{
                                    ...baseConfig,
                                    params: query
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
                                return [convert(query), baseConfig];

                            case DELETE:
                                return [{
                                    ...baseConfig,
                                    data: convert(query)
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

                        apiResponse = TestRestfulResponse(response, success, error)

                        if (false === apiResponse) {
                            if (debug && isLocal()) {
                                toast.warning("DEVS: TestRestfulResponse returned false.", toastOptionsDevs);
                            }
                            // Force a null payload so the final .then(response => response.data) yields null
                            return Promise.resolve({ ...response, data: null as unknown as ResponseDataType });
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
                                        dataOrCallback: (Array.isArray(response.data.rest) ? response.data.rest : [response.data.rest])
                                            .map(r => this.stripTableNameFromKeys(r)),
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

                        if (C6.GET === requestMethod && this.isRestResponse<any>(response)) {

                            const responseData = response.data;

                            const pageLimit = query?.[C6.PAGINATION]?.[C6.LIMIT];
                            const got = responseData.rest.length;
                            const hasNext = pageLimit !== 1 && got === pageLimit;

                            if (hasNext) {
                                responseData.next = apiRequest;   // there might be more
                            } else {
                                responseData.next = undefined;    // short page => done
                            }

                            // If you keep this flag, make it reflect reality:
                            returnGetNextPageFunction = hasNext;

                            // and fix cache ‘final’ flag to match:
                            if (cachingConfirmed) {
                                const cacheIndex = apiRequestCache.findIndex(c => c.requestArgumentsSerialized === querySerialized);
                                apiRequestCache[cacheIndex].final = !hasNext;
                            }

                            if ((this.config.verbose || debug) && isLocal()) {
                                console.groupCollapsed(`API: Response (${requestMethod} ${tableName}) len (${responseData.rest?.length}) of (${query?.[C6.PAGINATION]?.[C6.LIMIT]})`)
                                console.log('request', this.request)
                                console.log('response.rest', responseData.rest)
                                console.groupEnd()
                            }

                            // next already set above based on hasNext; avoid duplicate, inverted logic


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
