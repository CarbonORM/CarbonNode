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
CREATE TABLE `payment` (
  `payment_id` smallint unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` smallint unsigned NOT NULL,
  `staff_id` tinyint unsigned NOT NULL,
  `rental_id` int DEFAULT NULL,
  `amount` decimal(5,2) NOT NULL,
  `payment_date` datetime NOT NULL,
  `last_update` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`payment_id`),
  KEY `idx_fk_staff_id` (`staff_id`),
  KEY `idx_fk_customer_id` (`customer_id`),
  KEY `fk_payment_rental` (`rental_id`),
  CONSTRAINT `fk_payment_customer` FOREIGN KEY (`customer_id`) REFERENCES `customer` (`customer_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_payment_rental` FOREIGN KEY (`rental_id`) REFERENCES `rental` (`rental_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_payment_staff` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`staff_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=16160 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
**/

export interface iPayment {
    'payment_id'?: number;
    'customer_id'?: number;
    'staff_id'?: number;
    'rental_id'?: number | null;
    'amount'?: number;
    'payment_date'?: Date | number | string;
    'last_update'?: Date | number | string | null;
}

export type PaymentPrimaryKeys = 
        'payment_id'
    ;

const payment:
    C6RestfulModel<
        'payment',
        iPayment,
        PaymentPrimaryKeys
    > & Record<string, any> & {
        RELATION_TYPE: 'TABLE';
        READ_ONLY: false;
    } = {
    TABLE_NAME: 'payment',
    RELATION_TYPE: 'TABLE',
    READ_ONLY: false,
    PAYMENT_ID: 'payment.payment_id',
    CUSTOMER_ID: 'payment.customer_id',
    STAFF_ID: 'payment.staff_id',
    RENTAL_ID: 'payment.rental_id',
    AMOUNT: 'payment.amount',
    PAYMENT_DATE: 'payment.payment_date',
    LAST_UPDATE: 'payment.last_update',
    PRIMARY: [
        'payment.payment_id',
    ],
    PRIMARY_SHORT: [
        'payment_id',
    ],
    COLUMNS: {
        'payment.payment_id': 'payment_id',
        'payment.customer_id': 'customer_id',
        'payment.staff_id': 'staff_id',
        'payment.rental_id': 'rental_id',
        'payment.amount': 'amount',
        'payment.payment_date': 'payment_date',
        'payment.last_update': 'last_update',
    },
    TYPE_VALIDATION: {
        'payment.payment_id': {
            MYSQL_TYPE: 'smallint',
            MAX_LENGTH: '',
            AUTO_INCREMENT: true,
            SKIP_COLUMN_IN_POST: false
        },
        'payment.customer_id': {
            MYSQL_TYPE: 'smallint',
            MAX_LENGTH: '',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'payment.staff_id': {
            MYSQL_TYPE: 'tinyint',
            MAX_LENGTH: '',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'payment.rental_id': {
            MYSQL_TYPE: 'int',
            MAX_LENGTH: '',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'payment.amount': {
            MYSQL_TYPE: 'decimal',
            MAX_LENGTH: '5,2',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'payment.payment_date': {
            MYSQL_TYPE: 'datetime',
            MAX_LENGTH: '',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'payment.last_update': {
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
            CONSTRAINT: 'fk_payment_customer',
        },],'rental_id': [{
            TABLE: 'rental',
            COLUMN: 'rental_id',
            CONSTRAINT: 'fk_payment_rental',
        },],'staff_id': [{
            TABLE: 'staff',
            COLUMN: 'staff_id',
            CONSTRAINT: 'fk_payment_staff',
        },],
    },
    TABLE_REFERENCED_BY: {
        
    }
}

export const Payment = {
    ...payment,
    ...restOrm<
        OrmGenerics<any, 'payment', iPayment, PaymentPrimaryKeys>
    >(() => ({
        ...GLOBAL_REST_PARAMETERS,
        restModel: payment
    }))
}

registerC6Table(
    'payment',
    'Payment',
    payment,
    Payment,
    'TABLE',
);

export default Payment;
