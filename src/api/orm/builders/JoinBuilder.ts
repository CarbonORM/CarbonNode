import {OrmGenerics} from "../../types/ormGenerics";
import {ConditionBuilder} from "./ConditionBuilder";
import {C6C} from "../../C6Constants";
import {resolveDerivedTable, isDerivedTableKey} from "../queryHelpers";

export abstract class JoinBuilder<G extends OrmGenerics> extends ConditionBuilder<G>{

    protected createSelectBuilder(
        _request: any
    ): { build(table: string, isSubSelect: boolean): { sql: string; params: any[] | Record<string, any> } } {
        throw new Error('Subclasses must implement createSelectBuilder to support derived table serialization.');
    }

    buildJoinClauses(joinArgs: any, params: any[] | Record<string, any>): string {
        let sql = '';

        for (const joinType in joinArgs) {
            const joinKind = joinType.replace('_', ' ').toUpperCase();
            const entries: Array<[any, any]> = [];
            const joinSection = joinArgs[joinType];

            if (joinSection instanceof Map) {
                joinSection.forEach((value, key) => {
                    entries.push([key, value]);
                });
            } else {
                for (const raw in joinSection) {
                    entries.push([raw, joinSection[raw]]);
                }
            }

            for (const [rawKey, conditions] of entries) {
                const raw = typeof rawKey === 'string' ? rawKey : String(rawKey);
                const [table, aliasCandidate] = raw.trim().split(/\s+/, 2);
                if (!table) continue;

                if (isDerivedTableKey(table)) {
                    const derived = resolveDerivedTable(table);
                    if (!derived) {
                        throw new Error(`Derived table '${table}' was not registered. Wrap the object with derivedTable(...) before using it in JOIN.`);
                    }

                    const configuredAliasRaw = derived[C6C.AS];
                    const configuredAlias = typeof configuredAliasRaw === 'string' ? configuredAliasRaw.trim() : '';
                    const alias = (aliasCandidate ?? configuredAlias).trim();

                    if (!alias) {
                        throw new Error('Derived tables require an alias via C6C.AS.');
                    }

                    this.registerAlias(alias, table);

                    const subRequest = derived[C6C.SUBSELECT];
                    if (!subRequest || typeof subRequest !== 'object') {
                        throw new Error('Derived tables must include a C6C.SUBSELECT payload.');
                    }

                    const fromTable = subRequest[C6C.FROM];
                    if (typeof fromTable !== 'string' || fromTable.trim() === '') {
                        throw new Error('Derived table subselects require a base table defined with C6C.FROM.');
                    }

                    const subBuilder = this.createSelectBuilder(subRequest as any);
                    const { sql: subSql, params: subParams } = subBuilder.build(fromTable, true);
                    const normalizedSql = this.integrateSubSelectParams(subSql, subParams, params);

                    const formatted = normalizedSql.trim().split('\n').map(line => `  ${line}`).join('\n');
                    const joinSql = `(\n${formatted}\n) AS \`${alias}\``;
                    const onClause = this.buildBooleanJoinedConditions(conditions, true, params);
                    sql += ` ${joinKind} JOIN ${joinSql}`;
                    if (onClause) {
                        sql += ` ON ${onClause}`;
                    }
                } else {
                    const alias = aliasCandidate;
                    if (alias) {
                        this.registerAlias(alias, table);
                    }
                    const joinSql = alias ? `\`${table}\` AS \`${alias}\`` : `\`${table}\``;
                    const onClause = this.buildBooleanJoinedConditions(conditions, true, params);
                    sql += ` ${joinKind} JOIN ${joinSql}`;
                    if (onClause) {
                        sql += ` ON ${onClause}`;
                    }
                }
            }
        }

        this.config.verbose && console.log(`[JOIN] ${sql.trim()}`);

        return sql;
    }

    protected integrateSubSelectParams(
        subSql: string,
        subParams: any[] | Record<string, any>,
        target: any[] | Record<string, any>
    ): string {
        if (!subParams) return subSql;

        if (this.useNamedParams) {
            let normalized = subSql;
            const extras = subParams as Record<string, any>;
            for (const key of Object.keys(extras)) {
                const placeholder = this.addParam(target, '', extras[key]);
                const original = `:${key}`;
                if (original !== placeholder) {
                    normalized = normalized.split(original).join(placeholder);
                }
            }
            return normalized;
        }

        (target as any[]).push(...(subParams as any[]));
        return subSql;
    }

    protected buildScalarSubSelect(
        subRequest: any,
        params: any[] | Record<string, any>
    ): string {
        if (!subRequest || typeof subRequest !== 'object') {
            throw new Error('Scalar subselect requires a C6C.SUBSELECT object payload.');
        }

        const fromTable = subRequest[C6C.FROM];
        if (typeof fromTable !== 'string' || fromTable.trim() === '') {
            throw new Error('Scalar subselects require a base table specified with C6C.FROM.');
        }

        const subBuilder = this.createSelectBuilder(subRequest as any);
        const { sql: subSql, params: subParams } = subBuilder.build(fromTable, true);
        const normalized = this.integrateSubSelectParams(subSql, subParams, params).trim();
        return `(${normalized})`;
    }
}
