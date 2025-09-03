import {C6Constants} from "../../C6Constants";
import {OrmGenerics} from "../../types/ormGenerics";
import {JoinBuilder} from "./JoinBuilder";

export abstract class PaginationBuilder<G extends OrmGenerics> extends JoinBuilder<G> {

    /**
     * MySQL ORDER/LIMIT/OFFSET generator.
     *
     * Accepted structures:
     * ```ts
     * ORDER: {
     *   // simple column with direction
     *   [property_units.UNIT_ID]: "DESC",
     *	 // function call (array of arguments)
     *   [C6Constants.ST_DISTANCE_SPHERE]: [property_units.LOCATION, F(property_units.LOCATION, "pu_target")]
     * }
     * ```
     */
    buildPaginationClause(pagination: any): string {
        let sql = "";

        /* -------- ORDER BY -------- */
        if (pagination?.[C6Constants.ORDER]) {
            const orderParts: string[] = [];

            for (const [key, val] of Object.entries(pagination[C6Constants.ORDER])) {
                // FUNCTION CALL: val is an array of args
                if (Array.isArray(val)) {
                    const args = val
                        .map((arg) => Array.isArray(arg) ? this.buildAggregateField(arg) : String(arg))
                        .join(", ");
                    orderParts.push(`${key}(${args})`);
                }
                // SIMPLE COLUMN + DIR (ASC/DESC)
                else {
                    orderParts.push(`${key} ${String(val).toUpperCase()}`);
                }
            }

            if (orderParts.length) sql += ` ORDER BY ${orderParts.join(", ")}`;
        }

        /* -------- LIMIT / OFFSET -------- */
        if (pagination?.[C6Constants.LIMIT] != null) {
            const lim = parseInt(pagination[C6Constants.LIMIT], 10);
            const pageRaw = pagination[C6Constants.PAGE];
            const pageParsed = parseInt(pageRaw ?? 1, 10);
            const page = isFinite(pageParsed) && pageParsed > 1 ? pageParsed : 1;
            if (page === 1) {
                sql += ` LIMIT ${lim}`;
            } else {
                const offset = (page - 1) * lim;
                sql += ` LIMIT ${offset}, ${lim}`;
            }
        }

        this.config.verbose && console.log(`[PAGINATION] ${sql.trim()}`);
        return sql;
    }
}
