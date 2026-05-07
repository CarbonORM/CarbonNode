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
CREATE TABLE `inventory` (
  `inventory_id` mediumint unsigned NOT NULL AUTO_INCREMENT,
  `film_id` smallint unsigned NOT NULL,
  `store_id` tinyint unsigned NOT NULL,
  `last_update` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`inventory_id`),
  KEY `idx_fk_film_id` (`film_id`),
  KEY `idx_store_id_film_id` (`store_id`,`film_id`),
  CONSTRAINT `fk_inventory_film` FOREIGN KEY (`film_id`) REFERENCES `film` (`film_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_inventory_store` FOREIGN KEY (`store_id`) REFERENCES `store` (`store_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4674 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
**/

export interface iInventory {
    'inventory_id'?: number;
    'film_id'?: number;
    'store_id'?: number;
    'last_update'?: Date | number | string;
}

export type InventoryPrimaryKeys = 
        'inventory_id'
    ;

const inventory:
    C6RestfulModel<
        'inventory',
        iInventory,
        InventoryPrimaryKeys
    > = {
    TABLE_NAME: 'inventory',
    INVENTORY_ID: 'inventory.inventory_id',
    FILM_ID: 'inventory.film_id',
    STORE_ID: 'inventory.store_id',
    LAST_UPDATE: 'inventory.last_update',
    PRIMARY: [
        'inventory.inventory_id',
    ],
    PRIMARY_SHORT: [
        'inventory_id',
    ],
    COLUMNS: {
        'inventory.inventory_id': 'inventory_id',
        'inventory.film_id': 'film_id',
        'inventory.store_id': 'store_id',
        'inventory.last_update': 'last_update',
    },
    TYPE_VALIDATION: {
        'inventory.inventory_id': {
            MYSQL_TYPE: 'mediumint',
            MAX_LENGTH: '',
            AUTO_INCREMENT: true,
            SKIP_COLUMN_IN_POST: false
        },
        'inventory.film_id': {
            MYSQL_TYPE: 'smallint',
            MAX_LENGTH: '',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'inventory.store_id': {
            MYSQL_TYPE: 'tinyint',
            MAX_LENGTH: '',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'inventory.last_update': {
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
        'film_id': [{
            TABLE: 'film',
            COLUMN: 'film_id',
            CONSTRAINT: 'fk_inventory_film',
        },],'store_id': [{
            TABLE: 'store',
            COLUMN: 'store_id',
            CONSTRAINT: 'fk_inventory_store',
        },],
    },
    TABLE_REFERENCED_BY: {
        'inventory_id': [{
            TABLE: 'rental',
            COLUMN: 'inventory_id',
            CONSTRAINT: 'fk_rental_inventory',
        },],
    }
}

export const Inventory = {
    ...inventory,
    ...restOrm<
        OrmGenerics<any, 'inventory', iInventory, InventoryPrimaryKeys>
    >(() => ({
        ...GLOBAL_REST_PARAMETERS,
        restModel: inventory
    }))
}

registerC6Table(
    'inventory',
    'Inventory',
    inventory,
    Inventory,
);

export default Inventory;
