import {OrmGenerics} from "../../types/ormGenerics";
import { PaginationBuilder } from '../builders/PaginationBuilder';
import {SqlBuilderResult} from "../utils/sqlUtils";

export class UpdateQueryBuilder<G extends OrmGenerics> extends PaginationBuilder<G>{

    build(
        table: string,
        data: Record<string, any>,
        args: any = {}
    ): SqlBuilderResult {
        const params = this.useNamedParams ? {} : [];
        let sql = `UPDATE \`${table}\``;

        if (args.JOIN) {
            sql += this.buildJoinClauses(args.JOIN, params);
        }

        const setClauses = Object.entries(data).map(([col, val]) => {
            if (Array.isArray(params)) {
                params.push(val);
                return `\`${col}\` = ?`;
            } else {
                const key = `param${Object.keys(params).length}`;
                params[key] = val;
                return `\`${col}\` = :${key}`;
            }
        });

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
