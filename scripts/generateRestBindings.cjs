#!/usr/bin/env node
"use strict";
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
Object.defineProperty(exports, "__esModule", { value: true });
var execSync = require('child_process').execSync;
var fs = require('fs');
var path = require('path');
var Handlebars = require('handlebars');
var package_json_1 = require("../package.json");
var args = process.argv.slice(2); // Slice the first two elements
var argMap = {};
for (var i = 0; i < args.length; i += 2) {
    argMap[args[i]] = args[i + 1];
}
var createDirIfNotExists = function (dir) {
    return !fs.existsSync(dir) ? fs.mkdirSync(dir, { recursive: true }) : undefined;
};
var MySQLDump = /** @class */ (function () {
    function MySQLDump() {
    }
    MySQLDump.buildCNF = function (cnfFile) {
        if (cnfFile === void 0) { cnfFile = ''; }
        if (this.mysqlcnf !== '') {
            return this.mysqlcnf;
        }
        var cnf = [
            '[client]',
            "user = ".concat(this.DB_USER),
            "password = ".concat(this.DB_PASS),
            "host = ".concat(this.DB_HOST),
            "port = ".concat(this.DB_PORT),
            '',
        ];
        cnf.push("");
        if ('' === cnfFile) {
            cnfFile = path.join(process.cwd(), '/mysql.cnf');
        }
        try {
            fs.writeFileSync(cnfFile, cnf.join('\n'));
            fs.chmodSync(cnfFile, 488);
            console.log("Successfully created mysql.cnf file in (".concat(cnfFile, ")"));
        }
        catch (error) {
            console.error("Failed to store file contents of mysql.cnf in (".concat(process.cwd(), ")"), error);
            process.exit(1);
        }
        return (this.mysqlcnf = cnfFile);
    };
    MySQLDump.MySQLDump = function (mysqldump, data, schemas, outputFile, otherOption, specificTable) {
        if (mysqldump === void 0) { mysqldump = 'mysqldump'; }
        if (data === void 0) { data = false; }
        if (schemas === void 0) { schemas = true; }
        if (outputFile === void 0) { outputFile = ''; }
        if (otherOption === void 0) { otherOption = ''; }
        if (specificTable === void 0) { specificTable = ''; }
        if (outputFile === '') {
            outputFile = path.join(process.cwd(), 'mysqldump.sql');
        }
        if (!data && !schemas) {
            console.warn("MysqlDump is running with --no-create-info and --no-data. Why?");
        }
        var defaultsExtraFile = this.buildCNF();
        var hexBlobOption = data ? '--hex-blob ' : '--no-data ';
        var createInfoOption = schemas ? '' : ' --no-create-info ';
        var cmd = "".concat(mysqldump, " --defaults-extra-file=\"").concat(defaultsExtraFile, "\" ").concat(otherOption, " --skip-add-locks --single-transaction --quick ").concat(createInfoOption).concat(hexBlobOption).concat(this.DB_NAME, " ").concat(specificTable, " > '").concat(outputFile, "'");
        this.executeAndCheckStatus(cmd);
        return (this.mysqldump = outputFile);
    };
    MySQLDump.executeAndCheckStatus = function (command, exitOnFailure, output) {
        if (exitOnFailure === void 0) { exitOnFailure = true; }
        if (output === void 0) { output = []; }
        try {
            var stdout = execSync(command, { encoding: 'utf-8' });
            output.push(stdout);
        }
        catch (e) {
            console.log("Command output::", e);
            if (exitOnFailure) {
                process.exit(1);
            }
        }
    };
    MySQLDump.mysqlcnf = '';
    MySQLDump.mysqldump = '';
    MySQLDump.DB_USER = argMap['--user'] || 'root';
    MySQLDump.DB_PASS = argMap['--pass'] || 'password';
    MySQLDump.DB_HOST = argMap['--host'] || '127.0.0.1';
    MySQLDump.DB_PORT = argMap['--port'] || '3306';
    MySQLDump.DB_NAME = argMap['--dbname'] || 'assessorly';
    MySQLDump.DB_PREFIX = argMap['--prefix'] || 'carbon_';
    MySQLDump.RELATIVE_OUTPUT_DIR = argMap['--output'] || '/src/api/rest';
    MySQLDump.OUTPUT_DIR = path.join(process.cwd(), MySQLDump.RELATIVE_OUTPUT_DIR);
    return MySQLDump;
}());
createDirIfNotExists(MySQLDump.OUTPUT_DIR);
var pathRuntimeReference = MySQLDump.RELATIVE_OUTPUT_DIR.replace(/(^\/(src\/)?)|(\/+$)/g, '');
// Usage example
var dumpFileLocation = MySQLDump.MySQLDump();
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
function determineTypeScriptType(mysqlType, enumValues) {
    var baseType = mysqlType.toLowerCase().replace(/\(.+?\)/, '').split(' ')[0];
    if (baseType === 'enum' && Array.isArray(enumValues)) {
        return enumValues.map(function (val) { return "'".concat(val, "'"); }).join(' | ');
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
var parseSQLToTypeScript = function (sql) {
    var e_1, _a, e_2, _b;
    var tableMatches = sql.matchAll(/CREATE\s+TABLE\s+`?(\w+)`?\s+\(((.|\n)+?)\)\s*(ENGINE=.+?);/gm);
    var tableData = {};
    var references = [];
    var _loop_1 = function (tableMatch) {
        var _c;
        var tableName = tableMatch[1];
        var columnDefinitions = tableMatch[2];
        var columns = {};
        // Improved regular expression to match column definitions
        var columnRegex = /^\s*`([^`]+)`\s+((?:enum|set)\((?:'(?:[^']|\\')*'(?:,\s*'(?:[^']|\\')*')*)\)|[a-zA-Z0-9_]+(?:\s+unsigned)?(?:\(\d+(?:,\d+)?\))?)\s*(NOT NULL|NULL)?\s*(DEFAULT\s+(?:'[^']*'|[^\s,]+))?\s*(AUTO_INCREMENT)?/i;
        var columnDefinitionsLines = columnDefinitions.split('\n');
        columnDefinitionsLines.forEach(function (line) {
            if (!line.match(/(PRIMARY KEY|UNIQUE KEY|CONSTRAINT)/)) {
                var match = columnRegex.exec(line.trim());
                if (match) {
                    var _a = __read(match, 6), name_1 = _a[1], fullTypeRaw = _a[2], nullability = _a[3], defaultRaw = _a[4], autoInc = _a[5];
                    var fullType = fullTypeRaw.trim();
                    var enumMatch = /^enum\((.+)\)$/i.exec(fullType);
                    var enumValues = enumMatch
                        ? enumMatch[1]
                            .split(/,(?=(?:[^']*'[^']*')*[^']*$)/) // split only top-level commas
                            .map(function (s) { return s.trim().replace(/^'(.*)'$/, '$1'); })
                        : null;
                    var type = fullType.replace(/\(.+?\)/, '').split(' ')[0].toLowerCase();
                    var lengthMatch = fullType.match(/\(([^)]+)\)/);
                    var length_1 = lengthMatch ? lengthMatch[1] : '';
                    var sridMatch = line.match(/SRID\s+(\d+)/i);
                    var srid = sridMatch ? parseInt(sridMatch[1], 10) : null;
                    columns[name_1] = {
                        type: type,
                        length: length_1,
                        srid: srid,
                        enumValues: enumValues,
                        notNull: (nullability === null || nullability === void 0 ? void 0 : nullability.toUpperCase()) === 'NOT NULL',
                        autoIncrement: !!autoInc,
                        defaultValue: defaultRaw ? defaultRaw.replace(/^DEFAULT\s+/i, '') : ''
                    };
                }
            }
        });
        // Extract primary keys
        var primaryKeyMatch = columnDefinitions.match(/PRIMARY KEY \(([^)]+)\)/i);
        var primaryKeys = primaryKeyMatch
            ? primaryKeyMatch[1].split(',').map(function (key) { return key.trim().replace(/`/g, ''); })
            : [];
        // Extract foreign keys
        var foreignKeyRegex = /CONSTRAINT `([^`]+)` FOREIGN KEY \(`([^`]+)`\) REFERENCES `([^`]+)` \(`([^`]+)`\)( ON DELETE (\w+))?( ON UPDATE (\w+))?/g;
        var foreignKeyMatch = void 0;
        while ((foreignKeyMatch = foreignKeyRegex.exec(columnDefinitions))) {
            var constraintName = foreignKeyMatch[1];
            var localColumn = foreignKeyMatch[2];
            var foreignTable = foreignKeyMatch[3];
            var foreignColumn = foreignKeyMatch[4];
            var onDeleteAction = foreignKeyMatch[6] || '';
            var onUpdateAction = foreignKeyMatch[8] || '';
            references.push({
                TABLE: tableName,
                CONSTRAINT: constraintName,
                FOREIGN_KEY: localColumn,
                REFERENCES: "".concat(foreignTable, ".").concat(foreignColumn),
                ON_DELETE: onDeleteAction,
                ON_UPDATE: onUpdateAction
            });
        }
        var REACT_IMPORT = false, CARBON_REACT_INSTANCE = false;
        if (argMap['--react']) {
            var reactArgSplit = argMap['--react'].split(';');
            if (reactArgSplit.length !== 2) {
                console.error("React requires two arguments, the import and the carbon react instance statement. Example: --react 'import CustomCarbonReactApplication from \"src/CustomCarbonReactApplication.tsx\"; CustomCarbonReactApplication.instance'");
                process.exit(1);
            }
            _c = __read(reactArgSplit, 2), REACT_IMPORT = _c[0], CARBON_REACT_INSTANCE = _c[1];
        }
        var tsModel = {
            RELATIVE_OUTPUT_DIR: pathRuntimeReference,
            TABLE_NAME: tableName,
            TABLE_DEFINITION: tableMatch[0].replace(/\/\*!([0-9]{5}) ([^*]+)\*\//g, function (_match, _version, body) {
                return "/!* ".concat(body.trim(), " *!/");
            }),
            TABLE_CONSTRAINT: references,
            REST_URL_EXPRESSION: argMap['--restUrlExpression'] || '"/rest/"',
            TABLE_NAME_SHORT: tableName.replace(MySQLDump.DB_PREFIX, ''),
            TABLE_NAME_LOWER: tableName.toLowerCase(),
            TABLE_NAME_UPPER: tableName.toUpperCase(),
            TABLE_NAME_PASCAL_CASE: tableName.split('_').map(capitalizeFirstLetter).join('_'),
            TABLE_NAME_SHORT_PASCAL_CASE: tableName.replace(MySQLDump.DB_PREFIX, '').split('_').map(capitalizeFirstLetter).join('_'),
            PRIMARY: primaryKeys.map(function (pk) { return "".concat(tableName, ".").concat(pk); }),
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
        for (var colName in columns) {
            tsModel.COLUMNS["".concat(tableName, ".").concat(colName)] = colName;
            tsModel.COLUMNS_UPPERCASE[colName.toUpperCase()] = tableName + '.' + colName;
            var typescript_type = determineTypeScriptType(columns[colName].type.toLowerCase(), columns[colName].enumValues);
            tsModel.TYPE_VALIDATION["".concat(tableName, ".").concat(colName)] = {
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
    };
    try {
        // @ts-ignore
        for (var tableMatches_1 = __values(tableMatches), tableMatches_1_1 = tableMatches_1.next(); !tableMatches_1_1.done; tableMatches_1_1 = tableMatches_1.next()) {
            var tableMatch = tableMatches_1_1.value;
            _loop_1(tableMatch);
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (tableMatches_1_1 && !tableMatches_1_1.done && (_a = tableMatches_1.return)) _a.call(tableMatches_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    try {
        for (var references_1 = __values(references), references_1_1 = references_1.next(); !references_1_1.done; references_1_1 = references_1.next()) {
            var ref = references_1_1.value;
            var foreignTable = ref.REFERENCES.split('.')[0];
            var foreignColumn = ref.REFERENCES.split('.')[1];
            var tableName = ref.TABLE;
            var columnName = ref.FOREIGN_KEY;
            var constraintName = ref.CONSTRAINT;
            if (!tableData[foreignTable]) {
                console.log("Foreign table ".concat(foreignTable, " not found for ").concat(ref.TABLE, ".").concat(ref.CONSTRAINT));
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
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (references_1_1 && !references_1_1.done && (_b = references_1.return)) _b.call(references_1);
        }
        finally { if (e_2) throw e_2.error; }
    }
    var tables = Object.values(tableData);
    return {
        C6VERSION: package_json_1.version,
        PREFIX: MySQLDump.DB_PREFIX,
        TABLES: tables,
        RestTableNames: tables.map(function (table) { return "'" + table.TABLE_NAME + "'"; }).join('\n | '),
        RestShortTableNames: tables.map(function (table) { return "'" + table.TABLE_NAME_SHORT + "'"; }).join('\n | '),
        RestTableInterfaces: tables.map(function (table) { return 'i' + table.TABLE_NAME_SHORT_PASCAL_CASE; }).join('\n | '),
    };
};
// use dumpFileLocation to get sql
var sql = fs.readFileSync(dumpFileLocation, 'utf-8');
var tableData = parseSQLToTypeScript(sql);
// write to file
fs.writeFileSync(path.join(process.cwd(), 'C6MySqlDump.json'), JSON.stringify(tableData));
// import this file  src/assets/handlebars/C6.tsx.handlebars for a mustache template
var c6Template = fs.readFileSync(path.resolve(__dirname, 'assets/handlebars/C6.ts.handlebars'), 'utf-8');
var c6TestTemplate = fs.readFileSync(path.resolve(__dirname, 'assets/handlebars/C6.test.ts.handlebars'), 'utf-8');
fs.writeFileSync(path.join(MySQLDump.OUTPUT_DIR, 'C6.ts'), Handlebars.compile(c6Template)(tableData));
fs.writeFileSync(path.join(MySQLDump.OUTPUT_DIR, 'C6.test.ts'), Handlebars.compile(c6TestTemplate)(tableData));
console.log('Successfully created CarbonORM bindings!');
