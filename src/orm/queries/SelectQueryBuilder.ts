import {OrmGenerics} from "../../types/ormGenerics";
import {PaginationBuilder} from "../builders/PaginationBuilder";
import {SqlBuilderResult} from "../utils/sqlUtils";

export class SelectQueryBuilder<G extends OrmGenerics> extends PaginationBuilder<G>{

    protected createSelectBuilder(request: any) {
        return new SelectQueryBuilder(this.config as any, request, this.useNamedParams);
    }

    build(
        table: string,
        isSubSelect: boolean = false
    ): SqlBuilderResult {
        this.aliasMap = {};
        // reset any previously collected SELECT aliases (from AggregateBuilder)
        // @ts-ignore
        if (this.selectAliases && this.selectAliases.clear) this.selectAliases.clear();
        this.resetIndexHints();
        const args = this.request;
        this.initAlias(table, args.JOIN);
        const params = this.useNamedParams ? {} : [];
        const selectList = args.SELECT ?? ['*'];
        const selectFields = selectList
            .map((f: any) => this.buildAggregateField(f, params))
            .join(', ');

        let sql = `SELECT ${selectFields} FROM \`${table}\``;
        const baseIndexHint = this.getIndexHintClause(table);
        if (baseIndexHint) {
            sql += ` ${baseIndexHint}`;
        }

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
            sql += this.buildPaginationClause(args.PAGINATION, params);
        } else if (!isSubSelect) {
            sql += ` LIMIT 100`;
        }

        return { sql, params };
    }
}
