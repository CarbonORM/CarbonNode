#!/usr/bin/env node

const {execFileSync, execSync} = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const Handlebars = require('handlebars');
import {version} from '../package.json';

const args = process.argv.slice(2);  // Slice the first two elements
const argMap = {};

for (let i = 0; i < args.length; i += 2) {
    argMap[args[i]] = args[i + 1];
}

type iDatabaseConnection = {
    host: string;
    port: string;
    user: string;
    pass: string;
};

type tDatabaseDialect = 'mysql' | 'postgresql';

type iScopedDatabaseAliasDefinition = {
    DATABASE_KEY: string;
    DATABASE_NAME: string;
    DATABASE_KEY_IDENTIFIER: string;
    DATABASE_KEY_PASCAL_CASE: string;
    DIALECT: tDatabaseDialect;
};

type iScopedDatabaseDefinition = iScopedDatabaseAliasDefinition & {
    CONNECTION: iDatabaseConnection;
};

type iGeneratorDatabaseConfigEntry = {
    alias: string;
    host: string;
    port?: number | string;
    user: string;
    pass?: string;
    passEnv?: string;
    dbname?: string;
    dbnames?: string[];
    dialect?: tDatabaseDialect;
};

type iGeneratorConfig = {
    databases: iGeneratorDatabaseConfigEntry[];
    prefix?: string;
    output?: string;
    restUrlExpression?: string;
    objectOverrides?: string;
    interfaceOverrides?: string;
    customImports?: string;
    react?: string;
    primaryAlias?: string;
};

type iSchemaColumnMetadata = {
    TABLE_NAME: string;
    TABLE_TYPE: string;
    COLUMN_NAME: string;
    DATA_TYPE: string;
    COLUMN_TYPE: string;
    IS_NULLABLE: string;
    EXTRA: string;
};

type iSchemaTableMetadata = {
    TABLE_TYPE: string;
    COLUMNS: iSchemaColumnMetadata[];
};

type iSchemaMetadata = Record<string, iSchemaTableMetadata>;

const sanitizeIdentifier = (value: string): string => {
    const normalized = value
        .trim()
        .replace(/[^A-Za-z0-9_]/g, "_")
        .replace(/^[^A-Za-z_]+/, "");
    return normalized.length > 0 ? normalized : "db";
};

const toPascalCaseFromIdentifier = (identifier: string): string =>
    identifier
        .split("_")
        .filter(Boolean)
        .map(capitalizeFirstLetter)
        .join("_") || "Db";

const toConstantIdentifier = (value: string): string => {
    const normalized = value
        .toUpperCase()
        .replace(/[^A-Z0-9_]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^([^A-Z_])/, "_$1");

    return normalized.length > 0 ? normalized : "COLUMN";
};

const createDirIfNotExists = dir =>
    !fs.existsSync(dir) ? fs.mkdirSync(dir, {recursive: true}) : undefined;

const ensureString = (value: unknown, label: string): string => {
    if (typeof value !== "string" || value.trim().length === 0) {
        throw new Error(`${label} must be a non-empty string.`);
    }

    return value.trim();
};

const resolveConfigPassword = (entry: iGeneratorDatabaseConfigEntry): string => {
    if (typeof entry.pass === "string" && entry.pass.trim().length > 0) {
        return entry.pass.trim();
    }

    if (typeof entry.passEnv === "string" && entry.passEnv.trim().length > 0) {
        const envKey = entry.passEnv.trim();
        const envValue = process.env[envKey];
        if (typeof envValue !== "string" || envValue.trim().length === 0) {
            throw new Error(`Environment variable '${envKey}' is required for database alias '${entry.alias}'.`);
        }
        return envValue;
    }

    throw new Error(`Database alias '${entry.alias}' must provide either 'pass' or 'passEnv'.`);
};

const parseConfigDbNames = (entry: iGeneratorDatabaseConfigEntry): string[] => {
    if (Array.isArray(entry.dbnames)) {
        const names = entry.dbnames
            .map(dbName => ensureString(dbName, `databases[${entry.alias}].dbnames[]`))
            .filter(Boolean);
        if (names.length > 0) {
            return names;
        }
    }

    if (typeof entry.dbname === "string" && entry.dbname.trim().length > 0) {
        return [entry.dbname.trim()];
    }

    throw new Error(`Database alias '${entry.alias}' must provide 'dbname' or a non-empty 'dbnames' array.`);
};

const parseConfigDialect = (entry: iGeneratorDatabaseConfigEntry): tDatabaseDialect => {
    const raw = String(entry.dialect ?? 'mysql').trim().toLowerCase();
    if (raw === 'mysql' || raw === 'postgresql') {
        return raw;
    }

    throw new Error(`Database alias '${entry.alias}' has unsupported dialect '${entry.dialect}'. Use 'mysql' or 'postgresql'.`);
};

const aliasForConfigDbName = (
    baseAlias: string,
    dbName: string,
    totalDbNames: number,
): string => {
    if (totalDbNames <= 1 || dbName === baseAlias) {
        return baseAlias;
    }

    return `${baseAlias}_${dbName}`;
};

const buildScopedDefinitionsFromConfig = (
    config: iGeneratorConfig,
): iScopedDatabaseDefinition[] => {
    if (!Array.isArray(config.databases) || config.databases.length === 0) {
        throw new Error("Config must define a non-empty 'databases' array.");
    }

    const scopedDefinitions: iScopedDatabaseDefinition[] = [];
    for (const entry of config.databases) {
        const baseAlias = ensureString(entry.alias, "databases[].alias");
        const dialect = parseConfigDialect(entry);
        const host = ensureString(entry.host, `databases[${baseAlias}].host`);
        const user = ensureString(entry.user, `databases[${baseAlias}].user`);
        const port = String(entry.port ?? (dialect === 'postgresql' ? "5432" : "3306")).trim();
        if (port.length === 0) {
            throw new Error(`databases[${baseAlias}].port must be non-empty when provided.`);
        }
        const pass = resolveConfigPassword(entry);
        const dbNames = parseConfigDbNames(entry);

        for (const dbName of dbNames) {
            const runtimeAlias = aliasForConfigDbName(baseAlias, dbName, dbNames.length);
            const aliasIdentifier = sanitizeIdentifier(runtimeAlias);
            scopedDefinitions.push({
                DATABASE_KEY: runtimeAlias,
                DATABASE_NAME: dbName,
                DATABASE_KEY_IDENTIFIER: aliasIdentifier,
                DATABASE_KEY_PASCAL_CASE: toPascalCaseFromIdentifier(aliasIdentifier),
                DIALECT: dialect,
                CONNECTION: {
                    host,
                    port,
                    user,
                    pass,
                },
            });
        }
    }

    const seenRuntimeKeys = new Set<string>();
    const seenRuntimeIdentifiers = new Set<string>();
    for (const scopedDefinition of scopedDefinitions) {
        if (seenRuntimeKeys.has(scopedDefinition.DATABASE_KEY)) {
            throw new Error(`Duplicate database alias '${scopedDefinition.DATABASE_KEY}' in config.`);
        }
        seenRuntimeKeys.add(scopedDefinition.DATABASE_KEY);

        if (seenRuntimeIdentifiers.has(scopedDefinition.DATABASE_KEY_IDENTIFIER)) {
            throw new Error(
                `Database aliases map to duplicate identifier '${scopedDefinition.DATABASE_KEY_IDENTIFIER}'.`,
            );
        }
        seenRuntimeIdentifiers.add(scopedDefinition.DATABASE_KEY_IDENTIFIER);
    }

    return scopedDefinitions;
};

const CONFIG_DISCOVERY_NAMES = [
    ".C6.ts",
    ".C6.json",
    "C6.config.ts",
    "C6.config.json",
];

const discoverConfigPath = (startDir: string): string | undefined => {
    let current = path.resolve(startDir);

    while (true) {
        for (const configName of CONFIG_DISCOVERY_NAMES) {
            const candidate = path.join(current, configName);
            if (fs.existsSync(candidate)) {
                return candidate;
            }
        }

        const parent = path.dirname(current);
        if (parent === current) {
            return undefined;
        }
        current = parent;
    }
};

const askQuestion = async (
    rl: any,
    question: string,
): Promise<string> =>
    await new Promise<string>((resolve) => {
        rl.question(question, (answer: string) => resolve(answer.trim()));
    });

const buildConfigInteractively = async (): Promise<iGeneratorConfig> => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    try {
        console.log("[generateRestBindings] No config found. Let's create C6.config.json.");
        const databases: iGeneratorDatabaseConfigEntry[] = [];

        while (true) {
            const alias = ensureString(await askQuestion(rl, "Database alias (e.g. app): "), "alias");
            const dialect = parseConfigDialect({
                alias,
                dialect: (await askQuestion(rl, "Dialect (mysql/postgresql, default mysql): ")) || "mysql",
            } as iGeneratorDatabaseConfigEntry);
            const host = ensureString(await askQuestion(rl, "Host (e.g. 127.0.0.1): "), "host");
            const defaultPort = dialect === "postgresql" ? "5432" : "3306";
            const port = (await askQuestion(rl, `Port (default ${defaultPort}): `)) || defaultPort;
            const user = ensureString(await askQuestion(rl, "User: "), "user");
            const pass = ensureString(await askQuestion(rl, "Password: "), "pass");
            const dbnamesRaw = ensureString(
                await askQuestion(rl, "Schema names (comma-separated, e.g. app,billing): "),
                "dbnames",
            );

            databases.push({
                alias,
                dialect,
                host,
                port,
                user,
                pass,
                dbnames: dbnamesRaw.split(",").map((name) => name.trim()).filter(Boolean),
            });

            const addAnother = (await askQuestion(rl, "Add another database entry? (y/N): ")).toLowerCase();
            if (addAnother !== "y" && addAnother !== "yes") {
                break;
            }
        }

        return {
            databases,
        };
    } finally {
        rl.close();
    }
};

