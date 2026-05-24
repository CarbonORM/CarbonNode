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
CREATE TABLE `language` (
  `language_id` tinyint unsigned NOT NULL AUTO_INCREMENT,
  `name` char(20) NOT NULL,
  `last_update` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`language_id`)
) ENGINE=InnoDB AUTO_INCREMENT=117 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
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
    > & Record<string, any> & {
        RELATION_TYPE: 'TABLE';
        READ_ONLY: false;
    } = {
    TABLE_NAME: 'language',
    RELATION_TYPE: 'TABLE',
    READ_ONLY: false,
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

export const Language = {
    ...language,
    ...restOrm<
        OrmGenerics<any, 'language', iLanguage, LanguagePrimaryKeys>
    >(() => ({
        ...GLOBAL_REST_PARAMETERS,
        restModel: language
    }))
}

registerC6Table(
    'language',
    'Language',
    language,
    Language,
    'TABLE',
);

export default Language;
