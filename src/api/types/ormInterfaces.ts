// Refined TypeScript types for CarbonORM

import {AxiosInstance, AxiosPromise, AxiosResponse} from "axios";
import {Pool} from "mysql2/promise";
import {eFetchDependencies} from "./dynamicFetching";
import {Modify} from "./modifyTypes";
import {JoinType, OrderDirection, SQLComparisonOperator, SQLFunction} from "./mysqlTypes";
import {CarbonReact} from "@carbonorm/carbonreact";
import {OrmGenerics} from "./ormGenerics";

export type iRestMethods = 'GET' | 'POST' | 'PUT' | 'DELETE';
export const POST = 'POST';
export const PUT = 'PUT';
export const GET = 'GET';
export const DELETE = 'DELETE';

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
    MYSQL_TYPE: string;
    MAX_LENGTH: string;
    AUTO_INCREMENT: boolean;
    SKIP_COLUMN_IN_POST: boolean;
}

export type SubSelect<T extends { [key: string]: any } = any> = {
    subSelect: true;
    table: string;
    args: RequestQueryBody<'GET', T>;
    alias: string;
};

export type SelectField<T extends { [key: string]: any } = any> =
    | keyof T
    | [keyof T, 'AS', string]
    | [SQLFunction, keyof T]
    | [SQLFunction, keyof T, string]
    | SubSelect<T>;

export type WhereClause<T = any> = Partial<T> | LogicalGroup<T> | ComparisonClause<T>;
export type LogicalGroup<T = any> = { [logicalGroup: string]: Array<WhereClause<T>> };
export type ComparisonClause<T = any> = [keyof T, SQLComparisonOperator, any];

export type JoinTableCondition<T = any> = Partial<T> | WhereClause<T>[] | ComparisonClause<T>[];
export type JoinClause<T = any> = { [table: string]: JoinTableCondition<T>; };
export type Join<T = any> = { [K in JoinType]?: JoinClause<T>; };

export type Pagination<T = any> = {
    PAGE?: number;
    LIMIT?: number | null;
    ORDER?: Partial<Record<keyof T, OrderDirection>>;
};

export type RequestGetPutDeleteBody<T extends { [key: string]: any } = any> = {
    SELECT?: SelectField<T>[];
    UPDATE?: Partial<T>;
    DELETE?: boolean;
    WHERE?: WhereClause<T>;
    JOIN?: Join<T>;
    PAGINATION?: Pagination<T>;
};

export type iAPI<T extends { [key: string]: any }> = T & {
    dataInsertMultipleRows?: T[];
    cacheResults?: boolean;
    fetchDependencies?: number | eFetchDependencies | Awaited<iGetC6RestResponse<any>>[];
    debug?: boolean;
    success?: string | ((r: AxiosResponse) => string | void);
    error?: string | ((r: AxiosResponse) => string | void);
};

export type RequestQueryBody<
    Method extends iRestMethods,
    T extends { [key: string]: any },
    Custom extends { [key: string]: any } = {},
    Overrides extends { [key: string]: any } = {}
> = Method extends 'GET' | 'PUT' | 'DELETE'
    ? iAPI<RequestGetPutDeleteBody<Modify<T, Overrides> & Custom>>
    : Method extends 'POST'
        ? iAPI<RequestGetPutDeleteBody<Modify<T, Overrides> & Custom> & Modify<T, Overrides> & Custom>
        : iAPI<Modify<T, Overrides> & Custom>;

export interface iCacheAPI<ResponseDataType = any> {
    requestArgumentsSerialized: string;
    request: AxiosPromise<ResponseDataType>;
    response?: AxiosResponse;
    final?: boolean;
}

export interface iChangeC6Data {
    rowCount: number;
}

export interface iDeleteC6RestResponse<RestData = any, RequestData = any> extends iChangeC6Data, iC6RestResponse<RestData> {
    deleted: boolean | number | string | RequestData;
}

export interface iPostC6RestResponse<RestData = any> extends iC6RestResponse<RestData> {
    created: boolean | number | string;
}

export interface iPutC6RestResponse<RestData = any, RequestData = any> extends iChangeC6Data, iC6RestResponse<RestData> {
    updated: boolean | number | string | RequestData;
}

export interface iC6RestResponse<RestData> {
    rest: RestData;
    session?: any;
    sql?: any;
}

export interface iGetC6RestResponse<
    ResponseDataType extends { [key: string]: any },
    ResponseDataOverrides = {}
> extends iC6RestResponse<
    Modify<ResponseDataType, ResponseDataOverrides> | Modify<ResponseDataType, ResponseDataOverrides>[]
> {
    next?: () => Promise<DetermineResponseDataType<"GET", ResponseDataType, ResponseDataOverrides>>;
}

export type DetermineResponseDataType<
    Method extends iRestMethods,
    RestTableInterface extends { [key: string]: any },
    ResponseDataOverrides = {}
> =
    null
    | undefined
    | (Method extends 'POST'
    ? iPostC6RestResponse<RestTableInterface>
    : Method extends 'GET'
        ? iGetC6RestResponse<RestTableInterface, ResponseDataOverrides>
        : Method extends 'PUT'
            ? iPutC6RestResponse<RestTableInterface>
            : Method extends 'DELETE'
                ? iDeleteC6RestResponse<RestTableInterface>
                : never);

export interface iRest<
    RestShortTableName extends string = any,
    RestTableInterface extends Record<string, any> = any,
    PrimaryKey extends keyof RestTableInterface & string = keyof RestTableInterface & string
