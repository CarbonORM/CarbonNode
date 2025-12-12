import {C6C} from "../../C6Constants";
import {OrmGenerics} from "../../types/ormGenerics";
import { PaginationBuilder } from '../builders/PaginationBuilder';
import {SqlBuilderResult} from "../utils/sqlUtils";
import {SelectQueryBuilder} from "./SelectQueryBuilder";

export class UpdateQueryBuilder<G extends OrmGenerics> extends PaginationBuilder<G>{
    protected createSelectBuilder(request: any) {
        return new SelectQueryBuilder(this.config as any, request, this.useNamedParams);
    }

    private trimTablePrefix(table: string, column: string): string {
        if (!column.includes('.')) return column;
        const [prefix, col] = column.split('.', 2);
        if (prefix !== table) {
            throw new Error(`Invalid prefixed column: '${column}'. Expected prefix '${table}.'`);
        }
        return col;
    }

    build(
        table: string,
    ): SqlBuilderResult {
        this.aliasMap = {};
        const args = this.request;
        const params = this.useNamedParams ? {} : [];
        this.initAlias(table, args.JOIN);
        let sql = `UPDATE \`${table}\``;

        if (args.JOIN) {
            sql += this.buildJoinClauses(args.JOIN, params);
        }

        if (!(C6C.UPDATE in this.request)) {
            throw new Error("No update data provided in the request.");
        }

        const setClauses = Object.entries(this.request[C6C.UPDATE])
            .map(([col, val]) => {
                const trimmed = this.trimTablePrefix(table, col);
                const qualified = `${table}.${trimmed}`;
                this.assertValidIdentifier(qualified, 'UPDATE SET');
                const rightSql = this.serializeUpdateValue(val, params, qualified);
                return `\`${trimmed}\` = ${rightSql}`;
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
