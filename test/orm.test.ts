import { describe, expect, test } from '@jest/globals';
import { ConditionBuilder } from '../src/api/orm/builders/ConditionBuilder';
import { JoinBuilder } from '../src/api/orm/builders/JoinBuilder';
import { PaginationBuilder } from '../src/api/orm/builders/PaginationBuilder';
import { SelectQueryBuilder } from '../src/api/orm/queries/SelectQueryBuilder';
import { DeleteQueryBuilder } from '../src/api/orm/queries/DeleteQueryBuilder';

type DummyConfig = any;

const dummyConfig: DummyConfig = {
    C6: {},
    restModel: {
        LIFECYCLE_HOOKS: {},
        PRIMARY: [],
        PRIMARY_SHORT: [],
        COLUMNS: {},
        TYPE_VALIDATION: {},
        REGEX_VALIDATION: {},
        TABLE_REFERENCES: {},
        TABLE_REFERENCED_BY: {},
        TABLE_NAME: ''
    },
    requestMethod: 'GET'
};

const dummyRequest: any = {};

function buildConditionBuilder() {
    return new ConditionBuilder(dummyConfig, dummyRequest, false);
}

function buildJoinBuilder() {
    return new JoinBuilder(dummyConfig, dummyRequest, false);
}

function buildPaginationBuilder() {
    return new PaginationBuilder(dummyConfig, dummyRequest, false);
}

function buildSelectBuilder() {
    return new SelectQueryBuilder(dummyConfig, dummyRequest, false);
}

function buildDeleteBuilder() {
    return new DeleteQueryBuilder(dummyConfig, dummyRequest, false);
}


describe('ORM Builder utilities', () => {
    test('ConditionBuilder generates AND conditions', () => {
        const builder = buildConditionBuilder();
        const params: any[] = [];
        const clause = builder.buildBooleanJoinedConditions(
            {
                'foo.id': 5,
                'bar.name': { LIKE: 'bob' }
            },
            true,
            params
        );
        expect(clause).toBe('(( foo.id = ? ) AND ( bar.name LIKE ? ))');
        expect(params).toEqual([5, 'bob']);
    });

    test('JoinBuilder constructs join clause', () => {
        const builder = buildJoinBuilder();
        const params: any[] = [];
        const sql = builder.buildJoinClauses(
            {
                inner: {
                    'users u': {
                        'u.id': { '=': 1 }
                    }
                }
            },
            params
        );
        expect(sql).toBe(' INNER JOIN `users` AS `u` ON (( u.id = ? ))');
        expect(params).toEqual([1]);
    });

    test('PaginationBuilder handles order and limit', () => {
        const builder = buildPaginationBuilder();
        const sql = builder.buildPaginationClause({
            ORDER: { name: 'DESC' },
            LIMIT: 10,
            PAGE: 2
        });
        expect(sql).toBe(' ORDER BY name DESC LIMIT 10, 10');
    });

    test('SelectQueryBuilder builds basic select', () => {
        const builder = buildSelectBuilder();
        const { sql, params } = builder.build(
            'users',
            {
                SELECT: ['id', 'name'],
                WHERE: { id: 5 },
                PAGINATION: { LIMIT: 5, PAGE: 1 }
            },
            'id'
        );
        expect(sql).toBe('SELECT id, name FROM `users` WHERE ( id = ? ) LIMIT 0, 5');
        expect(params).toEqual([5]);
    });

    test('DeleteQueryBuilder builds delete statement', () => {
        const builder = buildDeleteBuilder();
        const { sql, params } = builder.build('users', {
            WHERE: { id: 5 }
        });
        expect(sql).toBe('DELETE FROM `users` WHERE ( id = ? )');
        expect(params).toEqual([5]);
    });
});
