import {Executor} from "../../executors/Executor";
import {OrmGenerics} from "../../types/ormGenerics";
import {C6C} from "../../C6Constants";

export abstract class AggregateBuilder<G extends OrmGenerics> extends Executor<G>{
    protected selectAliases: Set<string> = new Set<string>();

    // Overridden in ConditionBuilder where alias tracking is available.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected assertValidIdentifier(_identifier: string, _context: string): void {
        // no-op placeholder for subclasses that do not implement alias validation
    }

    buildAggregateField(field: string | any[], params?: any[] | Record<string, any>): string {
        if (typeof field === 'string') {
            this.assertValidIdentifier(field, 'SELECT field');
            return field;
        }

        if (!Array.isArray(field) || field.length === 0) {
            throw new Error('Invalid SELECT field entry');
        }

        // If the array represents a tuple/literal list (e.g., [lng, lat]) rather than a
        // function call like [FN, ...args], serialize the list as a comma-separated
        // literal sequence so parent calls (like ORDER BY FN(<here>)) can embed it.
        const isNumericString = (s: string) => /^-?\d+(?:\.\d+)?$/.test(String(s).trim());
        if (typeof field[0] !== 'string' || isNumericString(field[0])) {
            return field
                .map((arg) => {
                    if (Array.isArray(arg)) return this.buildAggregateField(arg, params);
                    return String(arg);
                })
                .join(', ');
        }

        let [fn, ...args] = field;
        let alias: string | undefined;

        if (args.length >= 2 && String(args[args.length - 2]).toUpperCase() === 'AS') {
            alias = String(args.pop());
            args.pop();
        }

        const F = String(fn).toUpperCase();

        // Parameter placeholder helper: [C6C.PARAM, value]
        if (F === C6C.PARAM) {
            if (!params) {
                throw new Error('PARAM requires parameter tracking.');
            }
            const value = args[0];
            // Use empty column context; ORDER/SELECT literals have no column typing.
            // @ts-ignore addParam is provided by ConditionBuilder in our hierarchy.
            return this.addParam(params, '', value);
        }

        if (F === C6C.SUBSELECT) {
            if (!params) {
                throw new Error('Scalar subselects in SELECT require parameter tracking.');
            }
            const subRequest = args[0];
            const subSql = (this as any).buildScalarSubSelect?.(subRequest, params);
            if (!subSql) {
                throw new Error('Failed to build scalar subselect.');
            }

            let expr = subSql;
            if (alias) {
                this.selectAliases.add(alias);
                expr += ` AS ${alias}`;
            }

            this.config.verbose && console.log(`[SELECT] ${expr}`);

            return expr;
        }

        const identifierPathRegex = /^[A-Za-z_][A-Za-z0-9_]*\.[A-Za-z_][A-Za-z0-9_]*$/;

        const argList = args
            .map(arg => {
                if (Array.isArray(arg)) return this.buildAggregateField(arg, params);
                if (typeof arg === 'string') {
                    if (identifierPathRegex.test(arg)) {
                        this.assertValidIdentifier(arg, 'SELECT expression');
                        return arg;
                    }
                    // Treat numeric-looking strings as literals, not identifier paths
                    if (isNumericString(arg)) return arg;
                    return arg;
                }
                return String(arg);
            })
            .join(', ');

        let expr: string;

        if (F === 'DISTINCT') {
            expr = `DISTINCT ${argList}`;
        } else {
            expr = `${F}(${argList})`;
        }

        if (alias) {
            this.selectAliases.add(alias);
            expr += ` AS ${alias}`;
        }

        this.config.verbose && console.log(`[SELECT] ${expr}`);

        return expr;
    }
}
