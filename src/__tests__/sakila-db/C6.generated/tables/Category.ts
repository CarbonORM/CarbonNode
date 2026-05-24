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
CREATE TABLE `category` (
  `category_id` tinyint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(25) NOT NULL,
  `last_update` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`category_id`)
) ENGINE=InnoDB AUTO_INCREMENT=127 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
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
    > & Record<string, any> & {
        RELATION_TYPE: 'TABLE';
        READ_ONLY: false;
    } = {
    TABLE_NAME: 'category',
    RELATION_TYPE: 'TABLE',
    READ_ONLY: false,
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

export const Category = {
    ...category,
    ...restOrm<
        OrmGenerics<any, 'category', iCategory, CategoryPrimaryKeys>
    >(() => ({
        ...GLOBAL_REST_PARAMETERS,
        restModel: category
    }))
}

registerC6Table(
    'category',
    'Category',
    category,
    Category,
    'TABLE',
);

export default Category;
