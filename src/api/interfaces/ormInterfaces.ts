import {
    apiReturn,
    iAPI,
    iDeleteC6RestResponse,
    iPostC6RestResponse,
    iGetC6RestResponse,
    iPutC6RestResponse
} from "api/restRequest";


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
    REGEX_VALIDATION: RegExpMap,
    TYPE_VALIDATION: { [key: string]: iTypeValidation },
    TABLE_REFERENCES: { [columnName: string]: iConstraint[] },
    TABLE_REFERENCED_BY: { [columnName: string]: iConstraint[] },
}

export interface iRestApiFunctions {
    Delete: (request?: (iAPI<any> & any)) => apiReturn<iDeleteC6RestResponse<any>>;
    Post: (request?: (iAPI<any> & any)) => apiReturn<iPostC6RestResponse<any>>;
    Get: (request?: (iAPI<any> & any)) => apiReturn<iGetC6RestResponse<any>>;
    Put: (request?: (iAPI<any> & any)) => apiReturn<iPutC6RestResponse<any>>
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



