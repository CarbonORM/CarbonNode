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

        let [fn, ...args] = field;
        let alias: string | undefined;

        if (args.length >= 2 && String(args[args.length - 2]).toUpperCase() === 'AS') {
            alias = String(args.pop());
            args.pop();
        }

        const F = String(fn).toUpperCase();

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

        const argList = args
            .map(arg => {
                if (Array.isArray(arg)) return this.buildAggregateField(arg, params);
                if (typeof arg === 'string') {
                    this.assertValidIdentifier(arg, 'SELECT expression');
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
