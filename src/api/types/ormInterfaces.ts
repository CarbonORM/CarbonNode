// Refined TypeScript types for CarbonORM

import { AxiosInstance, AxiosPromise, AxiosResponse } from "axios";
import { Pool } from "mysql2/promise";
import { eFetchDependencies } from "./dynamicFetching";
import { Modify } from "./modifyTypes";
import { JoinType, OrderDirection, SQLComparisonOperator, SQLFunction } from "./mysqlTypes";
import { CarbonReact } from "@carbonorm/carbonreact";

export type iRestMethods = 'GET' | 'POST' | 'PUT' | 'DELETE';
export const POST = 'POST';
export const PUT = 'PUT';
export const GET = 'GET';
export const DELETE = 'DELETE';

export interface stringMap { [key: string]: string; }
export interface stringNumberMap { [key: string]: string | number; }
export interface RegExpMap { [key: string]: RegExp | RegExpMap; }
export interface complexMap { [key: string]: stringMap | stringNumberMap | stringMap[] | RegExpMap; }

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
    fetchDependencies?: number | eFetchDependencies | Awaited<apiReturn<iGetC6RestResponse<any>>>[];
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
    : iAPI<Modify<T, Overrides> & Custom>;

export interface iCacheAPI<ResponseDataType = any> {
    requestArgumentsSerialized: string;
    request: AxiosPromise<ResponseDataType>;
    response?: AxiosResponse;
    final?: boolean;
}

export interface iChangeC6Data { rowCount: number; }

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

export type iGetC6RestResponse<ResponseDataType, ResponseDataOverrides = {}> = iC6RestResponse<
    Modify<ResponseDataType, ResponseDataOverrides> | Modify<ResponseDataType, ResponseDataOverrides>[]
>;

export type apiReturn<Response> =
    | null
    | undefined
    | Response
    | (Response extends iPutC6RestResponse | iDeleteC6RestResponse | iPostC6RestResponse ? null : () => apiReturn<Response>);

export type DetermineResponseDataType<
    Method extends iRestMethods,
    RestTableInterface extends { [key: string]: any }
> = Method extends 'POST'
    ? iPostC6RestResponse<RestTableInterface>
    : Method extends 'GET'
        ? iGetC6RestResponse<RestTableInterface>
        : Method extends 'PUT'
            ? iPutC6RestResponse<RestTableInterface>
            : Method extends 'DELETE'
                ? iDeleteC6RestResponse<RestTableInterface>
                : never;

export interface iRest<
    RestShortTableName extends string = any,
    RestTableInterface extends { [key: string]: any } = any,
    PrimaryKey extends keyof RestTableInterface & string = any
