import mysql from 'mysql2/promise';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import {
    checkAllRequestsComplete,
    collectSqlAllowListEntries,
    compileSqlAllowList,
    type DetermineResponseDataType,
    type OrmGenerics,
} from '@carbonorm/carbonnode';
import {
    C6,
    GLOBAL_REST_PARAMETERS,
} from './C6.js';
import {
    describe,
    it,
    expect,
    beforeAll,
    afterAll,
} from 'vitest';

function toPascalCase(name: string) {
    return name.replace(/(^|_)([a-z])/g, (_, __, c) => c.toUpperCase());
}

function stripPrefix(name: string) {
    if (!C6.PREFIX) return name;
    return name.startsWith(C6.PREFIX) ? name.slice(C6.PREFIX.length) : name;
}

function getBinding(shortName: string) {
    return C6.ORM?.[toPascalCase(shortName)] ?? C6[toPascalCase(shortName)];
}

function formatTimestamp() {
    return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

type RestResponse<G extends OrmGenerics = OrmGenerics> = DetermineResponseDataType<
    G['RequestMethod'],
    G['RestTableInterface']
>;

type RestPromise<G extends OrmGenerics = OrmGenerics> = Promise<RestResponse<G>>;

function unwrapResponse<G extends OrmGenerics = OrmGenerics>(
    response: RestResponse<G> | null | undefined
) {
    return response;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sqlResponsesDir = path.join(__dirname, 'sqlResponses');
const sqlAllowListPath = path.join(__dirname, 'C6.sqlAllowList.json');
const sqlAllowListEntries = new Set<string>();

async function recordSqlResponse<G extends OrmGenerics = OrmGenerics>(
    label: string,
    response: RestResponse<G> | null | undefined
) {
    if (!response) return;
    const payload = unwrapResponse(response);
    if (!payload) return;
    collectSqlAllowListEntries(payload, sqlAllowListEntries);

    await mkdir(sqlResponsesDir, { recursive: true });
    const filePath = path.join(sqlResponsesDir, `C6.${label}.json`);
    await writeFile(filePath, JSON.stringify(payload, null, 2));
}

async function finalizeSqlAllowList() {
    await compileSqlAllowList(sqlAllowListPath, sqlAllowListEntries);
}

async function executeAndRecord<G extends OrmGenerics = OrmGenerics>(
    label: string,
    fn: () => RestPromise<G>
) {
    const result = await fn();
    await recordSqlResponse<G>(label, result);
    return result;
}

function buildScalarValue(meta: any, columnName: string, seedRow: any) {
    const seedValue = seedRow?.[columnName];
    const mysqlType = String(meta?.MYSQL_TYPE ?? '').toLowerCase();

    if (mysqlType === 'year') return new Date().getFullYear();

    const geometryTypes = [
        'geometry',
        'point',
        'linestring',
        'polygon',
        'multipoint',
        'multilinestring',
        'multipolygon',
        'geometrycollection',
    ];
    if (geometryTypes.some((type) => mysqlType.includes(type))) {
        return [C6.ST_GEOMFROMTEXT, [C6.LIT, 'POINT(0 0)']];
    }

    if (mysqlType === 'json') return {};
    if (mysqlType === 'enum' || mysqlType === 'set') {
        return seedValue;
    }

    const isStringType = ['char', 'varchar', 'text', 'tinytext', 'mediumtext', 'longtext'].some((t) =>
        mysqlType.includes(t)
    );
    if (isStringType) {
        const value = `${columnName}_${Date.now()}`;
        const maxLength = parseInt(meta?.MAX_LENGTH ?? '', 10);
        if (Number.isFinite(maxLength) && maxLength > 0) {
            return value.slice(0, maxLength);
        }
        return value;
    }

    const isDateType = ['date', 'time', 'datetime', 'timestamp', 'year'].some((t) => mysqlType.includes(t));
    if (isDateType) return formatTimestamp();

    const isNumericType = [
        'int',
        'decimal',
        'numeric',
        'float',
        'double',
        'real',
        'bit',
    ].some((t) => mysqlType.includes(t));
    if (isNumericType) {
        if (typeof seedValue === 'number') return seedValue + 1;
        return 1;
    }

    if (mysqlType.includes('bool')) return 1;

    if (['blob', 'binary', 'varbinary'].some((t) => mysqlType.includes(t))) {
        return Buffer.from('00', 'hex');
    }

    if (seedValue !== undefined) return seedValue;

    return null;
}

async function waitForRequests(timeout = 10000) {
    const start = Date.now();
    while (!checkAllRequestsComplete()) {
        if (Date.now() - start > timeout) {
            throw new Error('pending requests did not settle');
        }
        await new Promise((res) => setTimeout(res, 1000));
    }
}

async function fetchSeedRow(binding: any, label: string) {
    const result = await executeAndRecord(label, () =>
        binding.Get({
            [C6.PAGINATION]: { [C6.LIMIT]: 1 },
        } as any)
    );
    const data = unwrapResponse(result);
    return data?.rest?.[0];
}

async function pickForeignKeyValue({
    columnName,
    referencedTable,
    referencedColumn,
    restBinding,
    label,
}: {
    columnName: string;
    referencedTable: string;
    referencedColumn: string;
    restBinding: any;
    label: string;
}) {
    const referencedBinding = getBinding(referencedTable);
    if (!referencedBinding) return undefined;

    const [currentResult, referencedResult] = await Promise.all([
        executeAndRecord(`${label}.fk.current`, () =>
            restBinding.Get({
                [C6.PAGINATION]: { [C6.LIMIT]: 25 },
            } as any)
        ),
        executeAndRecord(`${label}.fk.referenced`, () =>
            referencedBinding.Get({
                [C6.PAGINATION]: { [C6.LIMIT]: 25 },
            } as any)
        ),
    ]);

    const currentData = unwrapResponse(currentResult);
    const referencedData = unwrapResponse(referencedResult);

    const currentRows = currentData?.rest ?? [];
    const currentValues = new Set(
        currentRows
            .map((row) => row?.[columnName])
            .filter((value) => value !== undefined && value !== null)
    );

    const candidate = (referencedData?.rest ?? [])
        .map((row) => row?.[referencedColumn])
        .find((value) => value !== undefined && value !== null && !currentValues.has(value));

    if (candidate !== undefined) return candidate;

    if (currentValues.size < currentRows.length) {
        return referencedData?.rest?.[0]?.[referencedColumn];
    }

    return undefined;
}

function buildUpdatedValue(meta: any, columnName: string, currentValue: any) {
    const mysqlType = String(meta?.MYSQL_TYPE ?? '').toLowerCase();
    const geometryTypes = [
        'geometry',
        'point',
        'linestring',
        'polygon',
        'multipoint',
        'multilinestring',
        'multipolygon',
        'geometrycollection',
    ];

    if (mysqlType === 'year') return new Date().getFullYear();
    if (geometryTypes.some((type) => mysqlType.includes(type))) {
        return [C6.ST_GEOMFROMTEXT, [C6.LIT, 'POINT(1 1)']];
    }
    if (mysqlType === 'json') return { updated: true };

    const isDateType = ['date', 'time', 'datetime', 'timestamp'].some((t) => mysqlType.includes(t));
    if (isDateType) return formatTimestamp();

    const isNumericType = [
        'int',
        'decimal',
        'numeric',
        'float',
        'double',
        'real',
        'bit',
    ].some((t) => mysqlType.includes(t));
    if (isNumericType) {
        if (typeof currentValue === 'number') return currentValue + 1;
        return 1;
    }

    if (mysqlType.includes('bool')) return currentValue ? 0 : 1;

    const isStringType = ['char', 'varchar', 'text', 'tinytext', 'mediumtext', 'longtext'].some((t) =>
        mysqlType.includes(t)
    );
    if (isStringType) {
        const base = `${columnName}_updated_${Date.now()}`;
        const maxLength = parseInt(meta?.MAX_LENGTH ?? '', 10);
        if (Number.isFinite(maxLength) && maxLength > 0) {
            return base.slice(0, maxLength);
        }
        return base;
    }

    if (currentValue instanceof Date) {
        return formatTimestamp();
    }

    return currentValue ?? null;
}

function normalizeForComparison(meta: any, value: any) {
    if (value === undefined || value === null) return value;
    const mysqlType = String(meta?.MYSQL_TYPE ?? '').toLowerCase();

    const isDateType = ['date', 'time', 'datetime', 'timestamp', 'year'].some((t) => mysqlType.includes(t));
    if (isDateType) {
        const dateValue = value instanceof Date ? value : new Date(value);
        const time = dateValue.getTime();
        if (!Number.isNaN(time)) return time;
    }

    const isDecimalType = ['decimal', 'numeric'].some((t) => mysqlType.includes(t));
    if (isDecimalType) {
        const parsed = Number(value);
        if (!Number.isNaN(parsed)) return parsed;
    }

    const isNumericType = [
        'int',
        'float',
        'double',
        'real',
        'bit',
    ].some((t) => mysqlType.includes(t));
    if (isNumericType) {
        const parsed = Number(value);
        if (!Number.isNaN(parsed)) return parsed;
    }

    return value;
}

function rowMatches(row: any, fields: Array<{ columnName: string; value: any; meta: any }>) {
    if (!row) return false;
    return fields.every(({ columnName, value, meta }) => {
        const actual = normalizeForComparison(meta ?? {}, row?.[columnName]);
        const expected = normalizeForComparison(meta ?? {}, value);
        return actual === expected;
    });
}

async function buildInsertPayload(restModel: any, restBinding: any, label: string) {
    const seedRow = await fetchSeedRow(restBinding, `${label}.seed`);
    if (!seedRow) return null;

    const payload: Record<string, any> = {};
    const where: Record<string, any> = {};
    const compareFields: Array<{ columnName: string; value: any; meta: any }> = [];
    const references: Record<string, any[]> = restModel.TABLE_REFERENCES ?? {};
    const validations: Record<string, any> = restModel.TYPE_VALIDATION ?? {};
    const columnMap: Record<string, string> = restModel.COLUMNS ?? {};
    const metaByColumnName: Record<string, any> = {};
    let missingRequired = false;

    for (const [fullColumn, meta] of Object.entries(validations) as [string, any][]) {
        const columnName = columnMap[fullColumn] ?? fullColumn.split('.').pop();
        if (!columnName) continue;
        metaByColumnName[columnName] = meta;
        metaByColumnName[fullColumn] = meta;

        if (meta.AUTO_INCREMENT) continue;
        if (meta.SKIP_COLUMN_IN_POST) continue;

        let value;
        const refList = references[columnName];
        if (Array.isArray(refList) && refList.length > 0) {
            const ref = refList[0];
            const referencedTable = stripPrefix(ref.TABLE);
            value = await pickForeignKeyValue({
                columnName,
                referencedTable,
                referencedColumn: ref.COLUMN,
                restBinding,
                label,
            });
            if (value === undefined) {
                missingRequired = true;
                break;
            }
        } else {
            value = buildScalarValue(meta, columnName, seedRow);
        }

        if (value === undefined) {
            if (seedRow?.[columnName] !== undefined) {
                value = seedRow[columnName];
            }
        }

        if (value === undefined) {
            missingRequired = true;
            break;
        }

        payload[columnName] = value;

        const mysqlType = String(meta?.MYSQL_TYPE ?? '').toLowerCase();
        const geometryTypes = [
            'geometry',
            'point',
            'linestring',
            'polygon',
            'multipoint',
            'multilinestring',
            'multipolygon',
            'geometrycollection',
        ];
        const isDateType = ['date', 'time', 'datetime', 'timestamp', 'year'].some((t) => mysqlType.includes(t));
        const shouldSkipWhere =
            isDateType
            || geometryTypes.some((type) => mysqlType.includes(type))
            || mysqlType === 'json'
            || Array.isArray(value)
            || value instanceof Date
            || (typeof Buffer !== 'undefined' && Buffer.isBuffer && Buffer.isBuffer(value));

        if (!shouldSkipWhere && fullColumn && value !== undefined && value !== null) {
            where[fullColumn] = value;
            compareFields.push({ columnName, value, meta });
        }
    }

    if (missingRequired) return null;

    if (!Object.keys(payload).length) return null;

    if (!Object.keys(where).length) return null;

    return { payload, where, metaByColumnName, compareFields };
}

function buildJoinRequest(shortName: string, restModel: any) {
    const baseTable = restModel.TABLE_NAME ?? shortName;
    const references: Record<string, any[]> = restModel.TABLE_REFERENCES ?? {};
    const referencedBy: Record<string, any[]> = restModel.TABLE_REFERENCED_BY ?? {};

    const referenceEntries = Object.entries(references) as [string, any[]][];
    if (referenceEntries.length > 0) {
        const [localColumn, refs] = referenceEntries[0];
        const ref = refs[0];
        const joinTable = ref.TABLE;
        const joinAlias = `${stripPrefix(ref.TABLE)}_ref`;
        return {
            [C6.SELECT]: ['*'],
            [C6.JOIN]: {
                [C6.INNER]: {
                    [`${joinTable} ${joinAlias}`]: {
                        [`${joinAlias}.${ref.COLUMN}`]: [C6.EQUAL, `${baseTable}.${localColumn}`],
                    },
                },
            },
            [C6.PAGINATION]: { [C6.LIMIT]: 1 },
        };
    }

    const referencedByEntries = Object.entries(referencedBy) as [string, any[]][];
    if (referencedByEntries.length > 0) {
        const [localColumn, refs] = referencedByEntries[0];
        const ref = refs[0];
        const joinTable = ref.TABLE;
        const joinAlias = `${stripPrefix(ref.TABLE)}_ref`;
        return {
            [C6.SELECT]: ['*'],
            [C6.JOIN]: {
                [C6.INNER]: {
                    [`${joinTable} ${joinAlias}`]: {
                        [`${joinAlias}.${ref.COLUMN}`]: [C6.EQUAL, `${baseTable}.${localColumn}`],
                    },
                },
            },
            [C6.PAGINATION]: { [C6.LIMIT]: 1 },
        };
    }

    return null;
}

describe('sakila-db generated C6 bindings', () => {
    let pool;

    beforeAll(async () => {
        pool = mysql.createPool({
            host: '127.0.0.1',
            user: 'root',
            password: 'password',
            database: 'sakila',
        });
        GLOBAL_REST_PARAMETERS.mysqlPool = pool;
    });

    afterAll(async () => {
        await pool.end();
        await finalizeSqlAllowList();
    });

    for (const [shortName, restModel] of Object.entries(C6.TABLES as Record<string, any>)) {
        const restBinding = getBinding(shortName);
        const tableModel = restModel as any;
        if (!restBinding) continue;

        it(`[${shortName}] GET`, async () => {
            const result = await executeAndRecord(`${shortName}.get`, () =>
                restBinding.Get({
                    [C6.SELECT]: ['*'],
                    [C6.PAGINATION]: { [C6.LIMIT]: 1 },
                } as any)
            );
            const data = unwrapResponse(result);
            expect(Array.isArray(data?.rest)).toBe(true);
            await waitForRequests();
        });

        it(`[${shortName}] JOIN`, async () => {
            const joinRequest = buildJoinRequest(shortName, tableModel);
            if (!joinRequest) return;

            const result = await executeAndRecord(`${shortName}.join`, () =>
                restBinding.Get(joinRequest as any)
            );
            const data = unwrapResponse(result);
            expect(Array.isArray(data?.rest)).toBe(true);
            await waitForRequests();
        });

        it(`[${shortName}] POST/PUT/DELETE`, async () => {
            const primaryKeys = tableModel.PRIMARY_SHORT ?? [];
            if (primaryKeys.length !== 1) return;

            const payloadSpec = await buildInsertPayload(tableModel, restBinding, shortName);
            if (!payloadSpec) return;

            await executeAndRecord(`${shortName}.post`, () =>
                restBinding.Post(payloadSpec.payload as any)
            );

            const primaryFull = tableModel.PRIMARY?.[0];
            const primaryKey = primaryKeys[0];
            const primaryMeta = payloadSpec.metaByColumnName?.[primaryKey]
                ?? payloadSpec.metaByColumnName?.[primaryFull ?? ''];

            let insertedRow: any;

            if (primaryFull && primaryMeta?.AUTO_INCREMENT) {
                const latestResult = await executeAndRecord(`${shortName}.post.latest`, () =>
                    restBinding.Get({
                        [C6.PAGINATION]: {
                            [C6.LIMIT]: 1,
                            [C6.ORDER]: [[primaryFull, C6.DESC]],
                        },
                        cacheResults: false,
                    } as any)
                );
                const latestData = unwrapResponse(latestResult);
                insertedRow = latestData?.rest?.[0];
            } else {
                const lookupResult = await executeAndRecord(`${shortName}.post.lookup`, () =>
                    restBinding.Get({
                        [C6.WHERE]: payloadSpec.where,
                        [C6.PAGINATION]: { [C6.LIMIT]: 1 },
                        cacheResults: false,
                    } as any)
                );
                const lookupData = unwrapResponse(lookupResult);
                insertedRow = (lookupData?.rest ?? []).find((row: any) =>
                    rowMatches(row, payloadSpec.compareFields ?? [])
                );

                if (!insertedRow && primaryFull) {
                    const fallbackResult = await executeAndRecord(`${shortName}.post.fallback`, () =>
                        restBinding.Get({
                            [C6.PAGINATION]: {
                                [C6.LIMIT]: 1,
                                [C6.ORDER]: [[primaryFull, C6.DESC]],
                            },
                            cacheResults: false,
                        } as any)
                    );
                    const fallbackData = unwrapResponse(fallbackResult);
                    insertedRow = fallbackData?.rest?.[0];
                }
            }

            expect(insertedRow).toBeDefined();

            if (!insertedRow) return;

            const primaryValue = insertedRow[primaryKey];
            if (primaryValue === undefined || primaryValue === null) return;

            const foreignKeys = new Set(Object.keys(tableModel.TABLE_REFERENCES ?? {}));
            const updateColumn = Object.keys(payloadSpec.payload)
                .find((key) => {
                    if (key === primaryKey || foreignKeys.has(key)) return false;
                    const meta = payloadSpec.metaByColumnName?.[key];
                    const mysqlType = String(meta?.MYSQL_TYPE ?? '').toLowerCase();
                    const geometryTypes = [
                        'geometry',
                        'point',
                        'linestring',
                        'polygon',
                        'multipoint',
                        'multilinestring',
                        'multipolygon',
                        'geometrycollection',
                    ];
                    return !geometryTypes.some((type) => mysqlType.includes(type));
                })
                ?? Object.keys(payloadSpec.payload).find((key) => key !== primaryKey);

            if (!updateColumn) return;

            const currentValue = insertedRow[updateColumn];
            const updateMeta = payloadSpec.metaByColumnName?.[updateColumn];
            const updatedValue = buildUpdatedValue(updateMeta ?? {}, updateColumn, currentValue);

            await executeAndRecord(`${shortName}.put`, () =>
                restBinding.Put({
                    [primaryKey]: primaryValue,
                    [updateColumn]: updatedValue,
                } as any)
            );

            const updatedResult = await executeAndRecord(`${shortName}.put.lookup`, () =>
                restBinding.Get({
                    [primaryKey]: primaryValue,
                    cacheResults: false,
                } as any)
            );
            const updatedData = unwrapResponse(updatedResult);
            const normalizedActual = normalizeForComparison(updateMeta ?? {}, updatedData?.rest?.[0]?.[updateColumn]);
            const normalizedExpected = normalizeForComparison(updateMeta ?? {}, updatedValue);
            expect(normalizedActual).toBe(normalizedExpected);

            await executeAndRecord(`${shortName}.delete`, () =>
                restBinding.Delete({
                    [primaryKey]: primaryValue,
                } as any)
            );

            const deletedResult = await executeAndRecord(`${shortName}.delete.lookup`, () =>
                restBinding.Get({
                    [primaryKey]: primaryValue,
                    cacheResults: false,
                } as any)
            );
            const deletedData = unwrapResponse(deletedResult);
            expect(Array.isArray(deletedData?.rest)).toBe(true);
            expect(deletedData?.rest?.length ?? 0).toBe(0);
            await waitForRequests();
        });
    }
});