const isGeneratorConfigObject = (value: unknown): value is iGeneratorConfig =>
    !!value && typeof value === "object" && !Array.isArray(value);

const resolveLoadedConfig = async (
    loaded: unknown,
    configPath: string,
): Promise<iGeneratorConfig> => {
    const evaluated = typeof loaded === "function"
        ? (loaded as (...args: any[]) => unknown)()
        : loaded;
    const awaited = await Promise.resolve(evaluated);

    if (!isGeneratorConfigObject(awaited)) {
        throw new Error(
            `Config at '${configPath}' must export an object, function, or async function that resolves to an object.`,
        );
    }

    return awaited;
};

const loadConfigFromPath = async (configPath: string): Promise<iGeneratorConfig> => {
    const ext = path.extname(configPath).toLowerCase();

    if (ext === ".json") {
        const raw = fs.readFileSync(configPath, "utf-8");
        return await resolveLoadedConfig(JSON.parse(raw), configPath);
    }

    if (ext === ".ts") {
        const typescript = require("typescript");
        const source = fs.readFileSync(configPath, "utf-8");
        const transpiled = typescript.transpileModule(source, {
            compilerOptions: {
                module: typescript.ModuleKind.CommonJS,
                target: typescript.ScriptTarget.ES2020,
            },
        }).outputText;

        const moduleRef = { exports: {} as any };
        const compiled = new Function(
            "require",
            "module",
            "exports",
            "__filename",
            "__dirname",
            transpiled,
        );
        compiled(require, moduleRef, moduleRef.exports, configPath, path.dirname(configPath));

        return await resolveLoadedConfig(moduleRef.exports.default ?? moduleRef.exports, configPath);
    }

    throw new Error(`Unsupported config extension '${ext}'. Use .json or .ts.`);
};

class MySQLDump {

    static mysqlcnf: Record<string, string> = {};
    static mysqldump: string = '';
    static DB_USER = argMap['--user'] || 'root';
    static DB_PASS = argMap['--pass'] || 'password';
    static DB_HOST = argMap['--host'] || '127.0.0.1';
    static DB_PORT = argMap['--port'] || '3306';
    static DB_NAME = argMap['--dbname'] || 'sakila';
    static DB_PREFIX = argMap['--prefix'] || '';
    static RELATIVE_OUTPUT_DIR = argMap['--output'] || '/src';
    static OUTPUT_DIR = path.isAbsolute(MySQLDump.RELATIVE_OUTPUT_DIR)
        ? MySQLDump.RELATIVE_OUTPUT_DIR
        : path.join(process.cwd(), MySQLDump.RELATIVE_OUTPUT_DIR);

    static buildCNF(
        connection: iDatabaseConnection,
        cnfFile: string = '',
        cnfTag: string = '',
    ) {

        const cnf = [
            '[client]',
            `user = ${connection.user}`,
            `password = ${connection.pass}`,
            `host = ${connection.host}`,
            `port = ${connection.port}`,
            '',
        ];

        cnf.push(``);

        if ('' === cnfFile) {

            const suffix = cnfTag ? `.${sanitizeIdentifier(cnfTag)}` : '';
            cnfFile = path.join(this.OUTPUT_DIR, `C6${suffix}.mysql.cnf`);

        }

        try {

            fs.writeFileSync(cnfFile, cnf.join('\n'));

            fs.chmodSync(cnfFile, 0o750);

            console.log(`Successfully created C6.mysql.cnf file in (${cnfFile})`);

        } catch (error) {

            console.error(`Failed to store file contents of C6.mysql.cnf in (${process.cwd()})`, error);

            process.exit(1);

        }

        this.mysqlcnf[cnfTag || "default"] = cnfFile;
        return cnfFile;

    }

    static MySQLDump(
        mysqldump: string = 'mysqldump',
        data = false,
        schemas = true,
        outputFile = '',
        otherOption = '',
        specificTable: string = '',
        databaseName: string = this.DB_NAME,
        connection: iDatabaseConnection = {
            user: this.DB_USER,
            pass: this.DB_PASS,
            host: this.DB_HOST,
            port: this.DB_PORT,
        },
        cnfTag: string = "",
    ) {

        if (outputFile === '') {
            outputFile = path.join(this.OUTPUT_DIR, 'C6.mysqldump.sql');
        }

        if (!data && !schemas) {
            console.warn("MysqlDump is running with --no-create-info and --no-data. Why?");
        }

        const defaultsExtraFile = this.buildCNF(connection, "", cnfTag);

        const hexBlobOption = data ? '--hex-blob ' : '--no-data ';

        const createInfoOption = schemas ? '' : ' --no-create-info ';

        const tempOutputFile = `${outputFile}.tmp`;
        const cmd = `${mysqldump} --defaults-extra-file="${defaultsExtraFile}" ${otherOption} --set-gtid-purged="OFF" --skip-add-locks --lock-tables=false --single-transaction --quick ${createInfoOption}${hexBlobOption}${databaseName} ${specificTable} > '${tempOutputFile}'`;

        const succeeded = this.executeAndCheckStatus(cmd, false);
        if (succeeded && fs.existsSync(tempOutputFile)) {
            fs.renameSync(tempOutputFile, outputFile);
        } else if (fs.existsSync(tempOutputFile)) {
            fs.unlinkSync(tempOutputFile);
        }

        if (!succeeded && fs.existsSync(outputFile)) {
            console.warn(`[generateRestBindings] mysqldump for '${databaseName}' failed. Reusing existing dump file at ${outputFile}.`);
        }

        if (!fs.existsSync(outputFile)) {
            console.warn(`[generateRestBindings] mysqldump output not found at ${outputFile}. If running in CI/no-DB environment, ensure a prebuilt dump file exists at this path.`);
        }

        return (this.mysqldump = outputFile);

    }

    static LoadInformationSchema(
        databaseName: string = this.DB_NAME,
        connection: iDatabaseConnection = {
            user: this.DB_USER,
            pass: this.DB_PASS,
            host: this.DB_HOST,
            port: this.DB_PORT,
        },
        cnfTag: string = "",
    ): iSchemaMetadata {
        const defaultsExtraFile = this.buildCNF(connection, "", cnfTag);
        const escapedDatabaseName = databaseName.replace(/\\/g, "\\\\").replace(/'/g, "''");
        const query = `
            SELECT
                c.TABLE_NAME,
                t.TABLE_TYPE,
                c.COLUMN_NAME,
                c.DATA_TYPE,
                c.COLUMN_TYPE,
                c.IS_NULLABLE,
                c.EXTRA
            FROM information_schema.COLUMNS c
            JOIN information_schema.TABLES t
                ON t.TABLE_SCHEMA = c.TABLE_SCHEMA
                AND t.TABLE_NAME = c.TABLE_NAME
            WHERE c.TABLE_SCHEMA = '${escapedDatabaseName}'
            ORDER BY c.TABLE_NAME, c.ORDINAL_POSITION
        `;

        try {
            const stdout = execFileSync(
                "mysql",
                [
                    `--defaults-extra-file=${defaultsExtraFile}`,
                    "--batch",
                    "--raw",
                    "--skip-column-names",
                    "-e",
                    query,
                ],
                {encoding: "utf-8"},
            );

            const schemaMetadata: iSchemaMetadata = {};
            for (const line of stdout.split(/\r?\n/)) {
                if (!line.trim()) continue;
                const [
                    tableName,
                    tableType,
                    columnName,
                    dataType,
                    columnType,
                    isNullable,
                    extra,
                ] = line.split("\t");

                if (!tableName || !columnName) continue;

                if (!schemaMetadata[tableName]) {
                    schemaMetadata[tableName] = {
                        TABLE_TYPE: tableType || "BASE TABLE",
                        COLUMNS: [],
                    };
                }

                schemaMetadata[tableName].COLUMNS.push({
                    TABLE_NAME: tableName,
                    TABLE_TYPE: tableType || "BASE TABLE",
                    COLUMN_NAME: columnName,
                    DATA_TYPE: dataType || "",
                    COLUMN_TYPE: columnType || dataType || "",
                    IS_NULLABLE: isNullable || "YES",
                    EXTRA: extra || "",
                });
            }

            return schemaMetadata;
        } catch (error) {
            console.warn(`[generateRestBindings] information_schema lookup for '${databaseName}' failed. Falling back to dump-derived metadata where possible.`);
            return {};
        }

    }

    static executeAndCheckStatus(command: string, exitOnFailure = true, output: any[] = []): boolean {

        try {

            const stdout = execSync(command, {encoding: 'utf-8'});

            output.push(stdout);

            return true;

        } catch (e) {

            console.log(`Command output::`, e);

            if (exitOnFailure) {

                process.exit(1);

            }

            return false;

        }

    }

}

class PostgreSQLDump {
    static PgDump(
        pgDump: string = 'pg_dump',
        outputFile = '',
        databaseName: string = MySQLDump.DB_NAME,
        connection: iDatabaseConnection = {
            user: MySQLDump.DB_USER,
            pass: MySQLDump.DB_PASS,
            host: MySQLDump.DB_HOST,
            port: MySQLDump.DB_PORT,
        },
    ) {
        if (outputFile === '') {
            outputFile = path.join(MySQLDump.OUTPUT_DIR, 'C6.pg_dump.sql');
        }

        const tempOutputFile = `${outputFile}.tmp`;
        const env = {
            ...process.env,
            PGPASSWORD: connection.pass,
        };

        try {
            const args = [
                '--schema-only',
                '--no-owner',
                '--no-privileges',
                '--host', connection.host,
                '--port', connection.port,
                '--username', connection.user,
                '--dbname', databaseName,
                '--file', tempOutputFile,
            ];
            execFileSync(pgDump, args, { encoding: 'utf-8', env });
            if (fs.existsSync(tempOutputFile)) {
                fs.renameSync(tempOutputFile, outputFile);
            }
        } catch (error) {
            if (fs.existsSync(tempOutputFile)) {
                fs.unlinkSync(tempOutputFile);
            }
            if (fs.existsSync(outputFile)) {
                console.warn(`[generateRestBindings] pg_dump for '${databaseName}' failed. Reusing existing dump file at ${outputFile}.`);
            } else {
                console.warn(`[generateRestBindings] pg_dump output not found at ${outputFile}. If running in CI/no-DB environment, ensure a prebuilt dump file exists at this path.`);
            }
        }

        return outputFile;
    }

