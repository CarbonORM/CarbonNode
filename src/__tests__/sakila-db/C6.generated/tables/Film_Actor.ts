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

export const Film_Actor = {
    ...film_actor,
    ...restOrm<
        OrmGenerics<any, 'film_actor', iFilm_Actor, Film_ActorPrimaryKeys>
    >(() => ({
        ...GLOBAL_REST_PARAMETERS,
        restModel: film_actor
    }))
}

registerC6Table(
    'film_actor',
    'Film_Actor',
    film_actor,
    Film_Actor,
);

export default Film_Actor;
