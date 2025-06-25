import {C6Constants} from "api/C6Constants";
import isVerbose from "../../../variables/isVerbose";
import {OrmGenerics} from "../../types/ormGenerics";
import {JoinBuilder} from "./JoinBuilder";

export class PaginationBuilder<G extends OrmGenerics> extends JoinBuilder<G> {

    buildPaginationClause(pagination: any): string {
        let sql = '';

        if (pagination?.[C6Constants.ORDER]) {
            const orderParts = Object.entries(pagination[C6Constants.ORDER])
                .map(([col, dir]) => `${Array.isArray(col) ? this.buildAggregateField(col) : col} ${String(dir).toUpperCase()}`);
            sql += ` ORDER BY ${orderParts.join(', ')}`;
        }

        if (pagination?.[C6Constants.LIMIT] != null) {
            const lim = parseInt(pagination[C6Constants.LIMIT], 10);
            const page = parseInt(pagination[C6Constants.PAGE] ?? 1, 10);
            const offset = (page - 1) * lim;
            sql += ` LIMIT ${offset}, ${lim}`;
        }

        isVerbose() && console.log(`[PAGINATION] ${sql.trim()}`);

        return sql;
    }
}
