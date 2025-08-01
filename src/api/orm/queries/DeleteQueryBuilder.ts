import { OrmGenerics } from "../../types/ormGenerics";
import { SqlBuilderResult } from "../utils/sqlUtils";
import { JoinBuilder } from "../builders/JoinBuilder";

export class DeleteQueryBuilder<G extends OrmGenerics> extends JoinBuilder<G> {
    build(
        table: string
    ): SqlBuilderResult {
        this.aliasMap = {};
        const params = this.useNamedParams ? {} : [];
        this.initAlias(table, this.request.JOIN);

        let sql = `DELETE \`${table}\` FROM \`${table}\``;

        if (this.request.JOIN) {
            sql += this.buildJoinClauses(this.request.JOIN, params);
        }

        if (this.request.WHERE) {
            sql += this.buildWhereClause(this.request.WHERE, params);
        }

        return { sql, params };
    }
}
