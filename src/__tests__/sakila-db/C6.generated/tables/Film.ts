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
) ENGINE=InnoDB AUTO_INCREMENT=1110 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
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
    > & Record<string, any> & {
        RELATION_TYPE: 'TABLE';
        READ_ONLY: false;
    } = {
    TABLE_NAME: 'film',
    RELATION_TYPE: 'TABLE',
    READ_ONLY: false,
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

export const Film = {
    ...film,
    ...restOrm<
        OrmGenerics<any, 'film', iFilm, FilmPrimaryKeys>
    >(() => ({
        ...GLOBAL_REST_PARAMETERS,
        restModel: film
    }))
}

registerC6Table(
    'film',
    'Film',
    film,
    Film,
    'TABLE',
);

export default Film;
