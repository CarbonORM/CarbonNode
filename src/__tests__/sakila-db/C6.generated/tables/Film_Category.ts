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

export const Film_Category = {
    ...film_category,
    ...restOrm<
        OrmGenerics<any, 'film_category', iFilm_Category, Film_CategoryPrimaryKeys>
    >(() => ({
        ...GLOBAL_REST_PARAMETERS,
        restModel: film_category
    }))
}

registerC6Table(
    'film_category',
    'Film_Category',
    film_category,
    Film_Category,
);

export default Film_Category;
