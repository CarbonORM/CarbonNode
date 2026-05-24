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
CREATE TABLE `rental` (
  `rental_id` int NOT NULL AUTO_INCREMENT,
  `rental_date` datetime NOT NULL,
  `inventory_id` mediumint unsigned NOT NULL,
  `customer_id` smallint unsigned NOT NULL,
  `return_date` datetime DEFAULT NULL,
  `staff_id` tinyint unsigned NOT NULL,
  `last_update` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`rental_id`),
  UNIQUE KEY `rental_date` (`rental_date`,`inventory_id`,`customer_id`),
  KEY `idx_fk_inventory_id` (`inventory_id`),
  KEY `idx_fk_customer_id` (`customer_id`),
  KEY `idx_fk_staff_id` (`staff_id`),
  CONSTRAINT `fk_rental_customer` FOREIGN KEY (`customer_id`) REFERENCES `customer` (`customer_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_rental_inventory` FOREIGN KEY (`inventory_id`) REFERENCES `inventory` (`inventory_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_rental_staff` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`staff_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=16160 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
**/

export interface iRental {
    'rental_id'?: number;
    'rental_date'?: Date | number | string;
    'inventory_id'?: number;
    'customer_id'?: number;
    'return_date'?: Date | number | string | null;
    'staff_id'?: number;
    'last_update'?: Date | number | string;
}

export type RentalPrimaryKeys = 
        'rental_id'
    ;

const rental:
    C6RestfulModel<
        'rental',
        iRental,
        RentalPrimaryKeys
    > & Record<string, any> & {
        RELATION_TYPE: 'TABLE';
        READ_ONLY: false;
    } = {
    TABLE_NAME: 'rental',
    RELATION_TYPE: 'TABLE',
    READ_ONLY: false,
    RENTAL_ID: 'rental.rental_id',
    RENTAL_DATE: 'rental.rental_date',
    INVENTORY_ID: 'rental.inventory_id',
    CUSTOMER_ID: 'rental.customer_id',
    RETURN_DATE: 'rental.return_date',
    STAFF_ID: 'rental.staff_id',
    LAST_UPDATE: 'rental.last_update',
    PRIMARY: [
        'rental.rental_id',
    ],
    PRIMARY_SHORT: [
        'rental_id',
    ],
    COLUMNS: {
        'rental.rental_id': 'rental_id',
        'rental.rental_date': 'rental_date',
        'rental.inventory_id': 'inventory_id',
        'rental.customer_id': 'customer_id',
        'rental.return_date': 'return_date',
        'rental.staff_id': 'staff_id',
        'rental.last_update': 'last_update',
    },
    TYPE_VALIDATION: {
        'rental.rental_id': {
            MYSQL_TYPE: 'int',
            MAX_LENGTH: '',
            AUTO_INCREMENT: true,
            SKIP_COLUMN_IN_POST: false
        },
        'rental.rental_date': {
            MYSQL_TYPE: 'datetime',
            MAX_LENGTH: '',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'rental.inventory_id': {
            MYSQL_TYPE: 'mediumint',
            MAX_LENGTH: '',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'rental.customer_id': {
            MYSQL_TYPE: 'smallint',
            MAX_LENGTH: '',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'rental.return_date': {
            MYSQL_TYPE: 'datetime',
            MAX_LENGTH: '',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'rental.staff_id': {
            MYSQL_TYPE: 'tinyint',
            MAX_LENGTH: '',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'rental.last_update': {
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
        'customer_id': [{
            TABLE: 'customer',
            COLUMN: 'customer_id',
            CONSTRAINT: 'fk_rental_customer',
        },],'inventory_id': [{
            TABLE: 'inventory',
            COLUMN: 'inventory_id',
            CONSTRAINT: 'fk_rental_inventory',
        },],'staff_id': [{
            TABLE: 'staff',
            COLUMN: 'staff_id',
            CONSTRAINT: 'fk_rental_staff',
        },],
    },
    TABLE_REFERENCED_BY: {
        'rental_id': [{
            TABLE: 'payment',
            COLUMN: 'rental_id',
            CONSTRAINT: 'fk_payment_rental',
        },],
    }
}

export const Rental = {
    ...rental,
    ...restOrm<
        OrmGenerics<any, 'rental', iRental, RentalPrimaryKeys>
    >(() => ({
        ...GLOBAL_REST_PARAMETERS,
        restModel: rental
    }))
}

registerC6Table(
    'rental',
    'Rental',
    rental,
    Rental,
    'TABLE',
);

export default Rental;
