#!/usr/bin/env node

const {execSync} = require('child_process');
const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');
import {version} from '../package.json';

const args = process.argv.slice(2);  // Slice the first two elements
const argMap = {};

for (let i = 0; i < args.length; i += 2) {
    argMap[args[i]] = args[i + 1];
}

const createDirIfNotExists = dir =>
    !fs.existsSync(dir) ? fs.mkdirSync(dir, {recursive: true}) : undefined;

class MySQLDump {

    static mysqlcnf: string = '';
    static mysqldump: string = '';
    static DB_USER = argMap['--user'] || 'root';
    static DB_PASS = argMap['--pass'] || 'password';
    static DB_HOST = argMap['--host'] || '127.0.0.1';
    static DB_PORT = argMap['--port'] || '3306';
    static DB_NAME = argMap['--dbname'] || 'assessorly';
    static DB_PREFIX = argMap['--prefix'] || 'carbon_';
    static RELATIVE_OUTPUT_DIR = argMap['--output'] || '/src/api/rest';
    static OUTPUT_DIR = path.join(process.cwd(), MySQLDump.RELATIVE_OUTPUT_DIR);

    static buildCNF(cnfFile: string = '') {

        if (this.mysqlcnf !== '') {

            return this.mysqlcnf;

        }

        const cnf = [
            '[client]',
            `user = ${this.DB_USER}`,
            `password = ${this.DB_PASS}`,
            `host = ${this.DB_HOST}`,
            `port = ${this.DB_PORT}`,
            '',
        ];

        cnf.push(``);

        if ('' === cnfFile) {

            cnfFile = path.join(process.cwd(), '/mysql.cnf');

        }

        try {

            fs.writeFileSync(cnfFile, cnf.join('\n'));

            fs.chmodSync(cnfFile, 0o750);

            console.log(`Successfully created mysql.cnf file in (${cnfFile})`);

        } catch (error) {

            console.error(`Failed to store file contents of mysql.cnf in (${process.cwd()})`, error);

            process.exit(1);

        }

        return (this.mysqlcnf = cnfFile);

    }

    static MySQLDump(mysqldump: string = 'mysqldump', data = false, schemas = true, outputFile = '', otherOption = '', specificTable: string = '') {

        if (outputFile === '') {
            outputFile = path.join(process.cwd(), 'mysqldump.sql');
        }

        if (!data && !schemas) {
            console.warn("MysqlDump is running with --no-create-info and --no-data. Why?");
        }

        const defaultsExtraFile = this.buildCNF();

        const hexBlobOption = data ? '--hex-blob ' : '--no-data ';

        const createInfoOption = schemas ? '' : ' --no-create-info ';

        const cmd = `${mysqldump} --defaults-extra-file="${defaultsExtraFile}" ${otherOption} --skip-add-locks --single-transaction --quick ${createInfoOption}${hexBlobOption}${this.DB_NAME} ${specificTable} > '${outputFile}'`;

        this.executeAndCheckStatus(cmd);

        return (this.mysqldump = outputFile);

    }

    static executeAndCheckStatus(command: string, exitOnFailure = true, output: any[] = []) {

        try {

            const stdout = execSync(command, {encoding: 'utf-8'});

            output.push(stdout);

        } catch (e) {

            console.log(`Command output::`, e);

            if (exitOnFailure) {

                process.exit(1);

            }


        }

    }

}

createDirIfNotExists(MySQLDump.OUTPUT_DIR)

const pathRuntimeReference = MySQLDump.RELATIVE_OUTPUT_DIR.replace(/(^\/(src\/)?)|(\/+$)/g, '')

// Usage example
const dumpFileLocation = MySQLDump.MySQLDump();

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
            return 'Date | string';

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
            return 'Buffer'; // todo - we should pass driver specific types here

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
                    const type = fullType.replace(/\(.+?\)/, '').split(' ')[0].toLowerCase();                    const lengthMatch = fullType.match(/\(([^)]+)\)/);
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

        let REACT_IMPORT: false|string = false, CARBON_REACT_INSTANCE : false|string = false;

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
            COLUMNS: {},
            COLUMNS_UPPERCASE: {},
            TYPE_VALIDATION: {},
            REGEX_VALIDATION: {},
            TABLE_REFERENCES: {},
            TABLE_REFERENCED_BY: {},
            REACT_IMPORT: REACT_IMPORT,
            CARBON_REACT_INSTANCE: CARBON_REACT_INSTANCE,
        };

        for (const colName in columns) {

            tsModel.COLUMNS[`${tableName}.${colName}`] = colName;

            tsModel.COLUMNS_UPPERCASE[colName.toUpperCase()] = tableName + '.' + colName;

            const typescript_type = determineTypeScriptType(columns[colName].type.toLowerCase(), columns[colName].enumValues)

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
        REST_URL_EXPRESSION: argMap['--restUrlExpression'] || '"/rest/"',
        TABLES: tables,
        RestTableNames: tables.map(table => "'" + table.TABLE_NAME + "'").join('\n | '),
        RestShortTableNames: tables.map(table => "'" + table.TABLE_NAME_SHORT + "'").join('\n | '),
        RestTableInterfaces: tables.map(table => 'i' + table.TABLE_NAME_SHORT_PASCAL_CASE).join('\n | '),
    };
};


// use dumpFileLocation to get sql
const sql = fs.readFileSync(dumpFileLocation, 'utf-8');

const tableData = parseSQLToTypeScript(sql);

// write to file
fs.writeFileSync(path.join(process.cwd(), 'C6MySqlDump.json'), JSON.stringify(tableData));

// import this file  src/assets/handlebars/C6.tsx.handlebars for a mustache template
const c6Template = fs.readFileSync(path.resolve(__dirname, 'assets/handlebars/C6.ts.handlebars'), 'utf-8');
const c6TestTemplate = fs.readFileSync(path.resolve(__dirname, 'assets/handlebars/C6.test.ts.handlebars'), 'utf-8');

fs.writeFileSync(path.join(MySQLDump.OUTPUT_DIR, 'C6.ts'), Handlebars.compile(c6Template)(tableData));
fs.writeFileSync(path.join(MySQLDump.OUTPUT_DIR, 'C6.test.ts'), Handlebars.compile(c6TestTemplate)(tableData));

console.log('Successfully created CarbonORM bindings!')
