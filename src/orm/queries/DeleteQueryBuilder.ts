import { OrmGenerics } from "../../types/ormGenerics";
import { SqlBuilderResult } from "../utils/sqlUtils";
import { JoinBuilder } from "../builders/JoinBuilder";
import { SelectQueryBuilder } from "./SelectQueryBuilder";
import { isDerivedTableKey } from "../queryHelpers";

export class DeleteQueryBuilder<G extends OrmGenerics> extends JoinBuilder<G> {
    protected createSelectBuilder(request: any) {
        return new SelectQueryBuilder(this.config as any, request, this.useNamedParams);
    }

    private buildPostgresDeleteWithUsing(table: string, params: any[] | Record<string, any>): string {
        let sql = this.sqlDialect.deleteFrom(table, Boolean(this.request.JOIN));
        const usingParts: string[] = [];
        const conditionParts: string[] = [];

        if (this.request.JOIN) {
            const joinTypeEntries: Array<[string, any]> = this.request.JOIN instanceof Map
                ? Array.from(this.request.JOIN.entries() as Iterable<[unknown, any]>).map(([key, value]) => [String(key), value])
                : Object.keys(this.request.JOIN).map(key => [key, (this.request.JOIN as Record<string, any>)[key]]);

            for (const [joinTypeRaw, joinSection] of joinTypeEntries) {
                const joinKind = joinTypeRaw.replace('_', ' ').toUpperCase();
                if (joinKind !== 'INNER') {
                    throw new Error(`PostgreSQL DELETE USING currently supports INNER joins only, got '${joinKind}'.`);
                }

                const entries: Array<[any, any]> = joinSection instanceof Map
                    ? Array.from(joinSection.entries())
                    : Object.keys(joinSection).map(raw => [raw, joinSection[raw]]);

                for (const [rawKey, conditions] of entries) {
                    const raw = typeof rawKey === 'string' ? rawKey : String(rawKey);
                    const [joinTable, aliasCandidate] = raw.trim().split(/\s+/, 2);
                    if (!joinTable) continue;
                    if (isDerivedTableKey(joinTable)) {
                        throw new Error("PostgreSQL DELETE USING does not support derived table joins yet. Use a WHERE subselect.");
                    }

                    usingParts.push(this.sqlDialect.formatJoinedTable(joinTable, aliasCandidate));
                    const onClause = this.buildBooleanJoinedConditions(conditions, true, params);
                    if (onClause) {
                        conditionParts.push(onClause);
                    }
                }
            }
        }

        if (usingParts.length > 0) {
            sql += ` USING ${usingParts.join(', ')}`;
        }

        if (this.request.WHERE) {
            const whereClause = this.buildBooleanJoinedConditions(this.request.WHERE, true, params);
            if (whereClause) {
                conditionParts.push(whereClause);
            }
        }

        if (conditionParts.length > 0) {
            sql += ` WHERE ${conditionParts.join(' AND ')}`;
        }

        return sql;
    }

    build(
        table: string
    ): SqlBuilderResult {
        this.aliasMap = {};
        const params = this.useNamedParams ? {} : [];
        this.initAlias(table, this.request.JOIN);

        if (this.sqlDialect.name === "postgresql") {
            return {
                sql: this.buildPostgresDeleteWithUsing(table, params),
                params,
            };
        }

        let sql = this.sqlDialect.deleteFrom(table, Boolean(this.request.JOIN));

        if (this.request.JOIN) {
            sql += this.buildJoinClauses(this.request.JOIN, params);
        }

        if (this.request.WHERE) {
            sql += this.buildWhereClause(this.request.WHERE, params);
        }

        return { sql, params };
    }
}
