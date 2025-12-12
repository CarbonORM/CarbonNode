import {C6C} from "../../C6Constants";
import {ConditionBuilder} from "../builders/ConditionBuilder";
import {OrmGenerics} from "../../types/ormGenerics";

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
        const body = verb in this.request ? this.request[verb] : this.request;
        const keys = Object.keys(body);
        const params: any[] | Record<string, any> = this.useNamedParams ? {} : [];
        const placeholders: string[] = []


        for (const key of keys) {
            const value = body[key];
            const trimmed = this.trimTablePrefix(table, key);
            const qualified = `${table}.${trimmed}`;
            const placeholder = this.serializeUpdateValue(value, params, qualified);
            placeholders.push(placeholder);
        }

        let sql = `${verb} INTO \`${table}\` (
            ${keys.map(k => `\`${this.trimTablePrefix(table, k)}\``).join(', ')}
         ) VALUES (
            ${placeholders.join(', ')}
        )`;

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
