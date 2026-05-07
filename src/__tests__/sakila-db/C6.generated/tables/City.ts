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
CREATE TABLE `city` (
  `city_id` smallint unsigned NOT NULL AUTO_INCREMENT,
  `city` varchar(50) NOT NULL,
  `country_id` smallint unsigned NOT NULL,
  `last_update` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`city_id`),
  KEY `idx_fk_country_id` (`country_id`),
  CONSTRAINT `fk_city_country` FOREIGN KEY (`country_id`) REFERENCES `country` (`country_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=693 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
**/

export interface iCity {
    'city_id'?: number;
    'city'?: string;
    'country_id'?: number;
    'last_update'?: Date | number | string;
}

export type CityPrimaryKeys = 
        'city_id'
    ;

const city:
    C6RestfulModel<
        'city',
        iCity,
        CityPrimaryKeys
    > = {
    TABLE_NAME: 'city',
    CITY_ID: 'city.city_id',
    CITY: 'city.city',
    COUNTRY_ID: 'city.country_id',
    LAST_UPDATE: 'city.last_update',
    PRIMARY: [
        'city.city_id',
    ],
    PRIMARY_SHORT: [
        'city_id',
    ],
    COLUMNS: {
        'city.city_id': 'city_id',
        'city.city': 'city',
        'city.country_id': 'country_id',
        'city.last_update': 'last_update',
    },
    TYPE_VALIDATION: {
        'city.city_id': {
            MYSQL_TYPE: 'smallint',
            MAX_LENGTH: '',
            AUTO_INCREMENT: true,
            SKIP_COLUMN_IN_POST: false
        },
        'city.city': {
            MYSQL_TYPE: 'varchar',
            MAX_LENGTH: '50',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'city.country_id': {
            MYSQL_TYPE: 'smallint',
            MAX_LENGTH: '',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'city.last_update': {
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
        'country_id': [{
            TABLE: 'country',
            COLUMN: 'country_id',
            CONSTRAINT: 'fk_city_country',
        },],
    },
    TABLE_REFERENCED_BY: {
        'city_id': [{
            TABLE: 'address',
            COLUMN: 'city_id',
            CONSTRAINT: 'fk_address_city',
        },],
    }
}

export const City = {
    ...city,
    ...restOrm<
        OrmGenerics<any, 'city', iCity, CityPrimaryKeys>
    >(() => ({
        ...GLOBAL_REST_PARAMETERS,
        restModel: city
    }))
}

registerC6Table(
    'city',
    'City',
    city,
    City,
);

export default City;
