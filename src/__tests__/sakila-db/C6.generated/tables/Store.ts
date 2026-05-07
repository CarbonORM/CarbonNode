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
CREATE TABLE `store` (
  `store_id` tinyint unsigned NOT NULL AUTO_INCREMENT,
  `manager_staff_id` tinyint unsigned NOT NULL,
  `address_id` smallint unsigned NOT NULL,
  `last_update` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`store_id`),
  UNIQUE KEY `idx_unique_manager` (`manager_staff_id`),
  KEY `idx_fk_address_id` (`address_id`),
  CONSTRAINT `fk_store_address` FOREIGN KEY (`address_id`) REFERENCES `address` (`address_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_store_staff` FOREIGN KEY (`manager_staff_id`) REFERENCES `staff` (`staff_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=40 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
**/

export interface iStore {
    'store_id'?: number;
    'manager_staff_id'?: number;
    'address_id'?: number;
    'last_update'?: Date | number | string;
}

export type StorePrimaryKeys = 
        'store_id'
    ;

const store:
    C6RestfulModel<
        'store',
        iStore,
        StorePrimaryKeys
    > = {
    TABLE_NAME: 'store',
    STORE_ID: 'store.store_id',
    MANAGER_STAFF_ID: 'store.manager_staff_id',
    ADDRESS_ID: 'store.address_id',
    LAST_UPDATE: 'store.last_update',
    PRIMARY: [
        'store.store_id',
    ],
    PRIMARY_SHORT: [
        'store_id',
    ],
    COLUMNS: {
        'store.store_id': 'store_id',
        'store.manager_staff_id': 'manager_staff_id',
        'store.address_id': 'address_id',
        'store.last_update': 'last_update',
    },
    TYPE_VALIDATION: {
        'store.store_id': {
            MYSQL_TYPE: 'tinyint',
            MAX_LENGTH: '',
            AUTO_INCREMENT: true,
            SKIP_COLUMN_IN_POST: false
        },
        'store.manager_staff_id': {
            MYSQL_TYPE: 'tinyint',
            MAX_LENGTH: '',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'store.address_id': {
            MYSQL_TYPE: 'smallint',
            MAX_LENGTH: '',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'store.last_update': {
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
            CONSTRAINT: 'fk_store_address',
        },],'manager_staff_id': [{
            TABLE: 'staff',
            COLUMN: 'staff_id',
            CONSTRAINT: 'fk_store_staff',
        },],
    },
    TABLE_REFERENCED_BY: {
        'store_id': [{
            TABLE: 'customer',
            COLUMN: 'store_id',
            CONSTRAINT: 'fk_customer_store',
        },{
            TABLE: 'inventory',
            COLUMN: 'store_id',
            CONSTRAINT: 'fk_inventory_store',
        },{
            TABLE: 'staff',
            COLUMN: 'store_id',
            CONSTRAINT: 'fk_staff_store',
        },],
    }
}

export const Store = {
    ...store,
    ...restOrm<
        OrmGenerics<any, 'store', iStore, StorePrimaryKeys>
    >(() => ({
        ...GLOBAL_REST_PARAMETERS,
        restModel: store
    }))
}

registerC6Table(
    'store',
    'Store',
    store,
    Store,
);

export default Store;
