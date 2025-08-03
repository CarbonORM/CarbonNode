import {Executor} from "../../executors/Executor";
import {OrmGenerics} from "../../types/ormGenerics";

export abstract class AggregateBuilder<G extends OrmGenerics> extends Executor<G>{
    buildAggregateField(field: string | any[]): string {
        if (typeof field === 'string') {
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
        const argList = args
            .map(arg => Array.isArray(arg) ? this.buildAggregateField(arg) : arg)
            .join(', ');

        let expr: string;

        if (F === 'DISTINCT') {
            expr = `DISTINCT ${argList}`;
        } else {
            expr = `${F}(${argList})`;
        }

        if (alias) {
            expr += ` AS ${alias}`;
        }

        this.config.verbose && console.log(`[SELECT] ${expr}`);

        return expr;
    }
}
