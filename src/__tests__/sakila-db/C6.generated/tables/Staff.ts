// noinspection JSUnusedGlobalSymbols,SpellCheckingInspection

import { restOrm } from "@carbonorm/carbonnode";
import type {
    C6RestfulModel,
    OrmGenerics,
} from "@carbonorm/carbonnode";
import {
    GLOBAL_REST_PARAMETERS,
    registerC6Table,
} from "../core";

/**
CREATE TABLE `staff` (
  `staff_id` tinyint unsigned NOT NULL AUTO_INCREMENT,
  `first_name` varchar(45) NOT NULL,
  `last_name` varchar(45) NOT NULL,
  `address_id` smallint unsigned NOT NULL,
  `picture` blob,
  `email` varchar(50) DEFAULT NULL,
  `store_id` tinyint unsigned NOT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `username` varchar(16) NOT NULL,
  `password` varchar(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `last_update` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`staff_id`),
  KEY `idx_fk_store_id` (`store_id`),
  KEY `idx_fk_address_id` (`address_id`),
  CONSTRAINT `fk_staff_address` FOREIGN KEY (`address_id`) REFERENCES `address` (`address_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_staff_store` FOREIGN KEY (`store_id`) REFERENCES `store` (`store_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=103 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
**/

export interface iStaff {
    'staff_id'?: number;
    'first_name'?: string;
    'last_name'?: string;
    'address_id'?: number;
    'picture'?: Buffer | string | null;
    'email'?: string | null;
    'store_id'?: number;
    'active'?: number;
    'username'?: string;
    'password'?: string | null;
    'last_update'?: Date | number | string;
}

export type StaffPrimaryKeys = 
        'staff_id'
    ;

const staff:
    C6RestfulModel<
        'staff',
        iStaff,
        StaffPrimaryKeys
    > & Record<string, any> & {
        RELATION_TYPE: 'TABLE';
        READ_ONLY: false;
    } = {
    TABLE_NAME: 'staff',
    RELATION_TYPE: 'TABLE',
    READ_ONLY: false,
    STAFF_ID: 'staff.staff_id',
    FIRST_NAME: 'staff.first_name',
    LAST_NAME: 'staff.last_name',
    ADDRESS_ID: 'staff.address_id',
    PICTURE: 'staff.picture',
    EMAIL: 'staff.email',
    STORE_ID: 'staff.store_id',
    ACTIVE: 'staff.active',
    USERNAME: 'staff.username',
    PASSWORD: 'staff.password',
    LAST_UPDATE: 'staff.last_update',
    PRIMARY: [
        'staff.staff_id',
    ],
    PRIMARY_SHORT: [
        'staff_id',
    ],
    COLUMNS: {
        'staff.staff_id': 'staff_id',
        'staff.first_name': 'first_name',
        'staff.last_name': 'last_name',
        'staff.address_id': 'address_id',
        'staff.picture': 'picture',
        'staff.email': 'email',
        'staff.store_id': 'store_id',
        'staff.active': 'active',
        'staff.username': 'username',
        'staff.password': 'password',
        'staff.last_update': 'last_update',
    },
    TYPE_VALIDATION: {
        'staff.staff_id': {
            MYSQL_TYPE: 'tinyint',
            MAX_LENGTH: '',
            AUTO_INCREMENT: true,
            SKIP_COLUMN_IN_POST: false
        },
        'staff.first_name': {
            MYSQL_TYPE: 'varchar',
            MAX_LENGTH: '45',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'staff.last_name': {
            MYSQL_TYPE: 'varchar',
            MAX_LENGTH: '45',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'staff.address_id': {
            MYSQL_TYPE: 'smallint',
            MAX_LENGTH: '',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'staff.picture': {
            MYSQL_TYPE: 'blob',
            MAX_LENGTH: '',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: true
        },
        'staff.email': {
            MYSQL_TYPE: 'varchar',
            MAX_LENGTH: '50',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'staff.store_id': {
            MYSQL_TYPE: 'tinyint',
            MAX_LENGTH: '',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'staff.active': {
            MYSQL_TYPE: 'tinyint',
            MAX_LENGTH: '1',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'staff.username': {
            MYSQL_TYPE: 'varchar',
            MAX_LENGTH: '16',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'staff.password': {
            MYSQL_TYPE: 'varchar',
            MAX_LENGTH: '40',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: true
        },
        'staff.last_update': {
            MYSQL_TYPE: 'timestamp',
            MAX_LENGTH: '',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
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
    TABLE_REFERENCES: {
        'address_id': [{
            TABLE: 'address',
            COLUMN: 'address_id',
            CONSTRAINT: 'fk_staff_address',
        },],'store_id': [{
            TABLE: 'store',
            COLUMN: 'store_id',
            CONSTRAINT: 'fk_staff_store',
        },],
    },
    TABLE_REFERENCED_BY: {
        'staff_id': [{
            TABLE: 'payment',
            COLUMN: 'staff_id',
            CONSTRAINT: 'fk_payment_staff',
        },{
            TABLE: 'rental',
            COLUMN: 'staff_id',
            CONSTRAINT: 'fk_rental_staff',
        },{
            TABLE: 'store',
            COLUMN: 'manager_staff_id',
            CONSTRAINT: 'fk_store_staff',
        },],
    }
}

export const Staff = {
    ...staff,
    ...restOrm<
        OrmGenerics<any, 'staff', iStaff, StaffPrimaryKeys>
    >(() => ({
        ...GLOBAL_REST_PARAMETERS,
        restModel: staff
    }))
}

registerC6Table(
    'staff',
    'Staff',
    staff,
    Staff,
    'TABLE',
);

export default Staff;
