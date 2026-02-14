import {C6Constants} from "../../constants/C6Constants";
import {OrmGenerics} from "../../types/ormGenerics";
import {JoinBuilder} from "./JoinBuilder";
import {getLogContext, LogLevel, logWithLevel} from "../../utils/logLevel";

export abstract class PaginationBuilder<G extends OrmGenerics> extends JoinBuilder<G> {

    /**
     * MySQL ORDER/LIMIT/OFFSET generator.
     *
     * Accepted structures:
     * ```ts
     * ORDER: [
     *   [property_units.UNIT_ID, "DESC"],
     *   [[C6Constants.ST_DISTANCE_SPHERE, property_units.LOCATION, F(property_units.LOCATION, "pu_target")], "ASC"],
     * ]
     * ```
     */
    buildPaginationClause(pagination: any, params?: any[] | Record<string, any>): string {
        let sql = "";

        /* -------- ORDER BY -------- */
        if (pagination?.[C6Constants.ORDER]) {
            const orderParts: string[] = [];

            const orderSpec = pagination[C6Constants.ORDER];
            if (!Array.isArray(orderSpec)) {
                throw new Error('PAGINATION.ORDER expects an array of terms using [expression, direction?] syntax.');
            }

            for (const rawTerm of orderSpec) {
                let expression = rawTerm;
                let direction: string = C6Constants.ASC;

                if (
                    Array.isArray(rawTerm)
                    && rawTerm.length === 2
                    && typeof rawTerm[1] === 'string'
                    && (String(rawTerm[1]).toUpperCase() === C6Constants.ASC || String(rawTerm[1]).toUpperCase() === C6Constants.DESC)
                ) {
                    expression = rawTerm[0];
                    direction = String(rawTerm[1]).toUpperCase();
                }

                const serialized = this.serializeExpression(expression, params, 'ORDER BY expression');
                orderParts.push(`${serialized.sql} ${direction}`);
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

        logWithLevel(
            LogLevel.DEBUG,
            getLogContext(this.config, this.request),
            console.log,
            `[PAGINATION] ${sql.trim()}`,
        );
        return sql;
    }
}
