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
CREATE TABLE `customer` (
  `customer_id` smallint unsigned NOT NULL AUTO_INCREMENT,
  `store_id` tinyint unsigned NOT NULL,
  `first_name` varchar(45) NOT NULL,
  `last_name` varchar(45) NOT NULL,
  `email` varchar(50) DEFAULT NULL,
  `address_id` smallint unsigned NOT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `create_date` datetime NOT NULL,
  `last_update` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`customer_id`),
  KEY `idx_fk_store_id` (`store_id`),
  KEY `idx_fk_address_id` (`address_id`),
  KEY `idx_last_name` (`last_name`),
  CONSTRAINT `fk_customer_address` FOREIGN KEY (`address_id`) REFERENCES `address` (`address_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_customer_store` FOREIGN KEY (`store_id`) REFERENCES `store` (`store_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=710 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
**/

export interface iCustomer {
    'customer_id'?: number;
    'store_id'?: number;
    'first_name'?: string;
    'last_name'?: string;
    'email'?: string | null;
    'address_id'?: number;
    'active'?: number;
    'create_date'?: Date | number | string;
    'last_update'?: Date | number | string | null;
}

export type CustomerPrimaryKeys = 
        'customer_id'
    ;

const customer:
    C6RestfulModel<
        'customer',
        iCustomer,
        CustomerPrimaryKeys
    > & Record<string, any> & {
        RELATION_TYPE: 'TABLE';
        READ_ONLY: false;
    } = {
    TABLE_NAME: 'customer',
    RELATION_TYPE: 'TABLE',
    READ_ONLY: false,
    CUSTOMER_ID: 'customer.customer_id',
    STORE_ID: 'customer.store_id',
    FIRST_NAME: 'customer.first_name',
    LAST_NAME: 'customer.last_name',
    EMAIL: 'customer.email',
    ADDRESS_ID: 'customer.address_id',
    ACTIVE: 'customer.active',
    CREATE_DATE: 'customer.create_date',
    LAST_UPDATE: 'customer.last_update',
    PRIMARY: [
        'customer.customer_id',
    ],
    PRIMARY_SHORT: [
        'customer_id',
    ],
    COLUMNS: {
        'customer.customer_id': 'customer_id',
        'customer.store_id': 'store_id',
        'customer.first_name': 'first_name',
        'customer.last_name': 'last_name',
        'customer.email': 'email',
        'customer.address_id': 'address_id',
        'customer.active': 'active',
        'customer.create_date': 'create_date',
        'customer.last_update': 'last_update',
    },
    TYPE_VALIDATION: {
        'customer.customer_id': {
            MYSQL_TYPE: 'smallint',
            MAX_LENGTH: '',
            AUTO_INCREMENT: true,
            SKIP_COLUMN_IN_POST: false
        },
        'customer.store_id': {
            MYSQL_TYPE: 'tinyint',
            MAX_LENGTH: '',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'customer.first_name': {
            MYSQL_TYPE: 'varchar',
            MAX_LENGTH: '45',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'customer.last_name': {
            MYSQL_TYPE: 'varchar',
            MAX_LENGTH: '45',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'customer.email': {
            MYSQL_TYPE: 'varchar',
            MAX_LENGTH: '50',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'customer.address_id': {
            MYSQL_TYPE: 'smallint',
            MAX_LENGTH: '',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'customer.active': {
            MYSQL_TYPE: 'tinyint',
            MAX_LENGTH: '1',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'customer.create_date': {
            MYSQL_TYPE: 'datetime',
            MAX_LENGTH: '',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'customer.last_update': {
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
            CONSTRAINT: 'fk_customer_address',
        },],'store_id': [{
            TABLE: 'store',
            COLUMN: 'store_id',
            CONSTRAINT: 'fk_customer_store',
        },],
    },
    TABLE_REFERENCED_BY: {
        'customer_id': [{
            TABLE: 'payment',
            COLUMN: 'customer_id',
            CONSTRAINT: 'fk_payment_customer',
        },{
            TABLE: 'rental',
            COLUMN: 'customer_id',
            CONSTRAINT: 'fk_rental_customer',
        },],
    }
}

export const Customer = {
    ...customer,
    ...restOrm<
        OrmGenerics<any, 'customer', iCustomer, CustomerPrimaryKeys>
    >(() => ({
        ...GLOBAL_REST_PARAMETERS,
        restModel: customer
    }))
}

registerC6Table(
    'customer',
    'Customer',
    customer,
    Customer,
    'TABLE',
);

export default Customer;
