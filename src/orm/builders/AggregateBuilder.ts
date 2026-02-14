import {Executor} from "../../executors/Executor";
import {OrmGenerics} from "../../types/ormGenerics";
import {SQL_KNOWN_FUNCTIONS} from "../../types/mysqlTypes";
import {getLogContext, LogLevel, logWithLevel} from "../../utils/logLevel";
import {
    iSerializedExpression,
    serializeSqlExpression,
    tSqlParams,
} from "./ExpressionSerializer";

const KNOWN_FUNCTION_LOOKUP = new Set(
    SQL_KNOWN_FUNCTIONS.map((name) => String(name).toUpperCase()),
);

export abstract class AggregateBuilder<G extends OrmGenerics> extends Executor<G> {
    protected selectAliases: Set<string> = new Set<string>();

    // Overridden in ConditionBuilder where alias tracking is available.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected assertValidIdentifier(_identifier: string, _context: string): void {
        // no-op placeholder for subclasses that do not implement alias validation
    }

    protected isReferenceExpression(value: string): boolean {
        if (typeof value !== 'string') return false;

        const trimmed = value.trim();
        if (trimmed.length === 0) return false;

        if (trimmed === '*') return true;

        if (/^[A-Za-z_][A-Za-z0-9_]*\.\*$/.test(trimmed)) {
            this.assertValidIdentifier(trimmed, 'SQL reference');
            return true;
        }

        if (/^[A-Za-z_][A-Za-z0-9_]*\.[A-Za-z_][A-Za-z0-9_]*$/.test(trimmed)) {
            this.assertValidIdentifier(trimmed, 'SQL reference');
            return true;
        }

        if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(trimmed) && this.selectAliases.has(trimmed)) {
            return true;
        }

        return false;
    }

    protected isKnownFunction(functionName: string): boolean {
        return KNOWN_FUNCTION_LOOKUP.has(functionName.trim().toUpperCase());
    }

    protected serializeExpression(
        expression: any,
        params?: tSqlParams,
        context: string = 'SQL expression',
        contextColumn?: string,
    ): iSerializedExpression {
        return serializeSqlExpression(expression, {
            params,
            context,
            contextColumn,
            hooks: {
                assertValidIdentifier: (identifier: string, hookContext: string) => {
                    this.assertValidIdentifier(identifier, hookContext);
                },
                isReference: (value: string) => this.isReferenceExpression(value),
                addParam: (target: tSqlParams, column: string, value: any) => {
                    const addParam = (this as any).addParam;
                    if (typeof addParam !== 'function') {
                        throw new Error('Expression literal binding requires addParam support.');
                    }
                    return addParam.call(this, target, column, value);
                },
                buildScalarSubSelect: (subRequest: any, target: tSqlParams) => {
                    const builder = (this as any).buildScalarSubSelect;
                    if (typeof builder !== 'function') {
                        throw new Error('Scalar subselects require SelectQueryBuilder context.');
                    }
                    return builder.call(this, subRequest, target);
                },
                onAlias: (alias: string) => {
                    this.selectAliases.add(alias);
                },
                isKnownFunction: (functionName: string) => this.isKnownFunction(functionName),
            },
        });
    }

    buildAggregateField(field: string | any[], params?: tSqlParams): string {
        const serialized = this.serializeExpression(field, params, 'SELECT expression');

        logWithLevel(
            LogLevel.DEBUG,
            getLogContext(this.config, this.request),
            console.log,
            `[SELECT] ${serialized.sql}`,
        );

        return serialized.sql;
    }
}
