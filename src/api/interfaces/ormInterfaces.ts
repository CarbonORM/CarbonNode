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


export type tC6Tables = { [key: string]: (iC6RestfulModel & { [key: string]: any }) }

export type tWsLiveUpdate = { [key: string]: { PUT: Function, POST: Function, DELETE: Function } };

