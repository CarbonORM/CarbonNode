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

export const Film_Text = {
    ...film_text,
    ...restOrm<
        OrmGenerics<any, 'film_text', iFilm_Text, Film_TextPrimaryKeys>
    >(() => ({
        ...GLOBAL_REST_PARAMETERS,
        restModel: film_text
    }))
}

registerC6Table(
    'film_text',
    'Film_Text',
    film_text,
    Film_Text,
);

export default Film_Text;
