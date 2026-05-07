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

type iScopedDatabaseAliasDefinition = {
    DATABASE_KEY: string;
    DATABASE_NAME: string;
    DATABASE_KEY_IDENTIFIER: string;
    DATABASE_KEY_PASCAL_CASE: string;
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
        const host = ensureString(entry.host, `databases[${baseAlias}].host`);
        const user = ensureString(entry.user, `databases[${baseAlias}].user`);
        const port = String(entry.port ?? "3306").trim();
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
            const host = ensureString(await askQuestion(rl, "Host (e.g. 127.0.0.1): "), "host");
            const port = (await askQuestion(rl, "Port (default 3306): ")) || "3306";
            const user = ensureString(await askQuestion(rl, "User: "), "user");
            const pass = ensureString(await askQuestion(rl, "Password: "), "pass");
            const dbnamesRaw = ensureString(
                await askQuestion(rl, "Schema names (comma-separated, e.g. app,billing): "),
                "dbnames",
            );

            databases.push({
                alias,
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
        case 'text':
        case 'tinytext':
        case 'mediumtext':
        case 'longtext':
        case 'set':
            return 'string';

        // Numeric
        case 'tinyint':
        case 'smallint':
        case 'mediumint':
        case 'int':
        case 'integer':
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

const parseSQLToTypeScript = (sql: string) => {

    const tableMatches = sql.matchAll(/CREATE\s+TABLE\s+`?(\w+)`?\s+\(((.|\n)+?)\)\s*(ENGINE=.+?);/gm);

    let tableData: {
        [TableName: string]: {
            RELATIVE_OUTPUT_DIR: string,
            TABLE_NAME: string,
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

            tsModel.COLUMNS_UPPERCASE[colName.toUpperCase()] = tableName + '.' + colName;

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

    const tables = Object.values(tableData);


    return {
        C6VERSION: version,
        PREFIX: MySQLDump.DB_PREFIX,
        OBJECT_OVERRIDES: argMap['--objectOverrides'] || '',
        INTERFACE_OVERRIDES: argMap['--interfaceOverrides'] || '',
        CUSTOM_IMPORTS: argMap['--customImports'] || '',
        REST_URL_EXPRESSION: argMap['--restUrlExpression'] || '"/rest/"',
        TABLES: tables,
        RestTableNames: tables.map(table => "'" + table.TABLE_NAME + "'").join('\n | '),
        RestShortTableNames: tables.map(table => "'" + table.TABLE_NAME_SHORT + "'").join('\n | '),
        RestTableInterfaces: tables.map(table => 'i' + table.TABLE_NAME_SHORT_PASCAL_CASE).join('\n | '),
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
    const c6TablesIndexTemplate = Handlebars.compile(readTemplate('C6.tablesIndex.ts.handlebars'));
    const c6TestTemplate = Handlebars.compile(readTemplate('C6.test.ts.handlebars'));

    const generatedDir = path.join(outputDir, 'C6.generated');
    const tablesDir = path.join(generatedDir, 'tables');

    fs.rmSync(generatedDir, { recursive: true, force: true });
    fs.rmSync(path.join(outputDir, 'C6.js'), { force: true });
    createDirIfNotExists(tablesDir);

    fs.writeFileSync(path.join(outputDir, 'C6.ts'), c6Template(tableData));
    fs.writeFileSync(path.join(outputDir, 'C6.test.ts'), c6TestTemplate(tableData));
    fs.writeFileSync(path.join(generatedDir, 'core.ts'), c6CoreTemplate(tableData));
    fs.writeFileSync(path.join(generatedDir, 'scoped.ts'), c6ScopedTemplate(tableData));
    fs.writeFileSync(path.join(tablesDir, 'index.ts'), c6TablesIndexTemplate(tableData));

    for (const table of tableData.TABLES) {
        fs.writeFileSync(
            path.join(tablesDir, `${table.TABLE_NAME_SHORT_PASCAL_CASE}.ts`),
            c6TableTemplate({
                ...tableData,
                ...table,
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

    const dumpFileLocation = MySQLDump.MySQLDump(
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
    const tableData: any = parseSQLToTypeScript(sql);

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
                TABLES: withScopedTableSymbols(
                    databaseDefinition,
                    tableData.TABLES,
                ),
            };
        }

        const scopedDumpFile = path.join(
            MySQLDump.OUTPUT_DIR,
            `C6.${databaseDefinition.DATABASE_KEY_IDENTIFIER}.mysqldump.sql`,
        );
        const scopedDumpPath = MySQLDump.MySQLDump(
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
        const scopedTableData = parseSQLToTypeScript(scopedSql);

        return {
            DATABASE_KEY: databaseDefinition.DATABASE_KEY,
            DATABASE_NAME: databaseDefinition.DATABASE_NAME,
            DATABASE_KEY_IDENTIFIER: databaseDefinition.DATABASE_KEY_IDENTIFIER,
            DATABASE_KEY_PASCAL_CASE: databaseDefinition.DATABASE_KEY_PASCAL_CASE,
            TABLES: withScopedTableSymbols(
                databaseDefinition,
                scopedTableData.TABLES,
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
            execFileSync("npx", [
                "tsc",
                path.join(outputDir, "C6.ts"),
                "--target",
                "ES2020",
                "--module",
                "ES2020",
                "--moduleResolution",
                "node",
                "--esModuleInterop",
                "--skipLibCheck",
                "--noEmit",
            ], { encoding: "utf-8" });
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
