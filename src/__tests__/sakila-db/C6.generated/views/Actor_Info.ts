// noinspection JSUnusedGlobalSymbols,SpellCheckingInspection

import { restRequest } from "@carbonorm/carbonnode";
import {
    GLOBAL_REST_PARAMETERS,
    registerC6Table,
} from "../core";

/**
CREATE VIEW `actor_info` AS select `a`.`actor_id` AS `actor_id`,`a`.`first_name` AS `first_name`,`a`.`last_name` AS `last_name`,group_concat(distinct concat(`c`.`name`,': ',(select group_concat(`f`.`title` order by `f`.`title` ASC separator ', ') from ((`film` `f` join `film_category` `fc` on((`f`.`film_id` = `fc`.`film_id`))) join `film_actor` `fa` on((`f`.`film_id` = `fa`.`film_id`))) where ((`fc`.`category_id` = `c`.`category_id`) and (`fa`.`actor_id` = `a`.`actor_id`)))) order by `c`.`name` ASC separator '; ') AS `film_info` from (((`actor` `a` left join `film_actor` `fa` on((`a`.`actor_id` = `fa`.`actor_id`))) left join `film_category` `fc` on((`fa`.`film_id` = `fc`.`film_id`))) left join `category` `c` on((`fc`.`category_id` = `c`.`category_id`))) group by `a`.`actor_id`,`a`.`first_name`,`a`.`last_name`;
**/

export interface iActor_Info {
    'actor_id'?: number;
    'first_name'?: string;
    'last_name'?: string;
    'film_info'?: string | null;
}

export type Actor_InfoPrimaryKeys = never;

const actor_info: Record<string, any> & {
        TABLE_NAME: 'actor_info';
        RELATION_TYPE: 'VIEW';
        READ_ONLY: true;
    } = {
    TABLE_NAME: 'actor_info',
    RELATION_TYPE: 'VIEW',
    READ_ONLY: true,
    ACTOR_ID: 'actor_info.actor_id',
    FIRST_NAME: 'actor_info.first_name',
    LAST_NAME: 'actor_info.last_name',
    FILM_INFO: 'actor_info.film_info',
    PRIMARY: [],
    PRIMARY_SHORT: [],
    COLUMNS: {
        'actor_info.actor_id': 'actor_id',
        'actor_info.first_name': 'first_name',
        'actor_info.last_name': 'last_name',
        'actor_info.film_info': 'film_info',
    },
    TYPE_VALIDATION: {
        'actor_info.actor_id': {
            MYSQL_TYPE: 'smallint',
            MAX_LENGTH: '',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: true
        },
        'actor_info.first_name': {
            MYSQL_TYPE: 'varchar',
            MAX_LENGTH: '45',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: true
        },
        'actor_info.last_name': {
            MYSQL_TYPE: 'varchar',
            MAX_LENGTH: '45',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: true
        },
        'actor_info.film_info': {
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

export const Actor_Info = {
    ...actor_info,
    Get: (restRequest as any)(() => ({
        ...GLOBAL_REST_PARAMETERS,
        restModel: actor_info as any,
        requestMethod: 'GET',
    }))
}

registerC6Table(
    'actor_info',
    'Actor_Info',
    actor_info,
    Actor_Info,
    'VIEW',
);

export default Actor_Info;
