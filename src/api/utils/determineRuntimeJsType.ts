import {iC6RestfulModel} from "../types/ormInterfaces";

type JsPrimitive = 'string' | 'number' | 'boolean' | 'buffer' | 'object';

export function determineRuntimeJsType(mysqlType: string): JsPrimitive {
    const base = mysqlType.toLowerCase().split('(')[0];

    if ([
        'binary', 'varbinary', 'blob', 'tinyblob', 'mediumblob', 'longblob'
    ].includes(base)) return 'buffer';

    if ([
        'json', 'geometry', 'point', 'polygon', 'multipoint', 'multilinestring', 'multipolygon', 'geometrycollection'
    ].includes(base)) return 'object';

    if ([
        'tinyint', 'smallint', 'mediumint', 'int', 'integer', 'bigint',
        'decimal', 'dec', 'numeric', 'float', 'double', 'real'
    ].includes(base)) return 'number';

    if ([
        'boolean', 'bool'
    ].includes(base)) return 'boolean';

    return 'string';
}

export function getPrimaryKeyTypes(
    table: iC6RestfulModel<string, any, any>
): Record<string, JsPrimitive> {
    const result: Record<string, JsPrimitive> = {};

    for (const key of table.PRIMARY_SHORT) {
        const fullKey = Object.entries(table.COLUMNS).find(([_, short]) => short === key)?.[0];

        if (typeof fullKey === 'string') {
            const validation = table.TYPE_VALIDATION[fullKey];
            if (!validation) continue;

            result[key] = determineRuntimeJsType(validation.MYSQL_TYPE);
        }
    }

    return result;
}

