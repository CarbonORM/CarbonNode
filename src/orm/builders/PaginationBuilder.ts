import {C6Constants} from "../../constants/C6Constants";
import {OrmGenerics} from "../../types/ormGenerics";
import {JoinBuilder} from "./JoinBuilder";
import {getLogContext, LogLevel, logWithLevel} from "../../utils/logLevel";
import {safePagination} from '../../utils/querySafety';

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
        const {LIMIT: lim, PAGE: page} = safePagination(pagination, this.config);
        sql += this.sqlDialect.pagination(lim, page);

        logWithLevel(
            LogLevel.DEBUG,
            getLogContext(this.config, this.request),
            console.log,
            `[PAGINATION] ${sql.trim()}`,
        );
        return sql;
    }
}
