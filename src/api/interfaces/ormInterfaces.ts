
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

export interface C6RestfulModel<RestShortTableNames extends string = string> {
    TABLE_NAME: RestShortTableNames,
    PRIMARY: string[],
    COLUMNS: stringMap,
    REGEX_VALIDATION: RegExpMap,
    TYPE_VALIDATION: {[key: string]: iTypeValidation},
}