import {C6C} from "../../constants/C6Constants";
import {OrmGenerics} from "../../types/ormGenerics";
import { PaginationBuilder } from '../builders/PaginationBuilder';
import {SqlBuilderResult} from "../utils/sqlUtils";
import {SelectQueryBuilder} from "./SelectQueryBuilder";

import {normalizePrimaryKeyRequest} from '../../utils/primaryKeys';

export class UpdateQueryBuilder<G extends OrmGenerics> extends PaginationBuilder<G>{
    protected createSelectBuilder(request: any) {
        return new SelectQueryBuilder(this.config as any, request, this.useNamedParams);
    }


    build(
        table: string,
    ): SqlBuilderResult {
        this.request = normalizePrimaryKeyRequest('PATCH', this.request, this.config.C6.TABLES[table] ?? this.config.restModel);
        if (!this.request.WHERE && this.config.allowUnfilteredWrites !== true) {
            throw new Error('UPDATE/DELETE requires WHERE; use trusted allowUnfilteredWrites for intentional bulk writes.');
        }
        this.aliasMap = {};
        const args = this.request;
        const params = this.useNamedParams ? {} : [];
        this.initAlias(table, args.JOIN);
        let sql = this.sqlDialect.updateTable(table);

        if (args.JOIN) {
            sql += this.buildJoinClauses(args.JOIN, params);
        }

        if (!(C6C.UPDATE in this.request)) {
            throw new Error("No update data provided in the request.");
        }

        const setClauses = Object.entries(this.request[C6C.UPDATE])
            .map(([col, val]) => {
                const trimmed = this.normalizeWritableColumn(table, col, 'UPDATE SET');
                const qualified = `${table}.${trimmed}`;
                this.assertValidIdentifier(qualified, 'UPDATE SET');
                const rightSql = this.serializeUpdateValue(val, params, qualified);
                return `${this.sqlDialect.assignmentColumn(trimmed)} = ${rightSql}`;
            });

        sql += ` SET ${setClauses.join(', ')}`;

        if (args.WHERE) {
            sql += this.buildWhereClause(args.WHERE, params);
        }

        if (args.PAGINATION) {
            sql += this.buildPaginationClause(args.PAGINATION, params);
        }

        return { sql, params };
    }
}
