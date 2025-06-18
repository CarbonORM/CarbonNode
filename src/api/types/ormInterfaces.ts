import restRequest from "api/restRequest";
import {AxiosInstance, AxiosPromise, AxiosResponse} from "axios";
import {Pool} from "mysql2/promise";
import {eFetchDependencies} from "./dynamicFetching";
import {Modify} from "./modifyTypes";
import {JoinType, OrderDirection, SQLComparisonOperator, SQLFunction} from "./mysqlTypes";

export interface stringMap {
    [key: string]: string;
}

export interface stringNumberMap {
    [key: string]: string | number;
}

export interface RegExpMap {
    [key: string]: RegExp | RegExpMap;
}

export interface complexMap {
    [key: string]: stringMap | stringNumberMap | stringMap[] | RegExpMap;
}

export interface iTypeValidation {
    MYSQL_TYPE: string,
    MAX_LENGTH: string,
    AUTO_INCREMENT: boolean,
    SKIP_COLUMN_IN_POST: boolean
}

export type iRestReactiveLifecycle<T extends RequestGetPutDeleteBody> = {
    beforeProcessing?: (args: { request: T[]; requestMeta?: any }) => void | Promise<void>;
    beforeExecution?: (args: { request: T[]; requestMeta?: any }) => void | Promise<void>;
    afterExecution?: (args: { response: T[]; request: T[]; responseMeta?: any }) => void | Promise<void>;
    afterCommit?: (args: { response: T[]; request: T[]; responseMeta?: any }) => void | Promise<void>;
};

export interface iConstraint {
    TABLE: string,
    COLUMN: string,
    CONSTRAINT: string
}

export interface iC6RestfulModel<RestShortTableNames extends string = string> {
    TABLE_NAME: RestShortTableNames,
    PRIMARY: string[],
    PRIMARY_SHORT: string[],
    COLUMNS: stringMap,
    LIFECYCLE_HOOKS: iRestReactiveLifecycle<RequestGetPutDeleteBody>[],
    REGEX_VALIDATION: RegExpMap,
    TYPE_VALIDATION: { [key: string]: iTypeValidation },
    TABLE_REFERENCES: { [columnName: string]: iConstraint[] },
    TABLE_REFERENCED_BY: { [columnName: string]: iConstraint[] },
}

export interface iRestApiFunctions<RestData = any> {
    Delete: (request?: (iAPI<any> & any)) => apiReturn<iDeleteC6RestResponse<RestData>>;
    Post: (request?: (iAPI<any> & any)) => apiReturn<iPostC6RestResponse<RestData>>;
    Get: (request?: (iAPI<any> & any)) => apiReturn<iGetC6RestResponse<RestData>>;
    Put: (request?: (iAPI<any> & any)) => apiReturn<iPutC6RestResponse<RestData>>,
}

export interface iDynamicApiImport<RestData = any> {
    default: iRestApiFunctions<RestData>
    // the methods below are optional
    postState?: (response: AxiosResponse<iPostC6RestResponse<RestData>>, request: iAPI<any>, id: string | number | boolean) => void,
    deleteState?: (response: AxiosResponse<iDeleteC6RestResponse<RestData>>, request: iAPI<any>) => void,
    putState?: (response: AxiosResponse<iPutC6RestResponse<RestData>>, request: iAPI<any>) => void
}

export interface tC6Tables { [key: string]: (iC6RestfulModel & { [key: string]: any }) }

export interface tC6RestApi {
    [key: string]: {
        REST: iRestApiFunctions,
        PUT: Function;
        POST: Function;
        DELETE: Function;
    };
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

export interface iCacheAPI<ResponseDataType = any> {
    requestArgumentsSerialized: string,
    request: AxiosPromise<ResponseDataType>,
    response?: AxiosResponse,
    final?: boolean,
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

// ========================
// 📦 SELECT
// ========================

export type SubSelect<T = any> = {
    subSelect: true;
    table: string; // could be enum’d to known table names
    args: RequestGetPutDeleteBody<T>;
    alias: string;
};

export type SelectField<T = any> =
    | keyof T
    | [keyof T, 'AS', string]
    | [SQLFunction, keyof T]
    | [SQLFunction, keyof T, string] // With alias
    | SubSelect<T>; // Fully nested sub-select


// ========================
// 🧠 WHERE (Recursive)
// ========================

export type WhereClause<T = any> =
    | Partial<T>
    | LogicalGroup<T>
    | ComparisonClause<T>;

export type LogicalGroup<T = any> = {
    [logicalGroup: string]: Array<WhereClause<T>>;
};

export type ComparisonClause<T = any> = [keyof T, SQLComparisonOperator, any];


// ========================
// 🔗 JOIN
// ========================

export type JoinTableCondition<T = any> =
    | Partial<T>
    | WhereClause<T>[]
    | ComparisonClause<T>[];

export type JoinClause<T = any> = {
    [table: string]: JoinTableCondition<T>;
};

export type Join<T = any> = {
    [K in JoinType]?: JoinClause<T>;
};


// ========================
// 📄 PAGINATION
// ========================

export type Pagination<T = any> = {
    PAGE?: number;
    LIMIT?: number | null;
    ORDER?: Partial<Record<keyof T, OrderDirection>>;
};


// ========================
// 🌐 MAIN API TYPE
// ========================

export type RequestGetPutDeleteBody<T = any> = {
    SELECT?: SelectField<T>[];
    UPDATE?: Partial<T>;
    DELETE?: boolean;
    WHERE?: WhereClause<T>;
    JOIN?: Join<T>;
    PAGINATION?: Pagination<T>;
};


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
    IMPORT: (tableName: string) => Promise<iDynamicApiImport>,

    [key: string]: any
}

// todo - I'm not sure that Modify<ResponseDataType, ResponseDataOverrides>[]> is needed?
export type iGetC6RestResponse<ResponseDataType, ResponseDataOverrides = {}> = iC6RestResponse<Modify<ResponseDataType, ResponseDataOverrides> | Modify<ResponseDataType, ResponseDataOverrides>[]>

// returning undefined means no more results are available, thus we've queried everything possible
// null means the request is currently being executed
// https://www.typescriptlang.org/docs/handbook/2/conditional-types.html
export type apiReturn<Response> =
    null
    | undefined
    | AxiosPromise<Response>
    | (Response extends iPutC6RestResponse | iDeleteC6RestResponse | iPostC6RestResponse ? null : (() => apiReturn<Response>))


export interface iRest<
    CustomAndRequiredFields extends { [key: string]: any },
    RestTableInterfaces extends { [key: string]: any },
    RequestTableOverrides = { [key in keyof RestTableInterfaces]: any },
    ResponseDataType = any,
    RestShortTableNames extends string = any
> {
    C6: iC6Object,
    axios?: AxiosInstance,
    restURL?: string,
    mysqlPool?: Pool;
    withCredentials?: boolean,
    tableName: RestShortTableNames | RestShortTableNames[],
    requestMethod: iRestMethods,
    clearCache?: () => void,
    skipPrimaryCheck?: boolean,
    queryCallback: RequestQueryBody<Modify<RestTableInterfaces, RequestTableOverrides>> | ((request: iAPI<Modify<RestTableInterfaces, RequestTableOverrides>> & CustomAndRequiredFields) => (null | undefined | RequestQueryBody<Modify<RestTableInterfaces, RequestTableOverrides>>)),
    responseCallback?: (response: AxiosResponse<ResponseDataType>,
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
    } = any>(argv) => restRequest<CustomAndRequiredFields, RequestTableTypes, RequestTableOverrides, ResponseDataType, RestShortTableNames>(argv)
}

