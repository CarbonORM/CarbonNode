import {OrmGenerics} from "../../types/ormGenerics";
import {PaginationBuilder} from "../builders/PaginationBuilder";
import {SqlBuilderResult} from "../utils/sqlUtils";

export class DeleteQueryBuilder<G extends OrmGenerics>
    extends PaginationBuilder<G> {

    build(table: string, args: any = {}): SqlBuilderResult {
        const params = this.useNamedParams ? {} : [];
        let sql = args.JOIN ? `DELETE ${table}
                               FROM \`${table}\`` : `DELETE
                                                     FROM \`${table}\``;

        if (args.JOIN) {
            sql += this.buildJoinClauses(args.JOIN, params);
        }

        if (args.WHERE) {
            sql += this.buildWhereClause(args.WHERE, params);
        }

        if (args.PAGINATION) {
            sql += this.buildPaginationClause(args.PAGINATION);
        }

        return {sql, params};
    }
}
