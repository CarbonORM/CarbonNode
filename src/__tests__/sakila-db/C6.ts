// noinspection JSUnusedGlobalSymbols,SpellCheckingInspection

import {
    C6Constants,
    C6RestfulModel,
    iC6Object,
    iDynamicApiImport,
    iRest,
    OrmGenerics,
    removePrefixIfExists,
    restOrm,
} from "@carbonorm/carbonnode";
import type * as GeoJSON from "geojson";

export const RestTablePrefix = '';

export type RestTableNames = 'actor'
 | 'address'
 | 'binary_test'
 | 'category'
 | 'city'
 | 'country'
 | 'customer'
 | 'film'
 | 'film_actor'
 | 'film_category'
 | 'film_text'
 | 'inventory'
 | 'language'
 | 'payment'
 | 'rental'
 | 'staff'
 | 'store';

export type RestShortTableNames = 'actor'
 | 'address'
 | 'binary_test'
 | 'category'
 | 'city'
 | 'country'
 | 'customer'
 | 'film'
 | 'film_actor'
 | 'film_category'
 | 'film_text'
 | 'inventory'
 | 'language'
 | 'payment'
 | 'rental'
 | 'staff'
 | 'store';


/**
CREATE TABLE `actor` (
  `actor_id` smallint unsigned NOT NULL AUTO_INCREMENT,
  `first_name` varchar(45) NOT NULL,
  `last_name` varchar(45) NOT NULL,
  `last_update` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`actor_id`),
  KEY `idx_actor_last_name` (`last_name`)
) ENGINE=InnoDB AUTO_INCREMENT=435 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
**/

export interface iActor {
    'actor_id'?: number;
    'first_name'?: string;
    'last_name'?: string;
    'last_update'?: Date | number | string;
}

export type ActorPrimaryKeys = 
        'actor_id'
    ;

