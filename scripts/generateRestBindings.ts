const {execSync} = require('child_process');
const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');


const args = process.argv.slice(2);  // Slice the first two elements
const argMap = {};

for (let i = 0; i < args.length; i += 2) {
    argMap[args[i]] = args[i + 1];
}

class MySQLDump {

    static mysqlcnf: string = '';
    static mysqldump: string = '';
    static DB_USER = argMap['--user'] || 'root';
    static DB_PASS = argMap['--pass'] || 'password';
    static DB_HOST = argMap['--host'] || '127.0.0.1';
    static DB_PORT = argMap['--port'] || '3306';
    static DB_NAME = argMap['--dbname'] || 'carbonPHP';
    static DB_PREFIX = argMap['--prefix'] || 'carbon_';

    static buildCNF(cnfFile = null) {

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

        cnfFile ??= path.join(process.cwd(), '/mysql.cnf');

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

    static MySQLDump(mysqldump = null, data = false, schemas = true, outputFile = null, otherOption = '', specificTable = null) {
        specificTable = specificTable || '';

        if (outputFile === null) {
            outputFile = path.join(process.cwd(), 'mysqldump.sql');
        }

        if (!data && !schemas) {
            console.warn("MysqlDump is running with --no-create-info and --no-data. Why?");
        }

        const defaultsExtraFile = this.buildCNF();

        const hexBlobOption = data ? '--hex-blob ' : '--no-data ';

        const createInfoOption = schemas ? '' : ' --no-create-info ';

        const cmd = `${mysqldump || 'mysqldump'} --defaults-extra-file="${defaultsExtraFile}" ${otherOption} --skip-add-locks --single-transaction --quick ${createInfoOption}${hexBlobOption}${this.DB_NAME} ${specificTable} > '${outputFile}'`;

        this.executeAndCheckStatus(cmd);

        return (this.mysqldump = outputFile);

    }

    static executeAndCheckStatus(command, exitOnFailure = true, output = []) {

        try {

            const stdout = execSync(command, {encoding: 'utf-8'});

            output.push(stdout);

        } catch (error) {

            console.log(`The command >>  ${command} \n\t returned with a status code (${error.status}). Expecting 0 for success.`);

            console.log(`Command output::\t ${error.stdout}`);

            if (exitOnFailure) {

                process.exit(error.status);

            }

        }

    }

}


// Usage example
const dumpFileLocation = MySQLDump.MySQLDump();

type ColumnInfo = {
    type: string;
    length?: string;
    autoIncrement: boolean;
    notNull: boolean;
    defaultValue?: string;
};

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function determineTypeScriptType(mysqlType) {
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
            return 'number';
        case 'boolean':
        case 'tinyint(1)':
            return 'boolean';
        case 'json':
            return 'any';  // or 'object' based on usage
        default:
            return 'string';
    }
}


const parseSQLToTypeScript = (sql: string) => {

    const tableMatches = sql.matchAll(/CREATE\s+TABLE\s+`?(\w+)`?\s+\(((.|\n)+?)\)\s*(ENGINE=.+?);/gm);

    const tableData = [];

    // @ts-ignore
    for (const tableMatch of tableMatches) {

        const tableName = tableMatch[1];  // Previously tableMatch.groups.TableName

        const columnDefinitions = tableMatch[2];  // Previously tableMatch.groups.ColumnDefinitions

        let columns: any = {};

        const columnRegex: RegExp = /`(\w+)` (\w+)(?:\((\d+)\))?( NOT NULL)?( AUTO_INCREMENT)?(?: DEFAULT '(\w+)')?/g;

        let columnMatch: RegExpExecArray | null;

        while ((columnMatch = columnRegex.exec(columnDefinitions))) {

            columns[columnMatch[1]] = {
                type: columnMatch[2],
                length: columnMatch[3] || '',
                notNull: !!columnMatch[4],
                autoIncrement: !!columnMatch[5],
                defaultValue: columnMatch[6] || '',
            };

        }

        const primaryKeyMatch = columnDefinitions.match(/PRIMARY KEY \(([^)]+)\)/i);

        const primaryKeys = primaryKeyMatch
            ? primaryKeyMatch[1].split(',').map(key => key.trim().replace(/`/g, ''))
            : [];

        const tsModel = {
            TABLE_NAME: tableName,
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
        };

        for (const colName in columns) {

            tsModel.COLUMNS[`${tableName}.${colName}`] = colName;

            tsModel.COLUMNS_UPPERCASE[colName.toUpperCase()] = tableName + '.' + colName;

            tsModel.TYPE_VALIDATION[`${tableName}.${colName}`] = {
                COLUMN_NAME: colName,
                MYSQL_TYPE: columns[colName].type.toLowerCase(),
                TYPESCRIPT_TYPE: determineTypeScriptType(columns[colName].type.toLowerCase()) === "number" ? "number" : "string",
                MAX_LENGTH: columns[colName].length,
                AUTO_INCREMENT: columns[colName].autoIncrement,
                SKIP_COLUMN_IN_POST: !columns[colName].notNull && !columns[colName].defaultValue,
            };

        }

        tableData.push(tsModel);

    }

    return tableData;

};

// use dumpFileLocation to get sql
const sql = fs.readFileSync(dumpFileLocation, 'utf-8');

const tsModel = parseSQLToTypeScript(sql);

// write to file
fs.writeFileSync(path.join(process.cwd(), 'C6MySqlDump.json'), JSON.stringify(tsModel));


// import this file  src/assets/handlebars/C6.tsx.handlebars for a mustache template

const template = fs.readFileSync(path.resolve(__dirname, 'assets/handlebars/C6.tsx.handlebars'), 'utf-8');

fs.writeFileSync(path.join(process.cwd(), 'C6.tsx'), Handlebars.compile(template)({
    TABLES: tsModel,
    RestTableNames: tsModel.map(table => "'" + table.TABLE_NAME_PASCAL_CASE + "'").join('\n | '),
    RestShortTableNames: tsModel.map(table => "'" + table.TABLE_NAME_SHORT_PASCAL_CASE + "'").join('\n | '),
    RestTableInterfaces: tsModel.map(table => 'i' + table.TABLE_NAME_SHORT_PASCAL_CASE).join('\n | '),
}));