> {
    C6: iC6Object;
    axios?: AxiosInstance;
    restURL?: string;
    mysqlPool?: Pool;
    withCredentials?: boolean;
    restModel: iC6RestfulModel<RestShortTableName, RestTableInterface, PrimaryKey>;
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

export type tPrimaryKeys<TableName extends string, PK extends string> = `${TableName}.${PK}`;

export interface iC6RestfulModel<RestShortTableNames extends string, RestTableInterfaces extends { [key: string]: any }, PK extends keyof RestTableInterfaces & string> {
    TABLE_NAME: RestShortTableNames;
    PRIMARY: tPrimaryKeys<RestShortTableNames, PK>[];
    PRIMARY_SHORT: PK[];
    COLUMNS: tColumns<RestShortTableNames, RestTableInterfaces>;
    TYPE_VALIDATION: { [key: string]: iTypeValidation };
    REGEX_VALIDATION: RegExpMap;
    LIFECYCLE_HOOKS: iRestHooks<RestShortTableNames, RestTableInterfaces, PK>;
    TABLE_REFERENCES: { [columnName: string]: iConstraint[] };
    TABLE_REFERENCED_BY: { [columnName: string]: iConstraint[] };
}

export type iRestReactiveLifecycle<
    Method extends iRestMethods,
    RestShortTableName extends string,
    RestTableInterface extends { [key: string]: any },
    PrimaryKey extends keyof RestTableInterface & string,
    CustomAndRequiredFields extends { [key: string]: any },
    RequestTableOverrides extends { [key: string]: any }
> = {
    beforeProcessing?: {
        [key: string]: (args: {
            config: iRest<RestShortTableName, RestTableInterface, PrimaryKey>;
            request: RequestQueryBody<Method, RestTableInterface, CustomAndRequiredFields, RequestTableOverrides>;
        }) => void | Promise<void>;
    };
    beforeExecution?: {
        [key: string]: (args: {
            config: iRest<RestShortTableName, RestTableInterface, PrimaryKey>;
            request: RequestQueryBody<Method, RestTableInterface, CustomAndRequiredFields, RequestTableOverrides>;
        }) => void | Promise<void>;
    };
    afterExecution?: {
        [key: string]: (args: {
            config: iRest<RestShortTableName, RestTableInterface, PrimaryKey>;
            request: RequestQueryBody<Method, RestTableInterface, CustomAndRequiredFields, RequestTableOverrides>;
            response: AxiosResponse<DetermineResponseDataType<Method, RestTableInterface>>;
        }) => void | Promise<void>;
    };
    afterCommit?: {
        [key: string]: (args: {
            config: iRest<RestShortTableName, RestTableInterface, PrimaryKey>;
            request: RequestQueryBody<Method, RestTableInterface, CustomAndRequiredFields, RequestTableOverrides>;
            response: AxiosResponse<DetermineResponseDataType<Method, RestTableInterface>>;
        }) => void | Promise<void>;
    };
};

export type iRestHooks<
    RestShortTableName extends string,
    RestTableInterface extends { [key: string]: any },
    PrimaryKey extends keyof RestTableInterface & string,
    CustomAndRequiredFields extends { [key: string]: any } = any,
    RequestTableOverrides extends { [key: string]: any } = { [key in keyof RestTableInterface]: any }
> = {
    [Method in iRestMethods]: iRestReactiveLifecycle<
        Method,
        RestShortTableName,
        RestTableInterface,
        PrimaryKey,
        CustomAndRequiredFields,
        RequestTableOverrides
    >;
};

export interface iDynamicApiImport<RestData extends { [key: string]: any } = any> {
    default: iRestApiFunctions<RestData>;
    postState?: (response: AxiosResponse<iPostC6RestResponse<RestData>>, request: iAPI<any>, id: string | number | boolean) => void;
    deleteState?: (response: AxiosResponse<iDeleteC6RestResponse<RestData>>, request: iAPI<any>) => void;
    putState?: (response: AxiosResponse<iPutC6RestResponse<RestData>>, request: iAPI<any>) => void;
}

export interface iRestApiFunctions<RestData extends { [key: string]: any } = any> {
    Delete: (request?: RequestQueryBody<'DELETE', RestData>) => apiReturn<iDeleteC6RestResponse<RestData>>;
    Post: (request?: RequestQueryBody<'POST', RestData>) => apiReturn<iPostC6RestResponse<RestData>>;
    Get: (request?: RequestQueryBody<'GET', RestData>) => apiReturn<iGetC6RestResponse<RestData>>;
    Put: (request?: RequestQueryBody<'PUT', RestData>) => apiReturn<iPutC6RestResponse<RestData>>;
}

export interface iC6Object<
    RestShortTableName extends string = any,
    RestTableInterface extends { [key: string]: any } = any,
    PrimaryKey extends Extract<keyof RestTableInterface, string> = Extract<keyof RestTableInterface, string>
> {
    C6VERSION: string;
    TABLES: {
        [key: string]: iC6RestfulModel<RestShortTableName, RestTableInterface, PrimaryKey> & {
            [key: string]: string | number;
        };
    };
    PREFIX: string;
    IMPORT: (tableName: string) => Promise<iDynamicApiImport>;
    [key: string]: any;
}

export interface tC6Tables<
    RestShortTableName extends string = any,
    RestTableInterface extends { [key: string]: any } = any,
    PrimaryKey extends Extract<keyof RestTableInterface, string> = Extract<keyof RestTableInterface, string>
> {
    [key: string]: iC6RestfulModel<RestShortTableName, RestTableInterface, PrimaryKey> & { [key: string]: any };
}

export interface tC6RestApi {
    [key: string]: {
        REST: iRestApiFunctions;
        PUT: Function;
        POST: Function;
        DELETE: Function;
    };
}
