import {C6C} from "../../constants/C6Constants";
import {ConditionBuilder} from "../builders/ConditionBuilder";
import {OrmGenerics} from "../../types/ormGenerics";
import logSql from "../../utils/logSql";
import {getLogContext} from "../../utils/logLevel";

export class PostQueryBuilder<G extends OrmGenerics> extends ConditionBuilder<G>{

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
        const rows: Record<string, any>[] = Array.isArray(this.request.dataInsertMultipleRows) &&
        this.request.dataInsertMultipleRows.length > 0
            ? this.request.dataInsertMultipleRows
            : [verb in this.request ? this.request[verb] : this.request];
        const keys = Object.keys(rows[0] ?? {});
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
         ) VALUES (
            ${rowPlaceholders.join(',\n            ')}
        )`;

        if (C6C.UPDATE in this.request) {
            const updateData = this.request[C6C.UPDATE];

            if (!Array.isArray(updateData)) {
                throw new Error(`Update data must be an array of keys to update, got: ${JSON.stringify(updateData)}`);
            }

            const updateClause = updateData.map(k => `\`${k}\` = VALUES(\`${k}\`)`).join(', ');
            sql += ` ON DUPLICATE KEY UPDATE ${updateClause}`;
        }

        logSql(verb, sql, getLogContext(this.config, this.request));

        return {sql, params};
    }
}
