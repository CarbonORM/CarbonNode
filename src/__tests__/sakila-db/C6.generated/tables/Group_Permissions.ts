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
CREATE TABLE `group_permissions` (
  `group_id` binary(16) NOT NULL,
  `permission_id` binary(16) NOT NULL,
  `effect` enum('ALLOW','DENY') NOT NULL,
  `created_by` binary(16) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`group_id`,`permission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
**/

export interface iGroup_Permissions {
    'group_id'?: Buffer | string;
    'permission_id'?: Buffer | string;
    'effect'?: 'ALLOW' | 'DENY';
    'created_by'?: Buffer | string;
    'created_at'?: Date | number | string;
}

export type Group_PermissionsPrimaryKeys =
        'group_id' |
            'permission_id'
    ;

export type PK_group_permissions = {
    'group_id': Buffer;
    'permission_id': Buffer;
};
export type Group_PermissionsPK_shape = PK_group_permissions;

export const group_permissions:
    C6RestfulModel<
        'group_permissions',
        iGroup_Permissions,
        Group_PermissionsPrimaryKeys
    > & Record<string, any> & {
        RELATION_TYPE: 'TABLE';
        READ_ONLY: false;
        PRIMARY: readonly ['group_permissions.group_id', 'group_permissions.permission_id'];
        PRIMARY_SHORT: readonly ['group_id', 'permission_id'];
    } = {
    TABLE_NAME: 'group_permissions',
    RELATION_TYPE: 'TABLE',
    READ_ONLY: false,
    GROUP_ID: 'group_permissions.group_id',
    PERMISSION_ID: 'group_permissions.permission_id',
    EFFECT: 'group_permissions.effect',
    CREATED_BY: 'group_permissions.created_by',
    CREATED_AT: 'group_permissions.created_at',
    PRIMARY: [
        'group_permissions.group_id',
        'group_permissions.permission_id',
    ] as const,
    PRIMARY_SHORT: [
        'group_id',
        'permission_id',
    ] as const,
    COLUMNS: {
        'group_permissions.group_id': 'group_id',
        'group_permissions.permission_id': 'permission_id',
        'group_permissions.effect': 'effect',
        'group_permissions.created_by': 'created_by',
        'group_permissions.created_at': 'created_at',
    },
    TYPE_VALIDATION: {
        'group_permissions.group_id': {
            MYSQL_TYPE: 'binary',
            MAX_LENGTH: '16',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'group_permissions.permission_id': {
            MYSQL_TYPE: 'binary',
            MAX_LENGTH: '16',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'group_permissions.effect': {
            MYSQL_TYPE: 'enum',
            MAX_LENGTH: '\'ALLOW\',\'DENY\'',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'group_permissions.created_by': {
            MYSQL_TYPE: 'binary',
            MAX_LENGTH: '16',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'group_permissions.created_at': {
            MYSQL_TYPE: 'timestamp',
            MAX_LENGTH: '',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
    },
    REGEX_VALIDATION: {
    },
    TRIGGERS: [
    ],
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

export const Group_Permissions = {
    ...group_permissions,
    ...restOrm<
        OrmGenerics<any, 'group_permissions', iGroup_Permissions, Group_PermissionsPrimaryKeys>
    >(() => ({
        ...GLOBAL_REST_PARAMETERS,
        restModel: group_permissions
    }))
}

registerC6Table(
    'group_permissions',
    'Group_Permissions',
    group_permissions,
    Group_Permissions,
    'TABLE',
);

export default Group_Permissions;
