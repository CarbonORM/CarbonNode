import {C6C} from "../../C6Constants";
import {OrmGenerics} from "../../types/ormGenerics";
import { PaginationBuilder } from '../builders/PaginationBuilder';
import {SqlBuilderResult} from "../utils/sqlUtils";

export class UpdateQueryBuilder<G extends OrmGenerics> extends PaginationBuilder<G>{

    build(
        table: string,
    ): SqlBuilderResult {
        this.aliasMappings = {};
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

        const setClauses = Object.entries(this.request[C6C.UPDATE]).map(([col, val]) => this.addParam(params, col, val));

        sql += ` SET ${setClauses.join(', ')}`;

        if (args.WHERE) {
            sql += this.buildWhereClause(args.WHERE, params);
        }

        if (args.PAGINATION) {
            sql += this.buildPaginationClause(args.PAGINATION);
        }

        return { sql, params };
    }
}
