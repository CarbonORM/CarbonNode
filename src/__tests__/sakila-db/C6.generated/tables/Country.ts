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
CREATE TABLE `country` (
  `country_id` smallint unsigned NOT NULL AUTO_INCREMENT,
  `country` varchar(50) NOT NULL,
  `last_update` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`country_id`)
) ENGINE=InnoDB AUTO_INCREMENT=220 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
**/

export interface iCountry {
    'country_id'?: number;
    'country'?: string;
    'last_update'?: Date | number | string;
}

export type CountryPrimaryKeys = 
        'country_id'
    ;

const country:
    C6RestfulModel<
        'country',
        iCountry,
        CountryPrimaryKeys
    > & Record<string, any> & {
        RELATION_TYPE: 'TABLE';
        READ_ONLY: false;
    } = {
    TABLE_NAME: 'country',
    RELATION_TYPE: 'TABLE',
    READ_ONLY: false,
    COUNTRY_ID: 'country.country_id',
    COUNTRY: 'country.country',
    LAST_UPDATE: 'country.last_update',
    PRIMARY: [
        'country.country_id',
    ],
    PRIMARY_SHORT: [
        'country_id',
    ],
    COLUMNS: {
        'country.country_id': 'country_id',
        'country.country': 'country',
        'country.last_update': 'last_update',
    },
    TYPE_VALIDATION: {
        'country.country_id': {
            MYSQL_TYPE: 'smallint',
            MAX_LENGTH: '',
            AUTO_INCREMENT: true,
            SKIP_COLUMN_IN_POST: false
        },
        'country.country': {
            MYSQL_TYPE: 'varchar',
            MAX_LENGTH: '50',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'country.last_update': {
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
        
    },
    TABLE_REFERENCED_BY: {
        'country_id': [{
            TABLE: 'city',
            COLUMN: 'country_id',
            CONSTRAINT: 'fk_city_country',
        },],
    }
}

export const Country = {
    ...country,
    ...restOrm<
        OrmGenerics<any, 'country', iCountry, CountryPrimaryKeys>
    >(() => ({
        ...GLOBAL_REST_PARAMETERS,
        restModel: country
    }))
}

registerC6Table(
    'country',
    'Country',
    country,
    Country,
    'TABLE',
);

export default Country;
