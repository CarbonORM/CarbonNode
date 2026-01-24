import {C6Constants} from "../../constants/C6Constants";
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
    buildPaginationClause(pagination: any, params?: any[] | Record<string, any>): string {
        let sql = "";

        /* -------- ORDER BY -------- */
        if (pagination?.[C6Constants.ORDER]) {
            const orderParts: string[] = [];

            for (const [key, val] of Object.entries(pagination[C6Constants.ORDER])) {
                if (typeof key === 'string' && key.includes('.')) {
                    this.assertValidIdentifier(key, 'ORDER BY');
                }
                // FUNCTION CALL: val is an array of args
                if (Array.isArray(val)) {
                    const identifierPathRegex = /^[A-Za-z_][A-Za-z0-9_]*\.[A-Za-z_][A-Za-z0-9_]*$/;
                    const isNumericString = (s: string) => /^-?\d+(?:\.\d+)?$/.test(s.trim());
                    const args = val
                        .map((arg) => {
                            if (Array.isArray(arg)) return this.buildAggregateField(arg, params);
                            if (typeof arg === 'string') {
                                if (identifierPathRegex.test(arg)) {
                                    this.assertValidIdentifier(arg, 'ORDER BY argument');
                                    return arg;
                                }
                                // numeric-looking strings should be treated as literals
                                if (isNumericString(arg)) return arg;
                                return arg;
                            }
                            return String(arg);
                        })
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
