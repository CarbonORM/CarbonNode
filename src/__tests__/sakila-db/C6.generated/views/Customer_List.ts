// noinspection JSUnusedGlobalSymbols,SpellCheckingInspection

import { restRequest } from "@carbonorm/carbonnode";
import {
    GLOBAL_REST_PARAMETERS,
    registerC6Table,
} from "../core";

/**
CREATE VIEW `customer_list` AS select `cu`.`customer_id` AS `ID`,concat(`cu`.`first_name`,_utf8mb4' ',`cu`.`last_name`) AS `name`,`a`.`address` AS `address`,`a`.`postal_code` AS `zip code`,`a`.`phone` AS `phone`,`city`.`city` AS `city`,`country`.`country` AS `country`,if(`cu`.`active`,_utf8mb4'active',_utf8mb4'') AS `notes`,`cu`.`store_id` AS `SID` from (((`customer` `cu` join `address` `a` on((`cu`.`address_id` = `a`.`address_id`))) join `city` on((`a`.`city_id` = `city`.`city_id`))) join `country` on((`city`.`country_id` = `country`.`country_id`)));
**/

export interface iCustomer_List {
    'ID'?: number;
    'name'?: string | null;
    'address'?: string;
    'zip code'?: string | null;
    'phone'?: string;
    'city'?: string;
    'country'?: string;
    'notes'?: string;
    'SID'?: number;
}

export type Customer_ListPrimaryKeys = never;

const customer_list: Record<string, any> & {
        TABLE_NAME: 'customer_list';
        RELATION_TYPE: 'VIEW';
        READ_ONLY: true;
    } = {
    TABLE_NAME: 'customer_list',
    RELATION_TYPE: 'VIEW',
    READ_ONLY: true,
    ID: 'customer_list.ID',
    NAME: 'customer_list.name',
    ADDRESS: 'customer_list.address',
    ZIP_CODE: 'customer_list.zip code',
    PHONE: 'customer_list.phone',
    CITY: 'customer_list.city',
    COUNTRY: 'customer_list.country',
    NOTES: 'customer_list.notes',
    SID: 'customer_list.SID',
    PRIMARY: [],
    PRIMARY_SHORT: [],
    COLUMNS: {
        'customer_list.ID': 'ID',
        'customer_list.name': 'name',
        'customer_list.address': 'address',
        'customer_list.zip code': 'zip code',
        'customer_list.phone': 'phone',
        'customer_list.city': 'city',
        'customer_list.country': 'country',
        'customer_list.notes': 'notes',
        'customer_list.SID': 'SID',
    },
    TYPE_VALIDATION: {
        'customer_list.ID': {
            MYSQL_TYPE: 'smallint',
            MAX_LENGTH: '',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: true
        },
        'customer_list.name': {
            MYSQL_TYPE: 'varchar',
            MAX_LENGTH: '91',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: true
        },
        'customer_list.address': {
            MYSQL_TYPE: 'varchar',
            MAX_LENGTH: '50',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: true
        },
        'customer_list.zip code': {
            MYSQL_TYPE: 'varchar',
            MAX_LENGTH: '10',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: true
        },
        'customer_list.phone': {
            MYSQL_TYPE: 'varchar',
            MAX_LENGTH: '20',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: true
        },
        'customer_list.city': {
            MYSQL_TYPE: 'varchar',
            MAX_LENGTH: '50',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: true
        },
        'customer_list.country': {
            MYSQL_TYPE: 'varchar',
            MAX_LENGTH: '50',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: true
        },
        'customer_list.notes': {
            MYSQL_TYPE: 'varchar',
            MAX_LENGTH: '6',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: true
        },
        'customer_list.SID': {
            MYSQL_TYPE: 'tinyint',
            MAX_LENGTH: '',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: true
        },
    },
    REGEX_VALIDATION: {
    },
    LIFECYCLE_HOOKS: {
        GET: {beforeProcessing:{}, beforeExecution:{}, afterExecution:{}, afterCommit:{}},
        PUT: {beforeProcessing:{}, beforeExecution:{}, afterExecution:{}, afterCommit:{}},
        POST: {beforeProcessing:{}, beforeExecution:{}, afterExecution:{}, afterCommit:{}},
        DELETE: {beforeProcessing:{}, beforeExecution:{}, afterExecution:{}, afterCommit:{}},
    },
    TABLE_REFERENCES: {},
    TABLE_REFERENCED_BY: {}
}

export const Customer_List = {
    ...customer_list,
    Get: (restRequest as any)(() => ({
        ...GLOBAL_REST_PARAMETERS,
        restModel: customer_list as any,
        requestMethod: 'GET',
    }))
}

registerC6Table(
    'customer_list',
    'Customer_List',
    customer_list,
    Customer_List,
    'VIEW',
);

export default Customer_List;