> {
    C6: iC6Object;
    axios?: AxiosInstance;
    restURL?: string;
    mysqlPool?: Pool;
    withCredentials?: boolean;
    restModel: C6RestfulModel<RestShortTableName, RestTableInterface, PrimaryKey>;
    reactBootstrap?: CarbonReact<any, any>;
    requestMethod: iRestMethods;
    clearCache?: () => void;
    skipPrimaryCheck?: boolean;
}

export interface iConstraint {
    TABLE: string;
    COLUMN: string;
    CONSTRAINT: string;
}

export type tColumns<TableName extends string, T extends { [key: string]: any }> = {
    [K in keyof T & string as `${TableName}.${K}`]: K;
};

export type tPrimaryKeys<TableName extends string, PK extends string> =
    PK extends any ? `${TableName}.${PK}` : never;


type UppercaseFieldMap<T> = {
    [K in keyof T as Uppercase<string & K>]: any;
};

export type C6RestfulModel<
    RestShortTableName extends string,
    RestTableInterface extends Record<string, any> = any,
    PrimaryKey extends (keyof RestTableInterface & string) = keyof RestTableInterface & string
> = {
    TABLE_NAME: RestShortTableName;
    PRIMARY: Array<tPrimaryKeys<RestShortTableName, PrimaryKey>>;
    PRIMARY_SHORT: Array<PrimaryKey>;
    COLUMNS: tColumns<RestShortTableName, RestTableInterface>;
    TYPE_VALIDATION: { [key: string]: iTypeValidation };
    REGEX_VALIDATION: RegExpMap;
    LIFECYCLE_HOOKS: iRestHooks<OrmGenerics<any, RestShortTableName, RestTableInterface, PrimaryKey>>;
    TABLE_REFERENCES: { [columnName: string]: iConstraint[] };
    TABLE_REFERENCED_BY: { [columnName: string]: iConstraint[] };
} & Required<UppercaseFieldMap<RestTableInterface>>;

export type iRestReactiveLifecycle<G extends OrmGenerics> = {
    beforeProcessing?: {
        [key: string]: (args: {
            config: iRest<G['RestShortTableName'], G['RestTableInterface'], G['PrimaryKey']>;
            request: RequestQueryBody<G['RequestMethod'], G['RestTableInterface'], G['CustomAndRequiredFields'], G['RequestTableOverrides']>;
        }) => void | Promise<void>;
    };
    beforeExecution?: {
        [key: string]: (args: {
            config: iRest<G['RestShortTableName'], G['RestTableInterface'], G['PrimaryKey']>;
            request: RequestQueryBody<G['RequestMethod'], G['RestTableInterface'], G['CustomAndRequiredFields'], G['RequestTableOverrides']>;
        }) => void | Promise<void>;
    };
    afterExecution?: {
        [key: string]: (args: {
            config: iRest<G['RestShortTableName'], G['RestTableInterface'], G['PrimaryKey']>;
            request: RequestQueryBody<G['RequestMethod'], G['RestTableInterface'], G['CustomAndRequiredFields'], G['RequestTableOverrides']>;
            response: AxiosResponse<DetermineResponseDataType<G['RequestMethod'], G['RestTableInterface']>>;
        }) => void | Promise<void>;
    };
    afterCommit?: {
        [key: string]: (args: {
            config: iRest<G['RestShortTableName'], G['RestTableInterface'], G['PrimaryKey']>;
            request: RequestQueryBody<G['RequestMethod'], G['RestTableInterface'], G['CustomAndRequiredFields'], G['RequestTableOverrides']>;
            response: AxiosResponse<DetermineResponseDataType<G['RequestMethod'], G['RestTableInterface']>>;
        }) => void | Promise<void>;
    };
};

export type iRestHooks<G extends OrmGenerics> = {
    [Method in iRestMethods]: iRestReactiveLifecycle<G>;
};

export interface iDynamicApiImport<RestData extends { [key: string]: any } = any> {
    default: iRestApiFunctions<RestData>;
    postState?: (response: AxiosResponse<iPostC6RestResponse<RestData>>, request: iAPI<any>, id: string | number | boolean) => void;
    deleteState?: (response: AxiosResponse<iDeleteC6RestResponse<RestData>>, request: iAPI<any>) => void;
    putState?: (response: AxiosResponse<iPutC6RestResponse<RestData>>, request: iAPI<any>) => void;
}

export interface iRestApiFunctions<RestData extends { [key: string]: any } = any> {
    Delete: (request?: RequestQueryBody<'DELETE', RestData>) => iDeleteC6RestResponse<RestData>;
    Post: (request?: RequestQueryBody<'POST', RestData>) => iPostC6RestResponse<RestData>;
    Get: (request?: RequestQueryBody<'GET', RestData>) => iGetC6RestResponse<RestData>;
    Put: (request?: RequestQueryBody<'PUT', RestData>) => iPutC6RestResponse<RestData>;
}

// TODO - remove the key
export interface iC6Object<
    RestTableInterfaces extends { [key: string]: any } = { [key: string]: any },
> {
    C6VERSION: string;
    TABLES: {
        [K in Extract<keyof RestTableInterfaces, string>]: C6RestfulModel<K, RestTableInterfaces[K], keyof RestTableInterfaces[K] & string>;
    };
    PREFIX: string;
    IMPORT: (tableName: string) => Promise<iDynamicApiImport>;
    [key: string]: any;
}

export interface tC6RestApi {
    [key: string]: {
        REST: iRestApiFunctions;
        PUT: Function;
        POST: Function;
        DELETE: Function;
    };
}
