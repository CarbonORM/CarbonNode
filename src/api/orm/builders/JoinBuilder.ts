import {OrmGenerics} from "../../types/ormGenerics";
import {ConditionBuilder} from "./ConditionBuilder";

export abstract class JoinBuilder<G extends OrmGenerics> extends ConditionBuilder<G>{

    buildJoinClauses(joinArgs: any, params: any[] | Record<string, any>): string {
        let sql = '';

        for (const joinType in joinArgs) {
            const joinKind = joinType.replace('_', ' ').toUpperCase();

            for (const raw in joinArgs[joinType]) {
                const [table, alias] = raw.split(' ');
                if (alias) {
                    this.aliasMappings[alias] = table;
                }
                const onClause = this.buildBooleanJoinedConditions(joinArgs[joinType][raw], true, params);
                const joinSql = alias ? `\`${table}\` AS \`${alias}\`` : `\`${table}\``;
                sql += ` ${joinKind} JOIN ${joinSql} ON ${onClause}`;
            }
        }

        this.config.verbose && console.log(`[JOIN] ${sql.trim()}`);

        return sql;
    }
}
