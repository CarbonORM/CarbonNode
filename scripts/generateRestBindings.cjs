#!/usr/bin/env node
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
var execSync = require('child_process').execSync;
var fs = require('fs');
var path = require('path');
var Handlebars = require('handlebars');
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
        if (cnfFile === void 0) { cnfFile = null; }
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
        cnfFile !== null && cnfFile !== void 0 ? cnfFile : (cnfFile = path.join(process.cwd(), '/mysql.cnf'));
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
        if (mysqldump === void 0) { mysqldump = null; }
        if (data === void 0) { data = false; }
        if (schemas === void 0) { schemas = true; }
        if (outputFile === void 0) { outputFile = null; }
        if (otherOption === void 0) { otherOption = ''; }
        if (specificTable === void 0) { specificTable = null; }
        specificTable = specificTable || '';
        if (outputFile === null) {
            outputFile = path.join(process.cwd(), 'mysqldump.sql');
        }
        if (!data && !schemas) {
            console.warn("MysqlDump is running with --no-create-info and --no-data. Why?");
        }
        var defaultsExtraFile = this.buildCNF();
        var hexBlobOption = data ? '--hex-blob ' : '--no-data ';
        var createInfoOption = schemas ? '' : ' --no-create-info ';
        var cmd = "".concat(mysqldump || 'mysqldump', " --defaults-extra-file=\"").concat(defaultsExtraFile, "\" ").concat(otherOption, " --skip-add-locks --single-transaction --quick ").concat(createInfoOption).concat(hexBlobOption).concat(this.DB_NAME, " ").concat(specificTable, " > '").concat(outputFile, "'");
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
        catch (error) {
            console.log("The command >>  ".concat(command, " \n\t returned with a status code (").concat(error.status, "). Expecting 0 for success."));
            console.log("Command output::\t ".concat(error.stdout));
            if (exitOnFailure) {
                process.exit(error.status);
            }
        }
    };
    MySQLDump.mysqlcnf = '';
    MySQLDump.mysqldump = '';
    MySQLDump.DB_USER = argMap['--user'] || 'root';
    MySQLDump.DB_PASS = argMap['--pass'] || 'password';
    MySQLDump.DB_HOST = argMap['--host'] || '127.0.0.1';
    MySQLDump.DB_PORT = argMap['--port'] || '3306';
    MySQLDump.DB_NAME = argMap['--dbname'] || 'carbonPHP';
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
function determineTypeScriptType(mysqlType) {
    console.log(mysqlType);
    switch (mysqlType.toLowerCase()) {
        case 'varchar':
        case 'text':
        case 'char':
        case 'datetime':
        case 'timestamp':
        case 'date':
            return 'string';
        case 'int':
        case 'bigint':
        case 'smallint':
        case 'decimal':
        case 'float':
        case 'double':
        case 'tinyint':
            return 'number';
        case 'boolean':
            return 'boolean';
        case 'json':
            return 'any'; // or 'object' based on usage
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
        var tableName = tableMatch[1];
        var columnDefinitions = tableMatch[2];
        var columns = {};
        // Improved regular expression to match column definitions
        var columnRegex = /\s*`([^`]*)`\s+(\w+)(?:\(([^)]+)\))?\s*(NOT NULL)?\s*(AUTO_INCREMENT)?\s*(DEFAULT\s+'.*?'|DEFAULT\s+\S+)?/gm;
        var columnMatch;
        var columnDefinitionsLines = columnDefinitions.split('\n');
        columnDefinitionsLines.forEach(function (line) {
            if (!line.match(/(PRIMARY KEY|UNIQUE KEY|CONSTRAINT)/)) {
                while ((columnMatch = columnRegex.exec(line))) {
                    columns[columnMatch[1]] = {
                        type: columnMatch[2],
                        length: columnMatch[3] || '',
                        notNull: !!columnMatch[4],
                        autoIncrement: !!columnMatch[5],
                        defaultValue: columnMatch[6] ? columnMatch[6].replace(/^DEFAULT\s+/i, '') : ''
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
            var onDeleteAction = foreignKeyMatch[6] || null;
            var onUpdateAction = foreignKeyMatch[8] || null;
            references.push({
                TABLE: tableName,
                CONSTRAINT: constraintName,
                FOREIGN_KEY: localColumn,
                REFERENCES: "".concat(foreignTable, ".").concat(foreignColumn),
                ON_DELETE: onDeleteAction,
                ON_UPDATE: onUpdateAction
            });
        }
        var tsModel = {
            RELATIVE_OUTPUT_DIR: pathRuntimeReference,
            TABLE_NAME: tableName,
            TABLE_DEFINITION: tableMatch[0],
            TABLE_CONSTRAINT: references,
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
        };
        for (var colName in columns) {
            tsModel.COLUMNS["".concat(tableName, ".").concat(colName)] = colName;
            tsModel.COLUMNS_UPPERCASE[colName.toUpperCase()] = tableName + '.' + colName;
            var typescript_type = determineTypeScriptType(columns[colName].type.toLowerCase()) === "number" ? "number" : "string";
            tsModel.TYPE_VALIDATION["".concat(tableName, ".").concat(colName)] = {
                COLUMN_NAME: colName,
                MYSQL_TYPE: columns[colName].type.toLowerCase(),
                TYPESCRIPT_TYPE: typescript_type,
                TYPESCRIPT_TYPE_IS_STRING: 'string' === typescript_type,
                TYPESCRIPT_TYPE_IS_NUMBER: 'number' === typescript_type,
                MAX_LENGTH: columns[colName].length,
                AUTO_INCREMENT: columns[colName].autoIncrement,
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
            if (!tableData[foreignTable].TABLE_REFERENCED_BY) {
                tableData[foreignTable].TABLE_REFERENCED_BY = {};
            }
            if (!tableData[foreignTable].TABLE_REFERENCED_BY[foreignColumn]) {
                tableData[foreignTable].TABLE_REFERENCED_BY[foreignColumn] = [];
            }
            tableData[foreignTable].TABLE_REFERENCED_BY[foreignColumn].push({
                TABLE: tableName,
                COLUMN: columnName,
                CONSTRAINT: constraintName
            });
            if (!tableData[tableName].TABLE_REFERENCES) {
                tableData[tableName].TABLE_REFERENCES = {};
            }
            if (!tableData[tableName].TABLE_REFERENCES[columnName]) {
                tableData[tableName].TABLE_REFERENCES[columnName] = [];
            }
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
var c6Template = fs.readFileSync(path.resolve(__dirname, 'assets/handlebars/C6.tsx.handlebars'), 'utf-8');
fs.writeFileSync(path.join(MySQLDump.OUTPUT_DIR, 'C6.tsx'), Handlebars.compile(c6Template)(tableData));
var wsLiveUpdatesTemplate = fs.readFileSync(path.resolve(__dirname, 'assets/handlebars/WsLiveUpdates.tsx.handlebars'), 'utf-8');
fs.writeFileSync(path.join(MySQLDump.OUTPUT_DIR, 'WsLiveUpdates.tsx'), Handlebars.compile(wsLiveUpdatesTemplate)(tableData));
var template = fs.readFileSync(path.resolve(__dirname, 'assets/handlebars/Table.tsx.handlebars'), 'utf-8');
var testTemplate = fs.readFileSync(path.resolve(__dirname, 'assets/handlebars/Table.test.tsx.handlebars'), 'utf-8');
Object.values(tableData.TABLES).map(function (tableData, key) {
    var tableName = tableData.TABLE_NAME_SHORT_PASCAL_CASE;
    fs.writeFileSync(path.join(MySQLDump.OUTPUT_DIR, tableName + '.tsx'), Handlebars.compile(template)(tableData));
    fs.writeFileSync(path.join(MySQLDump.OUTPUT_DIR, tableName + '.test.tsx'), Handlebars.compile(testTemplate)(tableData));
});
console.log('Successfully created CarbonORM bindings!');
