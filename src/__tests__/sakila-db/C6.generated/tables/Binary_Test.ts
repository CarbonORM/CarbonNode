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
CREATE TABLE `binary_test` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bin_col` binary(16) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
**/

export interface iBinary_Test {
    'id'?: number;
    'bin_col'?: Buffer | string | null;
}

export type Binary_TestPrimaryKeys = 
        'id'
    ;

const binary_test:
    C6RestfulModel<
        'binary_test',
        iBinary_Test,
        Binary_TestPrimaryKeys
    > = {
    TABLE_NAME: 'binary_test',
    ID: 'binary_test.id',
    BIN_COL: 'binary_test.bin_col',
    PRIMARY: [
        'binary_test.id',
    ],
    PRIMARY_SHORT: [
        'id',
    ],
    COLUMNS: {
        'binary_test.id': 'id',
        'binary_test.bin_col': 'bin_col',
    },
    TYPE_VALIDATION: {
        'binary_test.id': {
            MYSQL_TYPE: 'int',
            MAX_LENGTH: '',
            AUTO_INCREMENT: true,
            SKIP_COLUMN_IN_POST: false
        },
        'binary_test.bin_col': {
            MYSQL_TYPE: 'binary',
            MAX_LENGTH: '16',
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
        
    }
}

export const Binary_Test = {
    ...binary_test,
    ...restOrm<
        OrmGenerics<any, 'binary_test', iBinary_Test, Binary_TestPrimaryKeys>
    >(() => ({
        ...GLOBAL_REST_PARAMETERS,
        restModel: binary_test
    }))
}

registerC6Table(
    'binary_test',
    'Binary_Test',
    binary_test,
    Binary_Test,
);

export default Binary_Test;
