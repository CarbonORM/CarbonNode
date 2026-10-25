// noinspection JSUnusedGlobalSymbols,SpellCheckingInspection

import { restRequest } from "@carbonorm/carbonnode";
import {
    GLOBAL_REST_PARAMETERS,
    registerC6Table,
} from "../core";

/**
CREATE VIEW `film_list` AS select `film`.`film_id` AS `FID`,`film`.`title` AS `title`,`film`.`description` AS `description`,`category`.`name` AS `category`,`film`.`rental_rate` AS `price`,`film`.`length` AS `length`,`film`.`rating` AS `rating`,group_concat(concat(`actor`.`first_name`,_utf8mb4' ',`actor`.`last_name`) separator ', ') AS `actors` from ((((`film` left join `film_category` on((`film_category`.`film_id` = `film`.`film_id`))) left join `category` on((`category`.`category_id` = `film_category`.`category_id`))) left join `film_actor` on((`film`.`film_id` = `film_actor`.`film_id`))) left join `actor` on((`film_actor`.`actor_id` = `actor`.`actor_id`))) group by `film`.`film_id`,`category`.`name`;
**/

export interface iFilm_List {
    'FID'?: number;
    'title'?: string;
    'description'?: string | null;
    'category'?: string | null;
    'price'?: number;
    'length'?: number | null;
    'rating'?: 'G' | 'PG' | 'PG-13' | 'R' | 'NC-17' | null;
    'actors'?: string | null;
}

export type Film_ListPrimaryKeys = never;

const film_list: Record<string, any> & {
        TABLE_NAME: 'film_list';
        RELATION_TYPE: 'VIEW';
        READ_ONLY: true;
    } = {
    TABLE_NAME: 'film_list',
    RELATION_TYPE: 'VIEW',
    READ_ONLY: true,
    FID: 'film_list.FID',
    TITLE: 'film_list.title',
    DESCRIPTION: 'film_list.description',
    CATEGORY: 'film_list.category',
    PRICE: 'film_list.price',
    LENGTH: 'film_list.length',
    RATING: 'film_list.rating',
    ACTORS: 'film_list.actors',
    PRIMARY: [],
    PRIMARY_SHORT: [],
    COLUMNS: {
        'film_list.FID': 'FID',
        'film_list.title': 'title',
        'film_list.description': 'description',
        'film_list.category': 'category',
        'film_list.price': 'price',
        'film_list.length': 'length',
        'film_list.rating': 'rating',
        'film_list.actors': 'actors',
    },
    TYPE_VALIDATION: {
        'film_list.FID': {
            MYSQL_TYPE: 'smallint',
            MAX_LENGTH: '',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: true
        },
        'film_list.title': {
            MYSQL_TYPE: 'varchar',
            MAX_LENGTH: '128',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: true
        },
        'film_list.description': {
            MYSQL_TYPE: 'text',
            MAX_LENGTH: '',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: true
        },
        'film_list.category': {
            MYSQL_TYPE: 'varchar',
            MAX_LENGTH: '25',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: true
        },
        'film_list.price': {
            MYSQL_TYPE: 'decimal',
            MAX_LENGTH: '4,2',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: true
        },
        'film_list.length': {
            MYSQL_TYPE: 'smallint',
            MAX_LENGTH: '',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: true
        },
        'film_list.rating': {
            MYSQL_TYPE: 'enum',
            MAX_LENGTH: '&#x27;G&#x27;,&#x27;PG&#x27;,&#x27;PG-13&#x27;,&#x27;R&#x27;,&#x27;NC-17&#x27;',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: true
        },
        'film_list.actors': {
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
    TABLE_REFERENCES: {},
    TABLE_REFERENCED_BY: {}
}

export const Film_List = {
    ...film_list,
    Get: (restRequest as any)(() => ({
        ...GLOBAL_REST_PARAMETERS,
        restModel: film_list as any,
        requestMethod: 'GET',
    }))
}

registerC6Table(
    'film_list',
    'Film_List',
    film_list,
    Film_List,
    'VIEW',
);

export default Film_List;
