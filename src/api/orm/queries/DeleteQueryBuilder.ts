import { OrmGenerics } from "../../types/ormGenerics";
import { SqlBuilderResult } from "../utils/sqlUtils";
import { JoinBuilder } from "../builders/JoinBuilder";

export class DeleteQueryBuilder<G extends OrmGenerics> extends JoinBuilder<G> {
    build(
        table: string,
        args: {
            JOIN?: any;
            WHERE?: any;
        }
    ): SqlBuilderResult {
        const params = this.useNamedParams ? {} : [];

        let sql = `DELETE \`${table}\` FROM \`${table}\``;

        if (args.JOIN) {
            sql += this.buildJoinClauses(args.JOIN, params);
        }

        if (args.WHERE) {
            sql += this.buildWhereClause(args.WHERE, params);
        }

        return { sql, params };
    }
}
