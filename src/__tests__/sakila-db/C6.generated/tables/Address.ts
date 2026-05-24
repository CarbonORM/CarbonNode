// noinspection JSUnusedGlobalSymbols,SpellCheckingInspection

import { restOrm } from "@carbonorm/carbonnode";
import type {
    C6RestfulModel,
    OrmGenerics,
} from "@carbonorm/carbonnode";
import type * as GeoJSON from "geojson";
import {
    GLOBAL_REST_PARAMETERS,
    registerC6Table,
} from "../core";

/**
CREATE TABLE `address` (
  `address_id` smallint unsigned NOT NULL AUTO_INCREMENT,
  `address` varchar(50) NOT NULL,
  `address2` varchar(50) DEFAULT NULL,
  `district` varchar(20) NOT NULL,
  `city_id` smallint unsigned NOT NULL,
  `postal_code` varchar(10) DEFAULT NULL,
  `phone` varchar(20) NOT NULL,
  `location` geometry NOT NULL /!* SRID 0 *!/,
  `last_update` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`address_id`),
  KEY `idx_fk_city_id` (`city_id`),
  SPATIAL KEY `idx_location` (`location`),
  CONSTRAINT `fk_address_city` FOREIGN KEY (`city_id`) REFERENCES `city` (`city_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=713 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
**/

export interface iAddress {
    'address_id'?: number;
    'address'?: string;
    'address2'?: string | null;
    'district'?: string;
    'city_id'?: number;
    'postal_code'?: string | null;
    'phone'?: string;
    'location'?: GeoJSON.Geometry;
    'last_update'?: Date | number | string;
}

export type AddressPrimaryKeys = 
        'address_id'
    ;

const address:
    C6RestfulModel<
        'address',
        iAddress,
        AddressPrimaryKeys
    > & Record<string, any> & {
        RELATION_TYPE: 'TABLE';
        READ_ONLY: false;
    } = {
    TABLE_NAME: 'address',
    RELATION_TYPE: 'TABLE',
    READ_ONLY: false,
    ADDRESS_ID: 'address.address_id',
    ADDRESS: 'address.address',
    ADDRESS2: 'address.address2',
    DISTRICT: 'address.district',
    CITY_ID: 'address.city_id',
    POSTAL_CODE: 'address.postal_code',
    PHONE: 'address.phone',
    LOCATION: 'address.location',
    LAST_UPDATE: 'address.last_update',
    PRIMARY: [
        'address.address_id',
    ],
    PRIMARY_SHORT: [
        'address_id',
    ],
    COLUMNS: {
        'address.address_id': 'address_id',
        'address.address': 'address',
        'address.address2': 'address2',
        'address.district': 'district',
        'address.city_id': 'city_id',
        'address.postal_code': 'postal_code',
        'address.phone': 'phone',
        'address.location': 'location',
        'address.last_update': 'last_update',
    },
    TYPE_VALIDATION: {
        'address.address_id': {
            MYSQL_TYPE: 'smallint',
            MAX_LENGTH: '',
            AUTO_INCREMENT: true,
            SKIP_COLUMN_IN_POST: false
        },
        'address.address': {
            MYSQL_TYPE: 'varchar',
            MAX_LENGTH: '50',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'address.address2': {
            MYSQL_TYPE: 'varchar',
            MAX_LENGTH: '50',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'address.district': {
            MYSQL_TYPE: 'varchar',
            MAX_LENGTH: '20',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'address.city_id': {
            MYSQL_TYPE: 'smallint',
            MAX_LENGTH: '',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'address.postal_code': {
            MYSQL_TYPE: 'varchar',
            MAX_LENGTH: '10',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'address.phone': {
            MYSQL_TYPE: 'varchar',
            MAX_LENGTH: '20',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'address.location': {
            MYSQL_TYPE: 'geometry',
            MAX_LENGTH: '',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'address.last_update': {
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
        'city_id': [{
            TABLE: 'city',
            COLUMN: 'city_id',
            CONSTRAINT: 'fk_address_city',
        },],
    },
    TABLE_REFERENCED_BY: {
        'address_id': [{
            TABLE: 'customer',
            COLUMN: 'address_id',
            CONSTRAINT: 'fk_customer_address',
        },{
            TABLE: 'staff',
            COLUMN: 'address_id',
            CONSTRAINT: 'fk_staff_address',
        },{
            TABLE: 'store',
            COLUMN: 'address_id',
            CONSTRAINT: 'fk_store_address',
        },],
    }
}

export const Address = {
    ...address,
    ...restOrm<
        OrmGenerics<any, 'address', iAddress, AddressPrimaryKeys>
    >(() => ({
        ...GLOBAL_REST_PARAMETERS,
        restModel: address
    }))
}

registerC6Table(
    'address',
    'Address',
    address,
    Address,
    'TABLE',
);

export default Address;
