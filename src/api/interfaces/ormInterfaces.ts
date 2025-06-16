import {
    apiReturn,
    iAPI,
    iDeleteC6RestResponse,
    iPostC6RestResponse,
    iGetC6RestResponse,
    iPutC6RestResponse, RequestGetPutDeleteBody
} from "api/restRequest";
import {AxiosResponse} from "axios";


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



