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
CREATE TABLE `actor` (
  `actor_id` smallint unsigned NOT NULL AUTO_INCREMENT,
  `first_name` varchar(45) NOT NULL,
  `last_name` varchar(45) NOT NULL,
  `last_update` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`actor_id`),
  KEY `idx_actor_last_name` (`last_name`)
) ENGINE=InnoDB AUTO_INCREMENT=960 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
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
    > & Record<string, any> & {
        RELATION_TYPE: 'TABLE';
        READ_ONLY: false;
    } = {
    TABLE_NAME: 'actor',
    RELATION_TYPE: 'TABLE',
    READ_ONLY: false,
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

export const Actor = {
    ...actor,
    ...restOrm<
        OrmGenerics<any, 'actor', iActor, ActorPrimaryKeys>
    >(() => ({
        ...GLOBAL_REST_PARAMETERS,
        restModel: actor
    }))
}

registerC6Table(
    'actor',
    'Actor',
    actor,
    Actor,
    'TABLE',
);

export default Actor;
