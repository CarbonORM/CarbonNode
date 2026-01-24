import {OrmGenerics} from "../../types/ormGenerics";
import {ConditionBuilder} from "./ConditionBuilder";
import {C6C} from "../../constants/C6Constants";
import {resolveDerivedTable, isDerivedTableKey} from "../queryHelpers";

export abstract class JoinBuilder<G extends OrmGenerics> extends ConditionBuilder<G>{

    private indexHintCache?: Map<string, string>;

    protected createSelectBuilder(
        _request: any
    ): { build(table: string, isSubSelect: boolean): { sql: string; params: any[] | Record<string, any> } } {
        throw new Error('Subclasses must implement createSelectBuilder to support derived table serialization.');
    }

    protected resetIndexHints(): void {
        this.indexHintCache = undefined;
    }

    private normalizeIndexHintKey(key: string): string {
        return key
            .replace(/`/g, '')
            .replace(/_/g, ' ')
            .trim()
            .replace(/\s+/g, ' ')
            .toUpperCase();
    }

    private normalizeHintTargetKey(target: string): string {
        return target.replace(/`/g, '').trim();
    }

    private hasIndexHintKeys(obj: Record<string, any>): boolean {
        const keys = Object.keys(obj ?? {});
        if (!keys.length) return false;

        const forceKey = this.normalizeIndexHintKey(C6C.FORCE_INDEX);
        const useKey = this.normalizeIndexHintKey(C6C.USE_INDEX);
        const ignoreKey = this.normalizeIndexHintKey(C6C.IGNORE_INDEX);

        return keys.some(key => {
            const normalized = this.normalizeIndexHintKey(key);
            return normalized === forceKey || normalized === useKey || normalized === ignoreKey;
        });
    }

    private normalizeHintSpec(spec: any): Record<string, any> | undefined {
        if (spec instanceof Map) {
            spec = Object.fromEntries(spec);
        }

        if (Array.isArray(spec) || typeof spec === 'string') {
            return { [C6C.FORCE_INDEX]: spec } as Record<string, any>;
        }

        if (!spec || typeof spec !== 'object') {
            return undefined;
        }

        if (!this.hasIndexHintKeys(spec as Record<string, any>)) {
            return undefined;
        }

        return spec as Record<string, any>;
    }

    private formatIndexHintClause(spec: any): string {
        const normalizedSpec = this.normalizeHintSpec(spec);
        if (!normalizedSpec) return '';

        const clauses: string[] = [];
        const forceKey = this.normalizeIndexHintKey(C6C.FORCE_INDEX);
        const useKey = this.normalizeIndexHintKey(C6C.USE_INDEX);
        const ignoreKey = this.normalizeIndexHintKey(C6C.IGNORE_INDEX);

        const pushClause = (keyword: string, rawValue: any) => {
            const values = Array.isArray(rawValue) ? rawValue : [rawValue];
            const indexes = values
                .map(value => String(value ?? '').trim())
                .filter(Boolean)
                .map(value => `\`${value.replace(/`/g, '``')}\``);
            if (!indexes.length) return;
            clauses.push(`${keyword} (${indexes.join(', ')})`);
        };

        for (const [key, rawValue] of Object.entries(normalizedSpec)) {
            const normalizedKey = this.normalizeIndexHintKey(key);
            if (normalizedKey === forceKey) {
                pushClause('FORCE INDEX', rawValue);
            } else if (normalizedKey === useKey) {
                pushClause('USE INDEX', rawValue);
            } else if (normalizedKey === ignoreKey) {
                pushClause('IGNORE INDEX', rawValue);
            }
        }

        return clauses.join(' ');
    }

    private normalizeIndexHints(raw: any): Map<string, string> | undefined {
        if (raw instanceof Map) {
            raw = Object.fromEntries(raw);
        }

        const cache = new Map<string, string>();

        const addEntry = (target: string, spec: any) => {
            const clause = this.formatIndexHintClause(spec);
            if (!clause) return;
            const normalizedTarget = target === '__base__'
                ? '__base__'
                : this.normalizeHintTargetKey(target);
            cache.set(normalizedTarget, clause);
        };

        if (Array.isArray(raw) || typeof raw === 'string') {
            addEntry('__base__', raw);
        } else if (raw && typeof raw === 'object') {
            if (this.hasIndexHintKeys(raw as Record<string, any>)) {
                addEntry('__base__', raw);
            } else {
                for (const [key, value] of Object.entries(raw as Record<string, any>)) {
                    const normalizedKey = this.normalizeHintTargetKey(key);
                    if (!normalizedKey) continue;
                    addEntry(normalizedKey, value);
                }
            }
        }

        return cache.size ? cache : undefined;
    }

    protected getIndexHintClause(table: string, alias?: string): string {
        if (!this.indexHintCache) {
            const rawHints = (this.request as unknown as Record<string, any> | undefined)?.[C6C.INDEX_HINTS];
            this.indexHintCache = this.normalizeIndexHints(rawHints);
        }

        const hints = this.indexHintCache;
        if (!hints || hints.size === 0) return '';

        const normalizedTable = this.normalizeHintTargetKey(table);
        const normalizedAlias = alias ? this.normalizeHintTargetKey(alias) : undefined;

        const candidates = [
            normalizedAlias,
            normalizedAlias ? `${normalizedTable} ${normalizedAlias}` : undefined,
            normalizedTable,
            '__base__',
        ];

        for (const candidate of candidates) {
            if (!candidate) continue;
            const clause = hints.get(candidate);
            if (clause) return clause;
        }

        return '';
    }

    buildJoinClauses(joinArgs: any, params: any[] | Record<string, any>): string {
        let sql = '';

        const joinTypeEntries: Array<[string, any]> = joinArgs instanceof Map
            ? Array.from(joinArgs.entries()).map(([key, value]) => [String(key), value])
            : Object.keys(joinArgs).map(key => [key, (joinArgs as Record<string, any>)[key]]);

        for (const [joinTypeRaw, joinSection] of joinTypeEntries) {
            const joinKind = joinTypeRaw.replace('_', ' ').toUpperCase();
            const entries: Array<[any, any]> = [];

            if (joinSection instanceof Map) {
                joinSection.forEach((value, key) => {
                    entries.push([key, value]);
                });
            } else {
                Object.keys(joinSection).forEach(raw => {
                    entries.push([raw, joinSection[raw]]);
                });
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
                    const hintClause = this.getIndexHintClause(table, alias);
                    const baseJoinSql = alias ? `\`${table}\` AS \`${alias}\`` : `\`${table}\``;
                    const joinSql = hintClause ? `${baseJoinSql} ${hintClause}` : baseJoinSql;
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
