import {OrmGenerics} from "../../types/ormGenerics";
import {PaginationBuilder} from "../builders/PaginationBuilder";
import {SqlBuilderResult} from "../utils/sqlUtils";

export class SelectQueryBuilder<G extends OrmGenerics> extends PaginationBuilder<G>{

    build(
        table: string,
        isSubSelect: boolean = false
    ): SqlBuilderResult {
        this.aliasMap = {};
        const args = this.request;
        this.initAlias(table, args.JOIN);
        const params = this.useNamedParams ? {} : [];
        const selectList = args.SELECT ?? ['*'];
        const selectFields = selectList
            .map((f: any) => this.buildAggregateField(f))
            .join(', ');

        let sql = `SELECT ${selectFields} FROM \`${table}\``;

        if (args.JOIN) {
            sql += this.buildJoinClauses(args.JOIN, params);
        }

        if (args.WHERE) {
            sql += this.buildWhereClause(args.WHERE, params);
        }

        if (args.GROUP_BY) {
            const groupBy = Array.isArray(args.GROUP_BY)
                ? args.GROUP_BY.join(', ')
                : args.GROUP_BY;
            sql += ` GROUP BY ${groupBy}`;
        }

        if (args.HAVING) {
            sql += ` HAVING ${this.buildBooleanJoinedConditions(args.HAVING, true, params)}`;
        }

        if (args.PAGINATION) {
            sql += this.buildPaginationClause(args.PAGINATION);
        } else if (!isSubSelect) {
            sql += ` LIMIT 100`;
        }

        console.log(`[SELECT] ${sql.trim()}`);

        return { sql, params };
    }
}
