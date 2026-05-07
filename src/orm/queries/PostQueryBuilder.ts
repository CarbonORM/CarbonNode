import {C6C} from "../../constants/C6Constants";
import {ConditionBuilder} from "../builders/ConditionBuilder";
import {OrmGenerics} from "../../types/ormGenerics";

export class PostQueryBuilder<G extends OrmGenerics> extends ConditionBuilder<G>{

    private readonly REQUEST_METADATA_KEYS = new Set<string>([
        C6C.DB,
        C6C.SELECT,
        C6C.UPDATE,
        C6C.DELETE,
        C6C.WHERE,
        C6C.JOIN,
        C6C.ORDER,
        C6C.GROUP_BY,
        C6C.HAVING,
        C6C.INDEX_HINTS,
        C6C.PAGINATION,
        C6C.INSERT,
        C6C.REPLACE,
        "dataInsertMultipleRows",
        "cacheResults",
        "skipReactBootstrap",
        "fetchDependencies",
        "debug",
        "success",
        "error",
    ]);

    private isRequestMetadataKey(key: string): boolean {
        return this.REQUEST_METADATA_KEYS.has(key);
    }

    private trimTablePrefix(table: string, column: string): string {
        if (!column.includes('.')) return column;
        const [prefix, col] = column.split('.', 2);
        if (prefix !== table) {
            throw new Error(`Invalid prefixed column: '${column}'. Expected prefix '${table}.'`);
        }
        return col;
    }

    build(table: string) {
        this.aliasMap = {};
        const verb = C6C.REPLACE in this.request ? C6C.REPLACE : C6C.INSERT;
        const directRows = Array.isArray(this.request)
            ? this.request
            : [];
        const rows: Record<string, any>[] = directRows.length > 0
            ? directRows
            : Array.isArray(this.request.dataInsertMultipleRows) &&
            this.request.dataInsertMultipleRows.length > 0
                ? this.request.dataInsertMultipleRows
                : [verb in this.request ? this.request[verb] : this.request];
        const keys = Object.keys(rows[0] ?? {}).filter((key) => !this.isRequestMetadataKey(key));
        if (keys.length === 0) {
            throw new Error("No insertable columns were found in POST request payload.");
        }
        const params: any[] | Record<string, any> = this.useNamedParams ? {} : [];
        const rowPlaceholders: string[] = [];

        for (const row of rows) {
            const placeholders: string[] = [];

            for (const key of keys) {
                const value = row[key] ?? null;
                const trimmed = this.trimTablePrefix(table, key);
                const qualified = `${table}.${trimmed}`;
                const placeholder = this.serializeUpdateValue(value, params, qualified);
                placeholders.push(placeholder);
            }

            rowPlaceholders.push(`(${placeholders.join(', ')})`);
        }

        let sql = `${verb} INTO \`${table}\` (
            ${keys.map(k => `\`${this.trimTablePrefix(table, k)}\``).join(', ')}
         ) VALUES
            ${rowPlaceholders.join(',\n            ')}`;

        if (C6C.UPDATE in this.request) {
            const updateData = this.request[C6C.UPDATE];

            if (!Array.isArray(updateData)) {
                throw new Error(`Update data must be an array of keys to update, got: ${JSON.stringify(updateData)}`);
            }

            const updateClause = updateData.map(k => `\`${k}\` = VALUES(\`${k}\`)`).join(', ');
            sql += ` ON DUPLICATE KEY UPDATE ${updateClause}`;
        }

        return {sql, params};
    }
}