const actor:
    C6RestfulModel<
        'actor',
        iActor,
        ActorPrimaryKeys
    > = {
    TABLE_NAME: 'actor',
    ACTOR_ID: 'actor.actor_id',
    FIRST_NAME: 'actor.first_name',
    LAST_NAME: 'actor.last_name',
    LAST_UPDATE: 'actor.last_update',
    PRIMARY: [
        'actor.actor_id',
    ],
    PRIMARY_SHORT: [
        'actor_id',
    ],
    COLUMNS: {
        'actor.actor_id': 'actor_id',
        'actor.first_name': 'first_name',
        'actor.last_name': 'last_name',
        'actor.last_update': 'last_update',
    },
    TYPE_VALIDATION: {
        'actor.actor_id': {
            MYSQL_TYPE: 'smallint',
            MAX_LENGTH: '',
            AUTO_INCREMENT: true,
            SKIP_COLUMN_IN_POST: false
        },
        'actor.first_name': {
            MYSQL_TYPE: 'varchar',
            MAX_LENGTH: '45',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'actor.last_name': {
            MYSQL_TYPE: 'varchar',
            MAX_LENGTH: '45',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'actor.last_update': {
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
        'actor_id': [{
            TABLE: 'film_actor',
            COLUMN: 'actor_id',
            CONSTRAINT: 'fk_film_actor_actor',
        },],
    }
}

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
) ENGINE=InnoDB AUTO_INCREMENT=630 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
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
    > = {
    TABLE_NAME: 'address',
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

/**
CREATE TABLE `binary_test` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bin_col` binary(16) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
**/

export interface iBinary_Test {
    'id'?: number;
    'bin_col'?: Buffer | string | null;
}

export type Binary_TestPrimaryKeys = 
        'id'
    ;

const binary_test:
    C6RestfulModel<
        'binary_test',
        iBinary_Test,
        Binary_TestPrimaryKeys
    > = {
    TABLE_NAME: 'binary_test',
    ID: 'binary_test.id',
    BIN_COL: 'binary_test.bin_col',
    PRIMARY: [
        'binary_test.id',
    ],
    PRIMARY_SHORT: [
        'id',
    ],
    COLUMNS: {
        'binary_test.id': 'id',
        'binary_test.bin_col': 'bin_col',
    },
    TYPE_VALIDATION: {
        'binary_test.id': {
            MYSQL_TYPE: 'int',
            MAX_LENGTH: '',
            AUTO_INCREMENT: true,
            SKIP_COLUMN_IN_POST: false
        },
        'binary_test.bin_col': {
            MYSQL_TYPE: 'binary',
            MAX_LENGTH: '16',
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
        
    }
}

/**
CREATE TABLE `category` (
  `category_id` tinyint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(25) NOT NULL,
  `last_update` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`category_id`)
) ENGINE=InnoDB AUTO_INCREMENT=43 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
**/

export interface iCategory {
    'category_id'?: number;
    'name'?: string;
    'last_update'?: Date | number | string;
}

export type CategoryPrimaryKeys = 
        'category_id'
    ;

const category:
    C6RestfulModel<
        'category',
        iCategory,
        CategoryPrimaryKeys
    > = {
    TABLE_NAME: 'category',
    CATEGORY_ID: 'category.category_id',
    NAME: 'category.name',
    LAST_UPDATE: 'category.last_update',
    PRIMARY: [
        'category.category_id',
    ],
    PRIMARY_SHORT: [
        'category_id',
    ],
    COLUMNS: {
        'category.category_id': 'category_id',
        'category.name': 'name',
        'category.last_update': 'last_update',
    },
    TYPE_VALIDATION: {
        'category.category_id': {
            MYSQL_TYPE: 'tinyint',
            MAX_LENGTH: '',
            AUTO_INCREMENT: true,
            SKIP_COLUMN_IN_POST: false
        },
        'category.name': {
            MYSQL_TYPE: 'varchar',
            MAX_LENGTH: '25',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'category.last_update': {
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
        'category_id': [{
            TABLE: 'film_category',
            COLUMN: 'category_id',
            CONSTRAINT: 'fk_film_category_category',
        },],
    }
}

/**
CREATE TABLE `city` (
  `city_id` smallint unsigned NOT NULL AUTO_INCREMENT,
  `city` varchar(50) NOT NULL,
  `country_id` smallint unsigned NOT NULL,
  `last_update` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`city_id`),
  KEY `idx_fk_country_id` (`country_id`),
  CONSTRAINT `fk_city_country` FOREIGN KEY (`country_id`) REFERENCES `country` (`country_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=627 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
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

/**
CREATE TABLE `country` (
  `country_id` smallint unsigned NOT NULL AUTO_INCREMENT,
  `country` varchar(50) NOT NULL,
  `last_update` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`country_id`)
) ENGINE=InnoDB AUTO_INCREMENT=136 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
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
    > = {
    TABLE_NAME: 'country',
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
) ENGINE=InnoDB AUTO_INCREMENT=626 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
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
    > = {
    TABLE_NAME: 'customer',
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

/**
CREATE TABLE `film` (
  `film_id` smallint unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(128) NOT NULL,
  `description` text,
  `release_year` year DEFAULT NULL,
  `language_id` tinyint unsigned NOT NULL,
  `original_language_id` tinyint unsigned DEFAULT NULL,
  `rental_duration` tinyint unsigned NOT NULL DEFAULT '3',
  `rental_rate` decimal(4,2) NOT NULL DEFAULT '4.99',
  `length` smallint unsigned DEFAULT NULL,
  `replacement_cost` decimal(5,2) NOT NULL DEFAULT '19.99',
  `rating` enum('G','PG','PG-13','R','NC-17') DEFAULT 'G',
  `special_features` set('Trailers','Commentaries','Deleted Scenes','Behind the Scenes') DEFAULT NULL,
  `last_update` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`film_id`),
  KEY `idx_title` (`title`),
  KEY `idx_fk_language_id` (`language_id`),
  KEY `idx_fk_original_language_id` (`original_language_id`),
  CONSTRAINT `fk_film_language` FOREIGN KEY (`language_id`) REFERENCES `language` (`language_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_film_language_original` FOREIGN KEY (`original_language_id`) REFERENCES `language` (`language_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1026 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
**/

export interface iFilm {
    'film_id'?: number;
    'title'?: string;
    'description'?: string | null;
    'release_year'?: Date | number | string | null;
    'language_id'?: number;
    'original_language_id'?: number | null;
    'rental_duration'?: number;
    'rental_rate'?: number;
    'length'?: number | null;
    'replacement_cost'?: number;
    'rating'?: 'G' | 'PG' | 'PG-13' | 'R' | 'NC-17' | null;
    'special_features'?: string | null;
    'last_update'?: Date | number | string;
}

export type FilmPrimaryKeys = 
        'film_id'
    ;

const film:
    C6RestfulModel<
        'film',
        iFilm,
        FilmPrimaryKeys
    > = {
    TABLE_NAME: 'film',
    FILM_ID: 'film.film_id',
    TITLE: 'film.title',
    DESCRIPTION: 'film.description',
    RELEASE_YEAR: 'film.release_year',
    LANGUAGE_ID: 'film.language_id',
    ORIGINAL_LANGUAGE_ID: 'film.original_language_id',
    RENTAL_DURATION: 'film.rental_duration',
    RENTAL_RATE: 'film.rental_rate',
    LENGTH: 'film.length',
    REPLACEMENT_COST: 'film.replacement_cost',
    RATING: 'film.rating',
    SPECIAL_FEATURES: 'film.special_features',
    LAST_UPDATE: 'film.last_update',
    PRIMARY: [
        'film.film_id',
    ],
    PRIMARY_SHORT: [
        'film_id',
    ],
    COLUMNS: {
        'film.film_id': 'film_id',
        'film.title': 'title',
        'film.description': 'description',
        'film.release_year': 'release_year',
        'film.language_id': 'language_id',
        'film.original_language_id': 'original_language_id',
        'film.rental_duration': 'rental_duration',
        'film.rental_rate': 'rental_rate',
        'film.length': 'length',
        'film.replacement_cost': 'replacement_cost',
        'film.rating': 'rating',
        'film.special_features': 'special_features',
        'film.last_update': 'last_update',
    },
    TYPE_VALIDATION: {
        'film.film_id': {
            MYSQL_TYPE: 'smallint',
            MAX_LENGTH: '',
            AUTO_INCREMENT: true,
            SKIP_COLUMN_IN_POST: false
        },
        'film.title': {
            MYSQL_TYPE: 'varchar',
            MAX_LENGTH: '128',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'film.description': {
            MYSQL_TYPE: 'text',
            MAX_LENGTH: '',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: true
        },
        'film.release_year': {
            MYSQL_TYPE: 'year',
            MAX_LENGTH: '',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'film.language_id': {
            MYSQL_TYPE: 'tinyint',
            MAX_LENGTH: '',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'film.original_language_id': {
            MYSQL_TYPE: 'tinyint',
            MAX_LENGTH: '',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'film.rental_duration': {
            MYSQL_TYPE: 'tinyint',
            MAX_LENGTH: '',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'film.rental_rate': {
            MYSQL_TYPE: 'decimal',
            MAX_LENGTH: '4,2',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'film.length': {
            MYSQL_TYPE: 'smallint',
            MAX_LENGTH: '',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'film.replacement_cost': {
            MYSQL_TYPE: 'decimal',
            MAX_LENGTH: '5,2',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'film.rating': {
            MYSQL_TYPE: 'enum',
            MAX_LENGTH: '&#x27;G&#x27;,&#x27;PG&#x27;,&#x27;PG-13&#x27;,&#x27;R&#x27;,&#x27;NC-17&#x27;',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'film.special_features': {
            MYSQL_TYPE: 'set',
            MAX_LENGTH: '&#x27;Trailers&#x27;,&#x27;Commentaries&#x27;,&#x27;Deleted Scenes&#x27;,&#x27;Behind the Scenes&#x27;',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'film.last_update': {
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
        'language_id': [{
            TABLE: 'language',
            COLUMN: 'language_id',
            CONSTRAINT: 'fk_film_language',
        },],'original_language_id': [{
            TABLE: 'language',
            COLUMN: 'language_id',
            CONSTRAINT: 'fk_film_language_original',
        },],
    },
    TABLE_REFERENCED_BY: {
        'film_id': [{
            TABLE: 'film_actor',
            COLUMN: 'film_id',
            CONSTRAINT: 'fk_film_actor_film',
        },{
            TABLE: 'film_category',
            COLUMN: 'film_id',
            CONSTRAINT: 'fk_film_category_film',
        },{
            TABLE: 'inventory',
            COLUMN: 'film_id',
            CONSTRAINT: 'fk_inventory_film',
        },],
    }
}

/**
CREATE TABLE `film_actor` (
  `actor_id` smallint unsigned NOT NULL,
  `film_id` smallint unsigned NOT NULL,
  `last_update` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`actor_id`,`film_id`),
  KEY `idx_fk_film_id` (`film_id`),
  CONSTRAINT `fk_film_actor_actor` FOREIGN KEY (`actor_id`) REFERENCES `actor` (`actor_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_film_actor_film` FOREIGN KEY (`film_id`) REFERENCES `film` (`film_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
**/

export interface iFilm_Actor {
    'actor_id'?: number;
    'film_id'?: number;
    'last_update'?: Date | number | string;
}

export type Film_ActorPrimaryKeys = 
        'actor_id' |
            'film_id'
    ;

const film_actor:
    C6RestfulModel<
        'film_actor',
        iFilm_Actor,
        Film_ActorPrimaryKeys
    > = {
    TABLE_NAME: 'film_actor',
    ACTOR_ID: 'film_actor.actor_id',
    FILM_ID: 'film_actor.film_id',
    LAST_UPDATE: 'film_actor.last_update',
    PRIMARY: [
        'film_actor.actor_id',
        'film_actor.film_id',
    ],
    PRIMARY_SHORT: [
        'actor_id',
        'film_id',
    ],
    COLUMNS: {
        'film_actor.actor_id': 'actor_id',
        'film_actor.film_id': 'film_id',
        'film_actor.last_update': 'last_update',
    },
    TYPE_VALIDATION: {
        'film_actor.actor_id': {
            MYSQL_TYPE: 'smallint',
            MAX_LENGTH: '',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'film_actor.film_id': {
            MYSQL_TYPE: 'smallint',
            MAX_LENGTH: '',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'film_actor.last_update': {
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
        'actor_id': [{
            TABLE: 'actor',
            COLUMN: 'actor_id',
            CONSTRAINT: 'fk_film_actor_actor',
        },],'film_id': [{
            TABLE: 'film',
            COLUMN: 'film_id',
            CONSTRAINT: 'fk_film_actor_film',
        },],
    },
    TABLE_REFERENCED_BY: {
        
    }
}

/**
CREATE TABLE `film_category` (
  `film_id` smallint unsigned NOT NULL,
  `category_id` tinyint unsigned NOT NULL,
  `last_update` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`film_id`,`category_id`),
  KEY `fk_film_category_category` (`category_id`),
  CONSTRAINT `fk_film_category_category` FOREIGN KEY (`category_id`) REFERENCES `category` (`category_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_film_category_film` FOREIGN KEY (`film_id`) REFERENCES `film` (`film_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
**/

export interface iFilm_Category {
    'film_id'?: number;
    'category_id'?: number;
    'last_update'?: Date | number | string;
}

export type Film_CategoryPrimaryKeys = 
        'film_id' |
            'category_id'
    ;

const film_category:
    C6RestfulModel<
        'film_category',
        iFilm_Category,
        Film_CategoryPrimaryKeys
    > = {
    TABLE_NAME: 'film_category',
    FILM_ID: 'film_category.film_id',
    CATEGORY_ID: 'film_category.category_id',
    LAST_UPDATE: 'film_category.last_update',
    PRIMARY: [
        'film_category.film_id',
        'film_category.category_id',
    ],
    PRIMARY_SHORT: [
        'film_id',
        'category_id',
    ],
    COLUMNS: {
        'film_category.film_id': 'film_id',
        'film_category.category_id': 'category_id',
        'film_category.last_update': 'last_update',
    },
    TYPE_VALIDATION: {
        'film_category.film_id': {
            MYSQL_TYPE: 'smallint',
            MAX_LENGTH: '',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'film_category.category_id': {
            MYSQL_TYPE: 'tinyint',
            MAX_LENGTH: '',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'film_category.last_update': {
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
        'category_id': [{
            TABLE: 'category',
            COLUMN: 'category_id',
            CONSTRAINT: 'fk_film_category_category',
        },],'film_id': [{
            TABLE: 'film',
            COLUMN: 'film_id',
            CONSTRAINT: 'fk_film_category_film',
        },],
    },
    TABLE_REFERENCED_BY: {
        
    }
}

/**
CREATE TABLE `film_text` (
  `film_id` smallint unsigned NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  PRIMARY KEY (`film_id`),
  FULLTEXT KEY `idx_title_description` (`title`,`description`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
**/

export interface iFilm_Text {
    'film_id'?: number;
    'title'?: string;
    'description'?: string | null;
}

export type Film_TextPrimaryKeys = 
        'film_id'
    ;

const film_text:
    C6RestfulModel<
        'film_text',
        iFilm_Text,
        Film_TextPrimaryKeys
    > = {
    TABLE_NAME: 'film_text',
    FILM_ID: 'film_text.film_id',
    TITLE: 'film_text.title',
    DESCRIPTION: 'film_text.description',
    PRIMARY: [
        'film_text.film_id',
    ],
    PRIMARY_SHORT: [
        'film_id',
    ],
    COLUMNS: {
        'film_text.film_id': 'film_id',
        'film_text.title': 'title',
        'film_text.description': 'description',
    },
    TYPE_VALIDATION: {
        'film_text.film_id': {
            MYSQL_TYPE: 'smallint',
            MAX_LENGTH: '',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'film_text.title': {
            MYSQL_TYPE: 'varchar',
            MAX_LENGTH: '255',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'film_text.description': {
            MYSQL_TYPE: 'text',
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
    TABLE_REFERENCES: {
        
    },
    TABLE_REFERENCED_BY: {
        
    }
}

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
) ENGINE=InnoDB AUTO_INCREMENT=4608 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
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

/**
CREATE TABLE `language` (
  `language_id` tinyint unsigned NOT NULL AUTO_INCREMENT,
  `name` char(20) NOT NULL,
  `last_update` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`language_id`)
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
**/

export interface iLanguage {
    'language_id'?: number;
    'name'?: string;
    'last_update'?: Date | number | string;
}

export type LanguagePrimaryKeys = 
        'language_id'
    ;

const language:
    C6RestfulModel<
        'language',
        iLanguage,
        LanguagePrimaryKeys
    > = {
    TABLE_NAME: 'language',
    LANGUAGE_ID: 'language.language_id',
    NAME: 'language.name',
    LAST_UPDATE: 'language.last_update',
    PRIMARY: [
        'language.language_id',
    ],
    PRIMARY_SHORT: [
        'language_id',
    ],
    COLUMNS: {
        'language.language_id': 'language_id',
        'language.name': 'name',
        'language.last_update': 'last_update',
    },
    TYPE_VALIDATION: {
        'language.language_id': {
            MYSQL_TYPE: 'tinyint',
            MAX_LENGTH: '',
            AUTO_INCREMENT: true,
            SKIP_COLUMN_IN_POST: false
        },
        'language.name': {
            MYSQL_TYPE: 'char',
            MAX_LENGTH: '20',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'language.last_update': {
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
        'language_id': [{
            TABLE: 'film',
            COLUMN: 'language_id',
            CONSTRAINT: 'fk_film_language',
        },{
            TABLE: 'film',
            COLUMN: 'original_language_id',
            CONSTRAINT: 'fk_film_language_original',
        },],
    }
}

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
) ENGINE=InnoDB AUTO_INCREMENT=16076 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
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
    > = {
    TABLE_NAME: 'payment',
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
) ENGINE=InnoDB AUTO_INCREMENT=16076 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
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
    > = {
    TABLE_NAME: 'rental',
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
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
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
    > = {
    TABLE_NAME: 'staff',
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
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
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

export const TABLES = {
actor,address,binary_test,category,city,country,customer,film,film_actor,film_category,film_text,inventory,language,payment,rental,staff,store,
} satisfies {
    [K in keyof RestTableInterfaces]: C6RestfulModel<K, RestTableInterfaces[K], keyof RestTableInterfaces[K] & string>;
};

export type RestTableInterfaces = iActor
 | iAddress
 | iBinary_Test
 | iCategory
 | iCity
 | iCountry
 | iCustomer
 | iFilm
 | iFilm_Actor
 | iFilm_Category
 | iFilm_Text
 | iInventory
 | iLanguage
 | iPayment
 | iRental
 | iStaff
 | iStore;

export const C6 : iC6Object<RestTableInterfaces> = {
    ...C6Constants,
    C6VERSION: '6.0.8',
    IMPORT: async (tableName: string) : Promise<iDynamicApiImport> => {

        tableName = tableName.toLowerCase();

        // if tableName is not a key in the TABLES object then throw an error
        if (!TABLES[tableName as RestShortTableNames]) {
            const error = (table: string) => {
                throw Error('Table (' + table + ') does not exist in the TABLES object. Possible values include (' + Object.keys(TABLES).join(', ') + ')');
            }
            if (!tableName.startsWith(RestTablePrefix.toLowerCase())) {
                error(tableName);
            }
            tableName = removePrefixIfExists(tableName, RestTablePrefix);
            if (!TABLES[tableName as RestShortTableNames]) {
                error(tableName);
            }
        }
        // This will rightfully throw a dynamic import warning in the console, but it is necessary to use dynamic imports
        const toPascalUnderscore = (name: string) =>
          name
            .split("_")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join("_");

        return import(
          /* @vite-ignore */ `./${toPascalUnderscore(tableName)}.ts`
        );
    },
    PREFIX: RestTablePrefix,
    TABLES: TABLES,
    ORM: {},
    ...TABLES
};

export type tStatefulApiData<T> = T[] | undefined | null;

// this refers to the value types of the keys above, aka values in the state
export interface iRestfulObjectArrayTypes {
    actor: tStatefulApiData<iActor>,
    address: tStatefulApiData<iAddress>,
    binary_test: tStatefulApiData<iBinary_Test>,
    category: tStatefulApiData<iCategory>,
    city: tStatefulApiData<iCity>,
    country: tStatefulApiData<iCountry>,
    customer: tStatefulApiData<iCustomer>,
    film: tStatefulApiData<iFilm>,
    film_actor: tStatefulApiData<iFilm_Actor>,
    film_category: tStatefulApiData<iFilm_Category>,
    film_text: tStatefulApiData<iFilm_Text>,
    inventory: tStatefulApiData<iInventory>,
    language: tStatefulApiData<iLanguage>,
    payment: tStatefulApiData<iPayment>,
    rental: tStatefulApiData<iRental>,
    staff: tStatefulApiData<iStaff>,
    store: tStatefulApiData<iStore>,
}

export type tRestfulObjectArrayValues = iRestfulObjectArrayTypes[keyof iRestfulObjectArrayTypes];

export const initialRestfulObjectsState: iRestfulObjectArrayTypes = {
    actor: undefined,
    address: undefined,
    binary_test: undefined,
    category: undefined,
    city: undefined,
    country: undefined,
    customer: undefined,
    film: undefined,
    film_actor: undefined,
    film_category: undefined,
    film_text: undefined,
    inventory: undefined,
    language: undefined,
    payment: undefined,
    rental: undefined,
    staff: undefined,
    store: undefined,
};

export const COLUMNS = {
    'actor.actor_id': 'actor_id','actor.first_name': 'first_name','actor.last_name': 'last_name','actor.last_update': 'last_update',
'address.address_id': 'address_id','address.address': 'address','address.address2': 'address2','address.district': 'district','address.city_id': 'city_id','address.postal_code': 'postal_code','address.phone': 'phone','address.location': 'location','address.last_update': 'last_update',
'binary_test.id': 'id','binary_test.bin_col': 'bin_col',
'category.category_id': 'category_id','category.name': 'name','category.last_update': 'last_update',
'city.city_id': 'city_id','city.city': 'city','city.country_id': 'country_id','city.last_update': 'last_update',
'country.country_id': 'country_id','country.country': 'country','country.last_update': 'last_update',
'customer.customer_id': 'customer_id','customer.store_id': 'store_id','customer.first_name': 'first_name','customer.last_name': 'last_name','customer.email': 'email','customer.address_id': 'address_id','customer.active': 'active','customer.create_date': 'create_date','customer.last_update': 'last_update',
'film.film_id': 'film_id','film.title': 'title','film.description': 'description','film.release_year': 'release_year','film.language_id': 'language_id','film.original_language_id': 'original_language_id','film.rental_duration': 'rental_duration','film.rental_rate': 'rental_rate','film.length': 'length','film.replacement_cost': 'replacement_cost','film.rating': 'rating','film.special_features': 'special_features','film.last_update': 'last_update',
'film_actor.actor_id': 'actor_id','film_actor.film_id': 'film_id','film_actor.last_update': 'last_update',
'film_category.film_id': 'film_id','film_category.category_id': 'category_id','film_category.last_update': 'last_update',
'film_text.film_id': 'film_id','film_text.title': 'title','film_text.description': 'description',
'inventory.inventory_id': 'inventory_id','inventory.film_id': 'film_id','inventory.store_id': 'store_id','inventory.last_update': 'last_update',
'language.language_id': 'language_id','language.name': 'name','language.last_update': 'last_update',
'payment.payment_id': 'payment_id','payment.customer_id': 'customer_id','payment.staff_id': 'staff_id','payment.rental_id': 'rental_id','payment.amount': 'amount','payment.payment_date': 'payment_date','payment.last_update': 'last_update',
'rental.rental_id': 'rental_id','rental.rental_date': 'rental_date','rental.inventory_id': 'inventory_id','rental.customer_id': 'customer_id','rental.return_date': 'return_date','rental.staff_id': 'staff_id','rental.last_update': 'last_update',
'staff.staff_id': 'staff_id','staff.first_name': 'first_name','staff.last_name': 'last_name','staff.address_id': 'address_id','staff.picture': 'picture','staff.email': 'email','staff.store_id': 'store_id','staff.active': 'active','staff.username': 'username','staff.password': 'password','staff.last_update': 'last_update',
'store.store_id': 'store_id','store.manager_staff_id': 'manager_staff_id','store.address_id': 'address_id','store.last_update': 'last_update',
};

export const GLOBAL_REST_PARAMETERS: Omit<iRest<
    RestShortTableNames,
    RestTableInterfaces>, "requestMethod" | "restModel"> = {
        C6: C6,
        restURL: "/rest/",
};

export const Actor = {
    ...actor,
    ...restOrm<
        OrmGenerics<any, 'actor', iActor, ActorPrimaryKeys>
    >(() => ({
        ...GLOBAL_REST_PARAMETERS,
        restModel: actor
    }))
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

export const Binary_Test = {
    ...binary_test,
    ...restOrm<
        OrmGenerics<any, 'binary_test', iBinary_Test, Binary_TestPrimaryKeys>
    >(() => ({
        ...GLOBAL_REST_PARAMETERS,
        restModel: binary_test
    }))
}

export const Category = {
    ...category,
    ...restOrm<
        OrmGenerics<any, 'category', iCategory, CategoryPrimaryKeys>
    >(() => ({
        ...GLOBAL_REST_PARAMETERS,
        restModel: category
    }))
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

export const Country = {
    ...country,
    ...restOrm<
        OrmGenerics<any, 'country', iCountry, CountryPrimaryKeys>
    >(() => ({
        ...GLOBAL_REST_PARAMETERS,
        restModel: country
    }))
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

export const Film = {
    ...film,
    ...restOrm<
        OrmGenerics<any, 'film', iFilm, FilmPrimaryKeys>
    >(() => ({
        ...GLOBAL_REST_PARAMETERS,
        restModel: film
    }))
}

export const Film_Actor = {
    ...film_actor,
    ...restOrm<
        OrmGenerics<any, 'film_actor', iFilm_Actor, Film_ActorPrimaryKeys>
    >(() => ({
        ...GLOBAL_REST_PARAMETERS,
        restModel: film_actor
    }))
}

export const Film_Category = {
    ...film_category,
    ...restOrm<
        OrmGenerics<any, 'film_category', iFilm_Category, Film_CategoryPrimaryKeys>
    >(() => ({
        ...GLOBAL_REST_PARAMETERS,
        restModel: film_category
    }))
}

export const Film_Text = {
    ...film_text,
    ...restOrm<
        OrmGenerics<any, 'film_text', iFilm_Text, Film_TextPrimaryKeys>
    >(() => ({
        ...GLOBAL_REST_PARAMETERS,
        restModel: film_text
    }))
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

export const Language = {
    ...language,
    ...restOrm<
        OrmGenerics<any, 'language', iLanguage, LanguagePrimaryKeys>
    >(() => ({
        ...GLOBAL_REST_PARAMETERS,
        restModel: language
    }))
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

export const Rental = {
    ...rental,
    ...restOrm<
        OrmGenerics<any, 'rental', iRental, RentalPrimaryKeys>
    >(() => ({
        ...GLOBAL_REST_PARAMETERS,
        restModel: rental
    }))
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

export const Store = {
    ...store,
    ...restOrm<
        OrmGenerics<any, 'store', iStore, StorePrimaryKeys>
    >(() => ({
        ...GLOBAL_REST_PARAMETERS,
        restModel: store
    }))
}

C6.ORM = {
    Actor,    Address,    Binary_Test,    Category,    City,    Country,    Customer,    Film,    Film_Actor,    Film_Category,    Film_Text,    Inventory,    Language,    Payment,    Rental,    Staff,    Store,
};