    static LoadInformationSchema(
        databaseName: string = MySQLDump.DB_NAME,
        connection: iDatabaseConnection = {
            user: MySQLDump.DB_USER,
            pass: MySQLDump.DB_PASS,
            host: MySQLDump.DB_HOST,
            port: MySQLDump.DB_PORT,
        },
    ): iSchemaMetadata {
        const query = `
            SELECT
                c.table_name,
                CASE WHEN t.table_type = 'VIEW' THEN 'VIEW' ELSE 'BASE TABLE' END AS table_type,
                c.column_name,
                c.data_type,
                COALESCE(c.udt_name, c.data_type) AS column_type,
                c.is_nullable,
                CASE
                    WHEN c.is_identity = 'YES' THEN 'auto_increment'
                    WHEN c.column_default LIKE 'nextval(%' THEN 'auto_increment'
                    ELSE ''
                END AS extra
            FROM information_schema.columns c
            JOIN information_schema.tables t
                ON t.table_schema = c.table_schema
                AND t.table_name = c.table_name
            WHERE c.table_schema = 'public'
            ORDER BY c.table_name, c.ordinal_position
        `;

        try {
            const stdout = execFileSync(
                'psql',
                [
                    '--host', connection.host,
                    '--port', connection.port,
                    '--username', connection.user,
                    '--dbname', databaseName,
                    '--tuples-only',
                    '--no-align',
                    '--field-separator', '\t',
                    '--command', query,
                ],
                {
                    encoding: 'utf-8',
                    env: {
                        ...process.env,
                        PGPASSWORD: connection.pass,
                    },
                },
            );

            const schemaMetadata: iSchemaMetadata = {};
            for (const line of stdout.split(/\r?\n/)) {
                if (!line.trim()) continue;
                const [
                    tableName,
                    tableType,
                    columnName,
                    dataType,
                    columnType,
                    isNullable,
                    extra,
                ] = line.split('\t');

                if (!tableName || !columnName) continue;

                if (!schemaMetadata[tableName]) {
                    schemaMetadata[tableName] = {
                        TABLE_TYPE: tableType || 'BASE TABLE',
                        COLUMNS: [],
                    };
                }

                schemaMetadata[tableName].COLUMNS.push({
                    TABLE_NAME: tableName,
                    TABLE_TYPE: tableType || 'BASE TABLE',
                    COLUMN_NAME: columnName,
                    DATA_TYPE: dataType || '',
                    COLUMN_TYPE: columnType || dataType || '',
                    IS_NULLABLE: isNullable || 'YES',
                    EXTRA: extra || '',
                });
            }

            return schemaMetadata;
        } catch (error) {
            console.warn(`[generateRestBindings] PostgreSQL information_schema lookup for '${databaseName}' failed. Falling back to dump-derived metadata where possible.`);
            return {};
        }
    }
}

let pathRuntimeReference = '';

/*type ColumnInfo = {
    type: string;
    length?: string;
    autoIncrement: boolean;
    notNull: boolean;
    defaultValue?: string;
};*/

type foreignKeyInfo = {
    TABLE: string,
    CONSTRAINT: string,
    FOREIGN_KEY: string,
    REFERENCES: string,
    ON_DELETE: string,
    ON_UPDATE: string
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function determineTypeScriptType(mysqlType: string, enumValues?: string[]): string {
    const baseType = mysqlType.toLowerCase().replace(/\(.+?\)/, '').split(' ')[0];

    if (baseType === 'enum' && Array.isArray(enumValues)) {
        return enumValues.map(val => `'${val}'`).join(' | ');
    }

    switch (mysqlType) {
        case 'enum':
            throw Error('An unexpected error occurred. Please report this issue to the maintainers of this script.');

        // Date & Time
        case 'time':
        case 'year':
        case 'date':
        case 'datetime':
        case 'timestamp':
            return 'Date | number | string';

        // String & Temporal
        case 'char':
        case 'varchar':
        case 'character':
        case 'text':
        case 'tinytext':
        case 'mediumtext':
        case 'longtext':
        case 'set':
        case 'uuid':
            return 'string';

        // Numeric
        case 'tinyint':
        case 'smallint':
        case 'mediumint':
        case 'int':
        case 'integer':
        case 'serial':
        case 'bigserial':
        case 'bigint':
        case 'decimal':
        case 'dec':
        case 'numeric':
        case 'float':
        case 'double':
        case 'real':
            return 'number';

        // Boolean
        case 'boolean':
        case 'bool':
            return 'boolean';

        // JSON
        case 'json':
        case 'jsonb':
            return 'any';

        // GeoJSON
        case 'geometry':
            return 'GeoJSON.Geometry';
        case 'point':
            return '{ x: number; y: number }';
        case 'linestring':
            return 'GeoJSON.LineString';
        case 'polygon':
            return 'GeoJSON.Polygon';
        case 'multipoint':
            return 'GeoJSON.MultiPoint';
        case 'multilinestring':
            return 'GeoJSON.MultiLineString';
        case 'multipolygon':
            return 'GeoJSON.MultiPolygon';
        case 'geometrycollection':
            return 'GeoJSON.GeometryCollection';

        // Binary
        case 'binary':
        case 'varbinary':
        case 'blob':
        case 'tinyblob':
        case 'mediumblob':
        case 'longblob':
            return 'Buffer | string'; // todo - we should pass driver specific types here

        default:
            return 'string';
    }
}

const parseSQLToTypeScript = (sql: string, schemaMetadata: iSchemaMetadata = {}) => {

    const tableMatches = sql.matchAll(/CREATE\s+TABLE\s+`?(\w+)`?\s+\(((.|\n)+?)\)\s*(ENGINE=.+?);/gm);

    let tableData: {
        [TableName: string]: {
            RELATIVE_OUTPUT_DIR: string,
            TABLE_NAME: string,
            RELATION_TYPE: 'TABLE' | 'VIEW',
            READ_ONLY: boolean,
            TABLE_DEFINITION: string,
            TABLE_CONSTRAINT: {},
            TABLE_NAME_SHORT: string,
            TABLE_NAME_LOWER: string,
            TABLE_NAME_UPPER: string,
            TABLE_NAME_PASCAL_CASE: string,
            TABLE_NAME_SHORT_PASCAL_CASE: string,
            TABLE_REFERENCED_BY?: {},
            TABLE_REFERENCES?: {},
            PRIMARY: string[],
            PRIMARY_SHORT: string[],
            COLUMNS: {},
            COLUMNS_UPPERCASE: {},
            TYPE_VALIDATION: {},
            REGEX_VALIDATION: {},
            HAS_GEOJSON_TYPES?: boolean,
        }
    } = {};

    let references: foreignKeyInfo[] = [];

    const normalizeSqlIdentifier = (identifier: string): string =>
        identifier.trim().replace(/^["`]|["`]$/g, '');

    const normalizeQualifiedSqlIdentifier = (identifier: string): string => {
        const parts = identifier
            .split('.')
            .map(part => normalizeSqlIdentifier(part))
            .filter(Boolean);

        return parts[parts.length - 1] || normalizeSqlIdentifier(identifier);
    };

    const normalizeSqlIdentifierList = (identifierList: string): string[] =>
        identifierList
            .split(',')
            .map(identifier => normalizeQualifiedSqlIdentifier(identifier.trim()))
            .filter(Boolean);

    const splitSqlDefinitionList = (definitionList: string): string[] => {
        const definitions: string[] = [];
        let current = '';
        let depth = 0;
        let quote: string | null = null;

        for (let i = 0; i < definitionList.length; i++) {
            const char = definitionList[i];
            const previous = definitionList[i - 1];

            if ((char === "'" || char === '"') && previous !== '\\') {
                quote = quote === char ? null : quote ?? char;
            }

            if (!quote) {
                if (char === '(') depth++;
                if (char === ')') depth = Math.max(0, depth - 1);
                if (char === ',' && depth === 0) {
                    if (current.trim()) definitions.push(current.trim());
                    current = '';
                    continue;
                }
            }

            current += char;
        }

        if (current.trim()) definitions.push(current.trim());
        return definitions;
    };

    const normalizePostgresColumnType = (rawType: string): { type: string; length: string } => {
        const cleanedType = rawType
            .replace(/\s+COLLATE\s+("[^"]+"|\S+)/i, '')
            .trim();
        const lengthMatch = cleanedType.match(/\(([^)]+)\)/);
        const length = lengthMatch ? lengthMatch[1] : '';
        const withoutLength = cleanedType.replace(/\(.+?\)/, '').toLowerCase().replace(/\s+/g, ' ').trim();

        if (withoutLength === 'character varying') return { type: 'varchar', length };
        if (withoutLength === 'character') return { type: 'char', length };
        if (withoutLength === 'timestamp without time zone' || withoutLength === 'timestamp with time zone') return { type: 'timestamp', length };
        if (withoutLength === 'time without time zone' || withoutLength === 'time with time zone') return { type: 'time', length };
        if (withoutLength === 'double precision') return { type: 'double', length };
        if (withoutLength === 'integer') return { type: 'int', length };

        return {
            type: withoutLength.split(' ')[0] || 'text',
            length,
        };
    };

    const postgresPrimaryKeysByTable = new Map<string, string[]>();
    const rememberPostgresPrimaryKeys = (tableName: string, columns: string[]) => {
        if (columns.length > 0) {
            postgresPrimaryKeysByTable.set(tableName, columns);
        }
    };

    const postgresIdentityColumns = new Set<string>();
    const postgresAlterIdentityRegex = /ALTER\s+TABLE\s+(?:ONLY\s+)?((?:"[^"]+"|[A-Za-z_][A-Za-z0-9_$]*)(?:\.(?:"[^"]+"|[A-Za-z_][A-Za-z0-9_$]*))?)\s+ALTER\s+COLUMN\s+("[^"]+"|[A-Za-z_][A-Za-z0-9_$]*)\s+ADD\s+GENERATED\s+(?:ALWAYS|BY\s+DEFAULT)\s+AS\s+IDENTITY/gim;
    let postgresAlterIdentityMatch: RegExpExecArray | null;
    while ((postgresAlterIdentityMatch = postgresAlterIdentityRegex.exec(sql))) {
        postgresIdentityColumns.add(
            `${normalizeQualifiedSqlIdentifier(postgresAlterIdentityMatch[1])}.${normalizeSqlIdentifier(postgresAlterIdentityMatch[2])}`,
        );
    }

    const postgresAlterPrimaryKeyRegex = /ALTER\s+TABLE\s+(?:ONLY\s+)?((?:"[^"]+"|[A-Za-z_][A-Za-z0-9_$]*)(?:\.(?:"[^"]+"|[A-Za-z_][A-Za-z0-9_$]*))?)\s+ADD\s+CONSTRAINT\s+(?:"[^"]+"|[A-Za-z_][A-Za-z0-9_$]*)\s+PRIMARY\s+KEY\s*\(([^)]+)\)/gim;
    let postgresAlterPrimaryKeyMatch: RegExpExecArray | null;
    while ((postgresAlterPrimaryKeyMatch = postgresAlterPrimaryKeyRegex.exec(sql))) {
        rememberPostgresPrimaryKeys(
            normalizeQualifiedSqlIdentifier(postgresAlterPrimaryKeyMatch[1]),
            normalizeSqlIdentifierList(postgresAlterPrimaryKeyMatch[2]),
        );
    }

    const postgresAlterForeignKeyRegex = /ALTER\s+TABLE\s+(?:ONLY\s+)?((?:"[^"]+"|[A-Za-z_][A-Za-z0-9_$]*)(?:\.(?:"[^"]+"|[A-Za-z_][A-Za-z0-9_$]*))?)\s+ADD\s+CONSTRAINT\s+("[^"]+"|[A-Za-z_][A-Za-z0-9_$]*)\s+FOREIGN\s+KEY\s*\(([^)]+)\)\s+REFERENCES\s+((?:"[^"]+"|[A-Za-z_][A-Za-z0-9_$]*)(?:\.(?:"[^"]+"|[A-Za-z_][A-Za-z0-9_$]*))?)\s*\(([^)]+)\)(?:\s+ON\s+DELETE\s+([A-Z ]+?))?(?:\s+ON\s+UPDATE\s+([A-Z ]+?))?(?:;|\s+NOT\s+VALID|\s*$)/gim;
    let postgresAlterForeignKeyMatch: RegExpExecArray | null;
    while ((postgresAlterForeignKeyMatch = postgresAlterForeignKeyRegex.exec(sql))) {
        const localColumns = normalizeSqlIdentifierList(postgresAlterForeignKeyMatch[3]);
        const foreignColumns = normalizeSqlIdentifierList(postgresAlterForeignKeyMatch[5]);

        localColumns.forEach((localColumn, index) => {
            references.push({
                TABLE: normalizeQualifiedSqlIdentifier(postgresAlterForeignKeyMatch![1]),
                CONSTRAINT: normalizeSqlIdentifier(postgresAlterForeignKeyMatch![2]),
                FOREIGN_KEY: localColumn,
                REFERENCES: `${normalizeQualifiedSqlIdentifier(postgresAlterForeignKeyMatch![4])}.${foreignColumns[index] ?? foreignColumns[0]}`,
                ON_DELETE: postgresAlterForeignKeyMatch![6]?.trim() || '',
                ON_UPDATE: postgresAlterForeignKeyMatch![7]?.trim() || '',
            });
        });
    }

    const columnInfoFromMetadata = (column: iSchemaColumnMetadata) => {
        const fullType = (column.COLUMN_TYPE || column.DATA_TYPE || 'text').trim();
        const enumMatch = /^enum\((.+)\)$/i.exec(fullType);
        const enumValues = enumMatch
            ? enumMatch[1]
                .split(/,(?=(?:[^']*'[^']*')*[^']*$)/)
                .map(s => s.trim().replace(/^'(.*)'$/, '$1'))
            : null;
        const type = fullType.replace(/\(.+?\)/, '').split(' ')[0].toLowerCase();
        const lengthMatch = fullType.match(/\(([^)]+)\)/);
        const length = lengthMatch ? lengthMatch[1] : '';

        return {
            type,
            length,
            srid: null,
            enumValues,
            notNull: column.IS_NULLABLE.toUpperCase() === 'NO',
            autoIncrement: column.EXTRA.toLowerCase().includes('auto_increment'),
            defaultValue: '',
        };
    };

    const fallbackColumnInfo = () => ({
        type: 'text',
        length: '',
        srid: null,
        enumValues: null,
        notNull: false,
        autoIncrement: false,
        defaultValue: '',
    });

    // @ts-ignore
    for (const tableMatch of tableMatches) {

        const tableName = tableMatch[1];
        const columnDefinitions = tableMatch[2];

        let columns = {};

        // Improved regular expression to match column definitions
        const columnRegex = /^\s*`([^`]+)`\s+((?:enum|set)\((?:'(?:[^']|\\')*'(?:,\s*'(?:[^']|\\')*')*)\)|[a-zA-Z0-9_]+(?:\s+unsigned)?(?:\(\d+(?:,\d+)?\))?)\s*(NOT NULL|NULL)?\s*(DEFAULT\s+(?:'[^']*'|[^\s,]+))?\s*(AUTO_INCREMENT)?/i;

        const columnDefinitionsLines = columnDefinitions.split('\n');

        columnDefinitionsLines.forEach(line => {
            if (!line.match(/(PRIMARY KEY|UNIQUE KEY|CONSTRAINT)/)) {
                const match = columnRegex.exec(line.trim());
                if (match) {
                    const [, name, fullTypeRaw, nullability, defaultRaw, autoInc] = match;

                    const fullType = fullTypeRaw.trim();
                    const enumMatch = /^enum\((.+)\)$/i.exec(fullType);
                    const enumValues = enumMatch
                        ? enumMatch[1]
                            .split(/,(?=(?:[^']*'[^']*')*[^']*$)/) // split only top-level commas
                            .map(s => s.trim().replace(/^'(.*)'$/, '$1'))
                        : null;
                    const type = fullType.replace(/\(.+?\)/, '').split(' ')[0].toLowerCase();
                    const lengthMatch = fullType.match(/\(([^)]+)\)/);
                    const length = lengthMatch ? lengthMatch[1] : '';

                    const sridMatch = line.match(/SRID\s+(\d+)/i);
                    const srid = sridMatch ? parseInt(sridMatch[1], 10) : null;

                    columns[name] = {
                        type,
                        length,
                        srid,
                        enumValues,
                        notNull: nullability?.toUpperCase() === 'NOT NULL',
                        autoIncrement: !!autoInc,
                        defaultValue: defaultRaw ? defaultRaw.replace(/^DEFAULT\s+/i, '') : ''
                    };
                }
            }
        });

        // Extract primary keys
        const primaryKeyMatch = columnDefinitions.match(/PRIMARY KEY \(([^)]+)\)/i);
        const primaryKeys = primaryKeyMatch
            ? primaryKeyMatch[1].split(',').map(key => key.trim().replace(/`/g, ''))
            : [];

        const primaryKeysType = primaryKeys.length > 0
            ? primaryKeys.map(pk => `'${pk}'`).join(' | ')
            : 'never';

        // Extract foreign keys
        const foreignKeyRegex: RegExp = /CONSTRAINT `([^`]+)` FOREIGN KEY \(`([^`]+)`\) REFERENCES `([^`]+)` \(`([^`]+)`\)( ON DELETE (\w+))?( ON UPDATE (\w+))?/g;
        let foreignKeyMatch: RegExpExecArray | null;


        while ((foreignKeyMatch = foreignKeyRegex.exec(columnDefinitions))) {
            const constraintName = foreignKeyMatch[1];
            const localColumn = foreignKeyMatch[2];
            const foreignTable = foreignKeyMatch[3];
            const foreignColumn = foreignKeyMatch[4];
            const onDeleteAction = foreignKeyMatch[6] || '';
            const onUpdateAction = foreignKeyMatch[8] || '';

            references.push({
                TABLE: tableName,
                CONSTRAINT: constraintName,
                FOREIGN_KEY: localColumn,
                REFERENCES: `${foreignTable}.${foreignColumn}`,
                ON_DELETE: onDeleteAction,
                ON_UPDATE: onUpdateAction
            });

        }

        let REACT_IMPORT: false | string = false, CARBON_REACT_INSTANCE: false | string = false;

        if (argMap['--react']) {

            const reactArgSplit = argMap['--react'].split(';')

            if (reactArgSplit.length !== 2) {
                console.error("React requires two arguments, the import and the carbon react instance statement. Example: --react 'import CustomCarbonReactApplication from \"src/CustomCarbonReactApplication.tsx\"; CustomCarbonReactApplication.instance'");
                process.exit(1);
            }

            [REACT_IMPORT, CARBON_REACT_INSTANCE] = reactArgSplit;

        }

        const tsModel = {
            RELATIVE_OUTPUT_DIR: pathRuntimeReference,
            TABLE_NAME: tableName,
            RELATION_TYPE: 'TABLE' as const,
            READ_ONLY: false,
            TABLE_DEFINITION: tableMatch[0].replace(/\/\*!([0-9]{5}) ([^*]+)\*\//g, (_match, _version, body) => {
                return `/!* ${body.trim()} *!/`;
            }),
            TABLE_CONSTRAINT: references,
            REST_URL_EXPRESSION: argMap['--restUrlExpression'] || '"/rest/"',
            TABLE_NAME_SHORT: tableName.replace(MySQLDump.DB_PREFIX, ''),
            TABLE_NAME_LOWER: tableName.toLowerCase(),
            TABLE_NAME_UPPER: tableName.toUpperCase(),
            TABLE_NAME_PASCAL_CASE: tableName.split('_').map(capitalizeFirstLetter).join('_'),
            TABLE_NAME_SHORT_PASCAL_CASE: tableName.replace(MySQLDump.DB_PREFIX, '').split('_').map(capitalizeFirstLetter).join('_'),
            PRIMARY: primaryKeys.map(pk => `${tableName}.${pk}`),
            PRIMARY_SHORT: primaryKeys,
            PRIMARY_KEYS_TYPE: primaryKeysType,
            COLUMNS: {},
            COLUMNS_UPPERCASE: {},
            TYPE_VALIDATION: {},
            REGEX_VALIDATION: {},
            TABLE_REFERENCES: {},
            TABLE_REFERENCED_BY: {},
            HAS_GEOJSON_TYPES: false,
            REACT_IMPORT: REACT_IMPORT,
            CARBON_REACT_INSTANCE: CARBON_REACT_INSTANCE,
        };

        for (const colName in columns) {

            tsModel.COLUMNS[`${tableName}.${colName}`] = colName;

            tsModel.COLUMNS_UPPERCASE[toConstantIdentifier(colName)] = tableName + '.' + colName;

            const typescript_type = determineTypeScriptType(columns[colName].type.toLowerCase(), columns[colName].enumValues)

            if (typescript_type.includes('GeoJSON.')) {
                tsModel.HAS_GEOJSON_TYPES = true;
            }

            tsModel.TYPE_VALIDATION[`${tableName}.${colName}`] = {
                COLUMN_NAME: colName,
                MYSQL_TYPE: columns[colName].type.toLowerCase(),
                TYPESCRIPT_TYPE: typescript_type,
                TYPESCRIPT_TYPE_IS_STRING: typescript_type === 'string' || typescript_type.includes("'"),
                TYPESCRIPT_TYPE_IS_NUMBER: 'number' === typescript_type,
                MAX_LENGTH: columns[colName].length,
                AUTO_INCREMENT: columns[colName].autoIncrement,
                NOT_NULL: columns[colName].notNull,
                SKIP_COLUMN_IN_POST: !columns[colName].notNull && !columns[colName].defaultValue,
            };

        }

        tableData[tableName] = tsModel;

    }

    const postgresTableMatches = sql.matchAll(/CREATE\s+TABLE\s+((?:"[^"]+"|[A-Za-z_][A-Za-z0-9_$]*)(?:\.(?:"[^"]+"|[A-Za-z_][A-Za-z0-9_$]*))?)\s*\(([\s\S]*?)\);/gim);

    for (const tableMatch of postgresTableMatches) {
        const tableName = normalizeQualifiedSqlIdentifier(tableMatch[1]);
        if (tableData[tableName]) continue;

        const columnDefinitions = tableMatch[2];
        const columns = {};

        for (const line of splitSqlDefinitionList(columnDefinitions)) {
            if (/^(CONSTRAINT|PRIMARY\s+KEY|FOREIGN\s+KEY|UNIQUE|CHECK|EXCLUDE)\b/i.test(line)) {
                const inlinePrimaryKeyMatch = line.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i);
                if (inlinePrimaryKeyMatch) {
                    rememberPostgresPrimaryKeys(tableName, normalizeSqlIdentifierList(inlinePrimaryKeyMatch[1]));
                }
                continue;
            }

            const match = line.match(/^\s*("[^"]+"|[A-Za-z_][A-Za-z0-9_$]*)\s+([\s\S]+?)\s*$/);
            if (!match) continue;

            const name = normalizeSqlIdentifier(match[1]);
            const rest = match[2].replace(/,$/, '').trim();
            const constraintMatch = rest.match(/\s+(?:CONSTRAINT\s+\S+\s+)?(?:NOT\s+NULL|NULL|DEFAULT\b|PRIMARY\s+KEY\b|REFERENCES\b|CHECK\b|GENERATED\b|COLLATE\b)/i);
            const fullTypeRaw = (constraintMatch ? rest.slice(0, constraintMatch.index) : rest).trim();
            const { type, length } = normalizePostgresColumnType(fullTypeRaw);
            const defaultMatch = rest.match(/\bDEFAULT\s+((?:'[^']*')|(?:"[^"]*")|[^,\s]+(?:\([^)]*\))?)/i);

            columns[name] = {
                type,
                length,
                srid: null,
                enumValues: null,
                notNull: /\bNOT\s+NULL\b/i.test(rest) || /\bPRIMARY\s+KEY\b/i.test(rest),
                autoIncrement: /^(?:serial|bigserial|smallserial)$/i.test(type)
                    || /\bnextval\s*\(/i.test(rest)
                    || /\bGENERATED\s+(?:ALWAYS|BY\s+DEFAULT)\s+AS\s+IDENTITY\b/i.test(rest)
                    || postgresIdentityColumns.has(`${tableName}.${name}`),
                defaultValue: defaultMatch ? defaultMatch[1] : '',
            };

            if (/\bPRIMARY\s+KEY\b/i.test(rest)) {
                rememberPostgresPrimaryKeys(tableName, [name]);
            }
        }

        const primaryKeys = postgresPrimaryKeysByTable.get(tableName) ?? [];
        const primaryKeysType = primaryKeys.length > 0
            ? primaryKeys.map(pk => `'${pk}'`).join(' | ')
            : 'never';

        let REACT_IMPORT: false | string = false, CARBON_REACT_INSTANCE: false | string = false;

        if (argMap['--react']) {
            const reactArgSplit = argMap['--react'].split(';')
            if (reactArgSplit.length !== 2) {
                console.error("React requires two arguments, the import and the carbon react instance statement. Example: --react 'import CustomCarbonReactApplication from \"src/CustomCarbonReactApplication.tsx\"; CustomCarbonReactApplication.instance'");
                process.exit(1);
            }
            [REACT_IMPORT, CARBON_REACT_INSTANCE] = reactArgSplit;
        }

        const tsModel = {
            RELATIVE_OUTPUT_DIR: pathRuntimeReference,
            TABLE_NAME: tableName,
            RELATION_TYPE: 'TABLE' as const,
            READ_ONLY: false,
            TABLE_DEFINITION: tableMatch[0].replace(/\*\//g, '* /'),
            TABLE_CONSTRAINT: references,
            REST_URL_EXPRESSION: argMap['--restUrlExpression'] || '"/rest/"',
            TABLE_NAME_SHORT: tableName.replace(MySQLDump.DB_PREFIX, ''),
            TABLE_NAME_LOWER: tableName.toLowerCase(),
            TABLE_NAME_UPPER: tableName.toUpperCase(),
            TABLE_NAME_PASCAL_CASE: tableName.split('_').map(capitalizeFirstLetter).join('_'),
            TABLE_NAME_SHORT_PASCAL_CASE: tableName.replace(MySQLDump.DB_PREFIX, '').split('_').map(capitalizeFirstLetter).join('_'),
            PRIMARY: primaryKeys.map(pk => `${tableName}.${pk}`),
            PRIMARY_SHORT: primaryKeys,
            PRIMARY_KEYS_TYPE: primaryKeysType,
            COLUMNS: {},
            COLUMNS_UPPERCASE: {},
            TYPE_VALIDATION: {},
            REGEX_VALIDATION: {},
            TABLE_REFERENCES: {},
            TABLE_REFERENCED_BY: {},
            HAS_GEOJSON_TYPES: false,
            REACT_IMPORT: REACT_IMPORT,
            CARBON_REACT_INSTANCE: CARBON_REACT_INSTANCE,
        };

        for (const colName in columns) {
            tsModel.COLUMNS[`${tableName}.${colName}`] = colName;
            tsModel.COLUMNS_UPPERCASE[toConstantIdentifier(colName)] = tableName + '.' + colName;

            const typescript_type = determineTypeScriptType(columns[colName].type.toLowerCase(), columns[colName].enumValues);

            if (typescript_type.includes('GeoJSON.')) {
                tsModel.HAS_GEOJSON_TYPES = true;
            }

            tsModel.TYPE_VALIDATION[`${tableName}.${colName}`] = {
                COLUMN_NAME: colName,
                MYSQL_TYPE: columns[colName].type.toLowerCase(),
                TYPESCRIPT_TYPE: typescript_type,
                TYPESCRIPT_TYPE_IS_STRING: typescript_type === 'string' || typescript_type.includes("'"),
                TYPESCRIPT_TYPE_IS_NUMBER: 'number' === typescript_type,
                MAX_LENGTH: columns[colName].length,
                AUTO_INCREMENT: columns[colName].autoIncrement,
                NOT_NULL: columns[colName].notNull,
                SKIP_COLUMN_IN_POST: !columns[colName].notNull && !columns[colName].defaultValue,
            };
        }

        tableData[tableName] = tsModel;
    }

    const viewDefinitions = new Map<string, string>();
    const viewColumnNamesFromDump = new Map<string, string[]>();
    const tempViewRegex = /\/\*!50001\s+CREATE\s+VIEW\s+(?:`[^`]+`\.)?`?(\w+)`?\s+AS\s+SELECT\s+([\s\S]*?)\*\/;/gim;
    const finalViewRegex = /\/\*!50001\s+VIEW\s+(?:`[^`]+`\.)?`?(\w+)`?\s+AS\s+([\s\S]*?)\s*\*\/;/gim;
    let tempViewMatch: RegExpExecArray | null;

    while ((tempViewMatch = tempViewRegex.exec(sql))) {
        const viewName = tempViewMatch[1];
        const selectDefinition = tempViewMatch[2];
        const aliases = Array.from(selectDefinition.matchAll(/\bAS\s+`([^`]+)`/gi))
            .map(match => match[1])
            .filter(Boolean);

        if (!viewColumnNamesFromDump.has(viewName)) {
            viewColumnNamesFromDump.set(viewName, aliases);
        }
    }

    let finalViewMatch: RegExpExecArray | null;
    while ((finalViewMatch = finalViewRegex.exec(sql))) {
        const viewName = finalViewMatch[1];
        const selectDefinition = finalViewMatch[2].trim().replace(/;\s*$/, '');
        viewDefinitions.set(viewName, `CREATE VIEW \`${viewName}\` AS ${selectDefinition};`);
    }

    const viewNames = new Set<string>([
        ...Object.entries(schemaMetadata)
            .filter(([, metadata]) => metadata.TABLE_TYPE.toUpperCase().includes('VIEW'))
            .map(([tableName]) => tableName),
        ...viewColumnNamesFromDump.keys(),
        ...viewDefinitions.keys(),
    ]);

    for (const viewName of viewNames) {
        if (tableData[viewName]) continue;

        const metadataColumns = schemaMetadata[viewName]?.COLUMNS ?? [];
        const dumpColumnNames = viewColumnNamesFromDump.get(viewName) ?? [];
        const columns = metadataColumns.length > 0
            ? Object.fromEntries(metadataColumns.map(column => [
                column.COLUMN_NAME,
                columnInfoFromMetadata(column),
            ]))
            : Object.fromEntries(dumpColumnNames.map(columnName => [
                columnName,
                fallbackColumnInfo(),
            ]));

        if (Object.keys(columns).length === 0) {
            continue;
        }

        const tsModel = {
            RELATIVE_OUTPUT_DIR: pathRuntimeReference,
            TABLE_NAME: viewName,
            RELATION_TYPE: 'VIEW' as const,
            READ_ONLY: true,
            TABLE_DEFINITION: (viewDefinitions.get(viewName) || `VIEW ${viewName}`).replace(/\*\//g, '* /'),
            TABLE_CONSTRAINT: {},
            REST_URL_EXPRESSION: argMap['--restUrlExpression'] || '"/rest/"',
            TABLE_NAME_SHORT: viewName.replace(MySQLDump.DB_PREFIX, ''),
            TABLE_NAME_LOWER: viewName.toLowerCase(),
            TABLE_NAME_UPPER: viewName.toUpperCase(),
            TABLE_NAME_PASCAL_CASE: viewName.split('_').map(capitalizeFirstLetter).join('_'),
            TABLE_NAME_SHORT_PASCAL_CASE: viewName.replace(MySQLDump.DB_PREFIX, '').split('_').map(capitalizeFirstLetter).join('_'),
            PRIMARY: [],
            PRIMARY_SHORT: [],
            PRIMARY_KEYS_TYPE: 'never',
            COLUMNS: {},
            COLUMNS_UPPERCASE: {},
            TYPE_VALIDATION: {},
            REGEX_VALIDATION: {},
            TABLE_REFERENCES: {},
            TABLE_REFERENCED_BY: {},
            HAS_GEOJSON_TYPES: false,
            REACT_IMPORT: false,
            CARBON_REACT_INSTANCE: false,
        };

        for (const colName in columns) {
            tsModel.COLUMNS[`${viewName}.${colName}`] = colName;
            tsModel.COLUMNS_UPPERCASE[toConstantIdentifier(colName)] = viewName + '.' + colName;

            const typescript_type = determineTypeScriptType(columns[colName].type.toLowerCase(), columns[colName].enumValues);

            if (typescript_type.includes('GeoJSON.')) {
                tsModel.HAS_GEOJSON_TYPES = true;
            }

            tsModel.TYPE_VALIDATION[`${viewName}.${colName}`] = {
                COLUMN_NAME: colName,
                MYSQL_TYPE: columns[colName].type.toLowerCase(),
                TYPESCRIPT_TYPE: typescript_type,
                TYPESCRIPT_TYPE_IS_STRING: typescript_type === 'string' || typescript_type.includes("'"),
                TYPESCRIPT_TYPE_IS_NUMBER: 'number' === typescript_type,
                MAX_LENGTH: columns[colName].length,
                AUTO_INCREMENT: false,
                NOT_NULL: columns[colName].notNull,
                SKIP_COLUMN_IN_POST: true,
            };
        }

        tableData[viewName] = tsModel;
    }

    for (const ref of references) {

        const foreignTable = ref.REFERENCES.split('.')[0];
        const foreignColumn = ref.REFERENCES.split('.')[1];
        const tableName = ref.TABLE;
        const columnName = ref.FOREIGN_KEY;
        const constraintName = ref.CONSTRAINT;

        if (!tableData[foreignTable]) {
            console.log(`Foreign table ${foreignTable} not found for ${ref.TABLE}.${ref.CONSTRAINT}`);
            continue;
        }

        if (!('TABLE_REFERENCED_BY' in tableData[foreignTable])) {
            tableData[foreignTable].TABLE_REFERENCED_BY = {};
        }

        // @ts-ignore
        if (!tableData[foreignTable].TABLE_REFERENCED_BY[foreignColumn]) {
            // @ts-ignore
            tableData[foreignTable].TABLE_REFERENCED_BY[foreignColumn] = [];
        }

        // @ts-ignore
        tableData[foreignTable].TABLE_REFERENCED_BY[foreignColumn].push({
            TABLE: tableName,
            COLUMN: columnName,
            CONSTRAINT: constraintName
        });

        if (!tableData[tableName].TABLE_REFERENCES) {
            tableData[tableName].TABLE_REFERENCES = {};
        }

        // @ts-ignore
        if (!tableData[tableName].TABLE_REFERENCES[columnName]) {
            // @ts-ignore
            tableData[tableName].TABLE_REFERENCES[columnName] = [];
        }

        // @ts-ignore
        tableData[tableName].TABLE_REFERENCES[columnName].push({
            TABLE: foreignTable,
            COLUMN: foreignColumn,
            CONSTRAINT: constraintName
        });

    }

    const relations = Object.values(tableData);
    const tables = relations.filter((table: any) => table.RELATION_TYPE !== 'VIEW');
    const views = relations.filter((table: any) => table.RELATION_TYPE === 'VIEW');


    return {
        C6VERSION: version,
        PREFIX: MySQLDump.DB_PREFIX,
        OBJECT_OVERRIDES: argMap['--objectOverrides'] || '',
        INTERFACE_OVERRIDES: argMap['--interfaceOverrides'] || '',
        CUSTOM_IMPORTS: argMap['--customImports'] || '',
        REST_URL_EXPRESSION: argMap['--restUrlExpression'] || '"/rest/"',
        TABLES: tables,
        VIEWS: views,
        RELATIONS: relations,
        RestTableNames: relations.map((table: any) => "'" + table.TABLE_NAME + "'").join('\n | '),
        RestShortTableNames: relations.map((table: any) => "'" + table.TABLE_NAME_SHORT + "'").join('\n | '),
        RestTableInterfaces: relations.map((table: any) => 'i' + table.TABLE_NAME_SHORT_PASCAL_CASE).join('\n | '),
        RestViewNames: views.length
            ? views.map((table: any) => "'" + table.TABLE_NAME + "'").join('\n | ')
            : 'never',
        RestShortViewNames: views.length
            ? views.map((table: any) => "'" + table.TABLE_NAME_SHORT + "'").join('\n | ')
            : 'never',
    };
};

const withScopedTableSymbols = (
    databaseDefinition: iScopedDatabaseDefinition,
    tables: any[],
) => tables.map((table) => ({
    ...table,
    SCOPED_TABLE_CONST: `${databaseDefinition.DATABASE_KEY_IDENTIFIER}_${table.TABLE_NAME_SHORT}`,
    SCOPED_BINDING_CONST: `${databaseDefinition.DATABASE_KEY_PASCAL_CASE}_${table.TABLE_NAME_SHORT_PASCAL_CASE}`,
}));

const prefixRelativeImportSpecifier = (
    specifier: string,
    prefix: string,
): string => {
    if (specifier.startsWith("./")) {
        return `${prefix}${specifier.slice(2)}`;
    }

    return `${prefix}${specifier}`;
};

const shiftCustomImports = (
    customImports: string,
    prefix: string,
): string =>
    customImports
        .replace(
            /(from\s*["'])(\.{1,2}\/[^"']+)(["'])/g,
            (_match, start, specifier, end) =>
                `${start}${prefixRelativeImportSpecifier(specifier, prefix)}${end}`,
        )
        .replace(
            /(import\s*["'])(\.{1,2}\/[^"']+)(["'])/g,
            (_match, start, specifier, end) =>
                `${start}${prefixRelativeImportSpecifier(specifier, prefix)}${end}`,
        );

const applyGeneratedModuleMetadata = (tableData: any) => {
    const customImports = tableData.CUSTOM_IMPORTS || "";

    tableData.CUSTOM_IMPORTS_GENERATED = shiftCustomImports(customImports, "../");
    tableData.CUSTOM_IMPORTS_TABLE = shiftCustomImports(customImports, "../../");

    for (const scopedDatabase of tableData.SCOPED_DATABASES || []) {
        scopedDatabase.OBJECT_OVERRIDES = tableData.OBJECT_OVERRIDES;
        scopedDatabase.CUSTOM_IMPORTS_GENERATED = tableData.CUSTOM_IMPORTS_GENERATED;
    }
};

const writeGeneratedBindings = (outputDir: string, tableData: any) => {
    const templatesDir = path.resolve(__dirname, 'assets/handlebars');
    const readTemplate = (templateName: string) =>
        fs.readFileSync(path.join(templatesDir, templateName), 'utf-8');

    const c6Template = Handlebars.compile(readTemplate('C6.ts.handlebars'));
    const c6CoreTemplate = Handlebars.compile(readTemplate('C6.core.ts.handlebars'));
    const c6ScopedTemplate = Handlebars.compile(readTemplate('C6.scoped.ts.handlebars'));
    const c6TableTemplate = Handlebars.compile(readTemplate('C6.table.ts.handlebars'));
    const c6ViewTemplate = Handlebars.compile(readTemplate('C6.view.ts.handlebars'));
    const c6TablesIndexTemplate = Handlebars.compile(readTemplate('C6.tablesIndex.ts.handlebars'));
    const c6ViewsIndexTemplate = Handlebars.compile(readTemplate('C6.viewsIndex.ts.handlebars'));
    const c6TestTemplate = Handlebars.compile(readTemplate('C6.test.ts.handlebars'));

    const generatedDir = path.join(outputDir, 'C6.generated');
    const tablesDir = path.join(generatedDir, 'tables');
    const viewsDir = path.join(generatedDir, 'views');

    fs.rmSync(generatedDir, { recursive: true, force: true });
    fs.rmSync(path.join(outputDir, 'C6.js'), { force: true });
    createDirIfNotExists(tablesDir);
    createDirIfNotExists(viewsDir);

    fs.writeFileSync(path.join(outputDir, 'C6.ts'), c6Template(tableData));
    fs.writeFileSync(path.join(outputDir, 'C6.test.ts'), c6TestTemplate(tableData));
    fs.writeFileSync(path.join(generatedDir, 'core.ts'), c6CoreTemplate(tableData));
    fs.writeFileSync(path.join(generatedDir, 'scoped.ts'), c6ScopedTemplate(tableData));
    fs.writeFileSync(path.join(tablesDir, 'index.ts'), c6TablesIndexTemplate(tableData));
    fs.writeFileSync(path.join(viewsDir, 'index.ts'), c6ViewsIndexTemplate(tableData));

    for (const table of tableData.TABLES) {
        fs.writeFileSync(
            path.join(tablesDir, `${table.TABLE_NAME_SHORT_PASCAL_CASE}.ts`),
            c6TableTemplate({
                ...tableData,
                ...table,
            }),
        );
    }

    for (const view of tableData.VIEWS) {
        fs.writeFileSync(
            path.join(viewsDir, `${view.TABLE_NAME_SHORT_PASCAL_CASE}.ts`),
            c6ViewTemplate({
                ...tableData,
                ...view,
            }),
        );
    }
};

const applyConfigDefaultsToArgs = (config: iGeneratorConfig) => {
    if (argMap['--prefix'] == null && typeof config.prefix === "string") {
        argMap['--prefix'] = config.prefix;
    }
    if (argMap['--output'] == null && typeof config.output === "string") {
        argMap['--output'] = config.output;
    }
    if (argMap['--restUrlExpression'] == null && typeof config.restUrlExpression === "string") {
        argMap['--restUrlExpression'] = config.restUrlExpression;
    }
    if (argMap['--objectOverrides'] == null && typeof config.objectOverrides === "string") {
        argMap['--objectOverrides'] = config.objectOverrides;
    }
    if (argMap['--interfaceOverrides'] == null && typeof config.interfaceOverrides === "string") {
        argMap['--interfaceOverrides'] = config.interfaceOverrides;
    }
    if (argMap['--customImports'] == null && typeof config.customImports === "string") {
        argMap['--customImports'] = config.customImports;
    }
    if (argMap['--react'] == null && typeof config.react === "string") {
        argMap['--react'] = config.react;
    }
};

const resolveConfigPathFromArgsOrDiscovery = async (): Promise<string> => {
    if (typeof argMap['--config'] === "string" && argMap['--config'].trim().length > 0) {
        const explicitPath = path.resolve(process.cwd(), argMap['--config']);
        if (!fs.existsSync(explicitPath)) {
            throw new Error(`Config not found at '${explicitPath}'.`);
        }
        return explicitPath;
    }

    const discovered = discoverConfigPath(process.cwd());
    if (discovered) {
        return discovered;
    }

    if (!process.stdin.isTTY || !process.stdout.isTTY) {
        throw new Error(
            "No config found. Pass --config <path> or create C6.config.json/C6.config.ts (or .C6.json/.C6.ts) in the current directory tree.",
        );
    }

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    try {
        const answer = (await askQuestion(rl, "No config found. Create ./C6.config.json now? (y/N): ")).toLowerCase();
        if (answer !== "y" && answer !== "yes") {
            throw new Error("Config is required. Generation cancelled.");
        }
    } finally {
        rl.close();
    }

    const generatedConfig = await buildConfigInteractively();
    const generatedPath = path.resolve(process.cwd(), "C6.config.json");
    fs.writeFileSync(generatedPath, `${JSON.stringify(generatedConfig, null, 2)}\n`);
    console.log(`[generateRestBindings] Created config at ${generatedPath}`);
    return generatedPath;
};

const getCurrentPackageName = (): string | null => {
    try {
        const packageJsonPath = path.resolve(process.cwd(), "package.json");
        if (!fs.existsSync(packageJsonPath)) {
            return null;
        }

        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
        return typeof packageJson.name === "string" ? packageJson.name : null;
    } catch {
        return null;
    }
};

const typeCheckGeneratedC6 = (outputDir: string) => {
    const c6Path = path.join(outputDir, "C6.ts");
    const tempTsConfigPath = path.join(outputDir, ".C6.generated-typecheck.tsconfig.json");
    const currentPackageName = getCurrentPackageName();
    const localSourceRoot = path.resolve(process.cwd(), "src");
    const compilerOptions: Record<string, any> = {
        target: "ES2020",
        module: "ES2020",
        moduleResolution: "node",
        esModuleInterop: true,
        resolveJsonModule: true,
        skipLibCheck: true,
        noEmit: true,
    };

    if (
        currentPackageName === "@carbonorm/carbonnode" &&
        fs.existsSync(path.join(localSourceRoot, "index.ts"))
    ) {
        compilerOptions.baseUrl = localSourceRoot;
        compilerOptions.paths = {
            "@carbonorm/carbonnode": ["."],
        };
    }

    fs.writeFileSync(
        tempTsConfigPath,
        `${JSON.stringify({
            compilerOptions,
            files: [c6Path],
        }, null, 2)}\n`,
    );

    try {
        execFileSync("npx", [
            "tsc",
            "--project",
            tempTsConfigPath,
        ], { encoding: "utf-8" });
    } finally {
        fs.rmSync(tempTsConfigPath, { force: true });
    }
};

const resolveScopedDefinitionsFromConfig = (
    config: iGeneratorConfig,
): { scopedDefinitions: iScopedDatabaseDefinition[]; primaryDefinition: iScopedDatabaseDefinition } => {
    const scopedDefinitions = buildScopedDefinitionsFromConfig(config);
    const requestedPrimaryAlias = typeof argMap['--primaryAlias'] === "string"
        ? argMap['--primaryAlias'].trim()
        : typeof config.primaryAlias === "string"
            ? config.primaryAlias.trim()
            : "";

    const primaryDefinition = requestedPrimaryAlias
        ? scopedDefinitions.find((definition) => definition.DATABASE_KEY === requestedPrimaryAlias)
        : scopedDefinitions[0];

    if (!primaryDefinition) {
        throw new Error(
            requestedPrimaryAlias
                ? `primaryAlias '${requestedPrimaryAlias}' was not found in config databases.`
                : "Config databases resolved to an empty target list.",
        );
    }

    return {
        scopedDefinitions,
        primaryDefinition,
    };
};

const main = async () => {
    const configPath = await resolveConfigPathFromArgsOrDiscovery();
    const config = await loadConfigFromPath(configPath);
    applyConfigDefaultsToArgs(config);

    const { scopedDefinitions, primaryDefinition } = resolveScopedDefinitionsFromConfig(config);

    MySQLDump.DB_USER = primaryDefinition.CONNECTION.user;
    MySQLDump.DB_PASS = primaryDefinition.CONNECTION.pass;
    MySQLDump.DB_HOST = primaryDefinition.CONNECTION.host;
    MySQLDump.DB_PORT = primaryDefinition.CONNECTION.port;
    MySQLDump.DB_NAME = primaryDefinition.DATABASE_NAME;
    MySQLDump.DB_PREFIX = argMap['--prefix'] || '';
    MySQLDump.RELATIVE_OUTPUT_DIR = argMap['--output'] || '/src';
    MySQLDump.OUTPUT_DIR = path.isAbsolute(MySQLDump.RELATIVE_OUTPUT_DIR)
        ? MySQLDump.RELATIVE_OUTPUT_DIR
        : path.join(process.cwd(), MySQLDump.RELATIVE_OUTPUT_DIR);

    createDirIfNotExists(MySQLDump.OUTPUT_DIR);
    pathRuntimeReference = MySQLDump.RELATIVE_OUTPUT_DIR.replace(/(^\/(src\/)?)|(\/+$)/g, '');

    const dumpFileLocation = primaryDefinition.DIALECT === 'postgresql'
        ? PostgreSQLDump.PgDump(
            'pg_dump',
            '',
            primaryDefinition.DATABASE_NAME,
            primaryDefinition.CONNECTION,
        )
        : MySQLDump.MySQLDump(
            'mysqldump',
            false,
            true,
            '',
            '',
            '',
            primaryDefinition.DATABASE_NAME,
            primaryDefinition.CONNECTION,
        );

    if (!fs.existsSync(dumpFileLocation)) {
        throw new Error(`[generateRestBindings] Missing base dump at ${dumpFileLocation}.`);
    }

    // use dumpFileLocation to get sql
    const sql = fs.readFileSync(dumpFileLocation, 'utf-8');
    const schemaMetadata = primaryDefinition.DIALECT === 'postgresql'
        ? PostgreSQLDump.LoadInformationSchema(
            primaryDefinition.DATABASE_NAME,
            primaryDefinition.CONNECTION,
        )
        : MySQLDump.LoadInformationSchema(
            primaryDefinition.DATABASE_NAME,
            primaryDefinition.CONNECTION,
        );
    const tableData: any = parseSQLToTypeScript(sql, schemaMetadata);

    const scopedDatabaseSchemas = scopedDefinitions.map((databaseDefinition) => {
        const isPrimaryScopedDefinition = databaseDefinition.DATABASE_NAME === primaryDefinition.DATABASE_NAME
            && databaseDefinition.CONNECTION.host === primaryDefinition.CONNECTION.host
            && databaseDefinition.CONNECTION.port === primaryDefinition.CONNECTION.port
            && databaseDefinition.CONNECTION.user === primaryDefinition.CONNECTION.user
            && databaseDefinition.CONNECTION.pass === primaryDefinition.CONNECTION.pass;

        if (isPrimaryScopedDefinition) {
            return {
                DATABASE_KEY: databaseDefinition.DATABASE_KEY,
                DATABASE_NAME: databaseDefinition.DATABASE_NAME,
                DATABASE_KEY_IDENTIFIER: databaseDefinition.DATABASE_KEY_IDENTIFIER,
                DATABASE_KEY_PASCAL_CASE: databaseDefinition.DATABASE_KEY_PASCAL_CASE,
                RELATIONS: withScopedTableSymbols(
                    databaseDefinition,
                    tableData.RELATIONS,
                ),
            };
        }

        const scopedDumpFile = path.join(
            MySQLDump.OUTPUT_DIR,
            databaseDefinition.DIALECT === 'postgresql'
                ? `C6.${databaseDefinition.DATABASE_KEY_IDENTIFIER}.pg_dump.sql`
                : `C6.${databaseDefinition.DATABASE_KEY_IDENTIFIER}.mysqldump.sql`,
        );
        const scopedDumpPath = databaseDefinition.DIALECT === 'postgresql'
            ? PostgreSQLDump.PgDump(
                'pg_dump',
                scopedDumpFile,
                databaseDefinition.DATABASE_NAME,
                databaseDefinition.CONNECTION,
            )
            : MySQLDump.MySQLDump(
                'mysqldump',
                false,
                true,
                scopedDumpFile,
                '',
                '',
                databaseDefinition.DATABASE_NAME,
                databaseDefinition.CONNECTION,
                databaseDefinition.DATABASE_KEY_IDENTIFIER,
            );

        if (!fs.existsSync(scopedDumpPath)) {
            throw new Error(
                `[generateRestBindings] Missing scoped dump for database key '${databaseDefinition.DATABASE_KEY}' at ${scopedDumpPath}.`,
            );
        }

        const scopedSql = fs.readFileSync(scopedDumpPath, 'utf-8');
        const scopedSchemaMetadata = databaseDefinition.DIALECT === 'postgresql'
            ? PostgreSQLDump.LoadInformationSchema(
                databaseDefinition.DATABASE_NAME,
                databaseDefinition.CONNECTION,
            )
            : MySQLDump.LoadInformationSchema(
                databaseDefinition.DATABASE_NAME,
                databaseDefinition.CONNECTION,
                databaseDefinition.DATABASE_KEY_IDENTIFIER,
            );
        const scopedTableData = parseSQLToTypeScript(scopedSql, scopedSchemaMetadata);

        return {
            DATABASE_KEY: databaseDefinition.DATABASE_KEY,
            DATABASE_NAME: databaseDefinition.DATABASE_NAME,
            DATABASE_KEY_IDENTIFIER: databaseDefinition.DATABASE_KEY_IDENTIFIER,
            DATABASE_KEY_PASCAL_CASE: databaseDefinition.DATABASE_KEY_PASCAL_CASE,
            RELATIONS: withScopedTableSymbols(
                databaseDefinition,
                scopedTableData.RELATIONS,
            ),
        };
    });

    tableData.SCOPED_DATABASES = scopedDatabaseSchemas;
    applyGeneratedModuleMetadata(tableData);

    // write to file
    fs.writeFileSync(path.join(MySQLDump.OUTPUT_DIR, 'C6.mysqldump.json'), JSON.stringify(tableData));

    const outputDir = MySQLDump.OUTPUT_DIR;
    writeGeneratedBindings(outputDir, tableData);

    // type-check generated TypeScript without writing parallel JavaScript artifacts
    if (process.env.C6_SKIP_GENERATED_TSC === "1") {
        console.log("[generateRestBindings] Skipping generated C6.ts type check (C6_SKIP_GENERATED_TSC=1).");
    } else {
        try {
            typeCheckGeneratedC6(outputDir);
        } catch (e) {
            console.warn('TypeScript type check for generated C6.ts reported errors:', e);
        }
    }

    console.log('Successfully created CarbonORM bindings!');
};

main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});
