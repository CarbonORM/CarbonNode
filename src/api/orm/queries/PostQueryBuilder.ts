import {C6C} from "@carbonorm/carbonnode";
import {ConditionBuilder} from "../builders/ConditionBuilder";
import {OrmGenerics} from "../../types/ormGenerics";

export class PostQueryBuilder<G extends OrmGenerics> extends ConditionBuilder<G>{

    build(table: string) {
        const verb = C6C.REPLACE in this.request ? C6C.REPLACE : C6C.INSERT;
        const keys = Object.keys(verb in this.request ? this.request[verb] : this.request);
        const params: any[] = []
        const placeholders: string[] = []
        for (const key of keys) {
            const value = this.request[key];
            const placeholder = this.addParam(params, key, value);
            placeholders.push(placeholder);
        }

        let sql = `${verb} INTO \`${table}\` (${keys.map(k => `\`${k}\``).join(', ')})
VALUES (${placeholders.join(', ')})`;

        if (C6C.UPDATE in this.request) {
            const updateData = this.request[C6C.UPDATE];
            const updateClause = updateData.map(k => `\`${k}\` = VALUES(\`${k}\`)`).join(', ');
            sql += ` ON DUPLICATE KEY UPDATE ${updateClause}`;
        }

        return {sql, params};
    }
}
