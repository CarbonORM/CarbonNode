// noinspection JSUnusedGlobalSymbols,SpellCheckingInspection

import { restRequest } from "@carbonorm/carbonnode";
import {
    GLOBAL_REST_PARAMETERS,
    registerC6Table,
} from "../core";

/**
CREATE VIEW `staff_list` AS select `s`.`staff_id` AS `ID`,concat(`s`.`first_name`,_utf8mb4' ',`s`.`last_name`) AS `name`,`a`.`address` AS `address`,`a`.`postal_code` AS `zip code`,`a`.`phone` AS `phone`,`city`.`city` AS `city`,`country`.`country` AS `country`,`s`.`store_id` AS `SID` from (((`staff` `s` join `address` `a` on((`s`.`address_id` = `a`.`address_id`))) join `city` on((`a`.`city_id` = `city`.`city_id`))) join `country` on((`city`.`country_id` = `country`.`country_id`)));
**/

export interface iStaff_List {
    'ID'?: number;
    'name'?: string | null;
    'address'?: string;
    'zip code'?: string | null;
    'phone'?: string;
    'city'?: string;
    'country'?: string;
    'SID'?: number;
}

export type Staff_ListPrimaryKeys = never;

const staff_list: Record<string, any> & {
        TABLE_NAME: 'staff_list';
        RELATION_TYPE: 'VIEW';
        READ_ONLY: true;
    } = {
    TABLE_NAME: 'staff_list',
    RELATION_TYPE: 'VIEW',
    READ_ONLY: true,
    ID: 'staff_list.ID',
    NAME: 'staff_list.name',
    ADDRESS: 'staff_list.address',
    ZIP_CODE: 'staff_list.zip code',
    PHONE: 'staff_list.phone',
    CITY: 'staff_list.city',
    COUNTRY: 'staff_list.country',
    SID: 'staff_list.SID',
    PRIMARY: [],
    PRIMARY_SHORT: [],
    COLUMNS: {
        'staff_list.ID': 'ID',
        'staff_list.name': 'name',
        'staff_list.address': 'address',
        'staff_list.zip code': 'zip code',
        'staff_list.phone': 'phone',
        'staff_list.city': 'city',
        'staff_list.country': 'country',
        'staff_list.SID': 'SID',
    },
    TYPE_VALIDATION: {
        'staff_list.ID': {
            MYSQL_TYPE: 'tinyint',
            MAX_LENGTH: '',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: true
        },
        'staff_list.name': {
            MYSQL_TYPE: 'varchar',
            MAX_LENGTH: '91',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: true
        },
        'staff_list.address': {
            MYSQL_TYPE: 'varchar',
            MAX_LENGTH: '50',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: true
        },
        'staff_list.zip code': {
            MYSQL_TYPE: 'varchar',
            MAX_LENGTH: '10',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: true
        },
        'staff_list.phone': {
            MYSQL_TYPE: 'varchar',
            MAX_LENGTH: '20',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: true
        },
        'staff_list.city': {
            MYSQL_TYPE: 'varchar',
            MAX_LENGTH: '50',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: true
        },
        'staff_list.country': {
            MYSQL_TYPE: 'varchar',
            MAX_LENGTH: '50',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: true
        },
        'staff_list.SID': {
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

export const Staff_List = {
    ...staff_list,
    Get: (restRequest as any)(() => ({
        ...GLOBAL_REST_PARAMETERS,
        restModel: staff_list as any,
        requestMethod: 'GET',
    }))
}

registerC6Table(
    'staff_list',
    'Staff_List',
    staff_list,
    Staff_List,
    'VIEW',
);

export default Staff_List;
