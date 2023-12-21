![npm](https://img.shields.io/npm/v/%40carbonorm%2Fcarbonnode)
![GitHub Release](https://img.shields.io/github/v/release/carbonorm/carbonnode)
![License](https://img.shields.io/npm/l/%40carbonorm%2Fcarbonnode)
![Size](https://img.shields.io/github/languages/code-size/carbonorm/carbonnode)
![Documentation](https://img.shields.io/website?down_color=lightgrey&down_message=Offline&up_color=green&up_message=Online&url=https%3A%2F%2Fcarbonorm.dev)
![Monthly Downloads](https://img.shields.io/npm/dm/%40carbonorm%2Fcarbonnode)
![All Downloads](https://img.shields.io/npm/dt/%40carbonorm%2Fcarbonnode)
![Star](https://img.shields.io/github/stars/carbonorm/carbonnode?style=social)

# CarbonNode

CarbonNode is a part of the CarbonORM series. It is a NodeJS MySQL ORM that is designed to work with CarbonPHP. This langauge
will implement the same ORM as CarbonPHP, but will be written in Typescript. Currently only C6 enabled request can be sent 
using the bindings. Receiving API requests and handling it appropriately is not yet implemented. This is scheduled for 
early 2023. This repository is in the early stages of development an any support is greatly appreciated.

## Installation

CarbonNode is available on [NPM](https://www.npmjs.com/). You'll need to have [NodeJS](https://nodejs.org/en/) installed 
which comes prepackaged with npm (node package manager). 

```bash
npm install @carbonorm/carbonnode
```

## Generate Models

The command below will generate the models for the database. The models will be generated in the output directory. We do
recommend you keep this folder separate from other work. It is also best to track the output directory in your version 
control system. All arguments are optional. If you do not provide them the defaults will be used. The example arguments
below are the defaults.

```bash
npx generateRestBindings --user root --pass password --host 127.0.0.1 --port 3306 --dbname carbonPHP --prefix carbon_ --output /src/api/rest
```

You can view the [code generated](https://github.com/CarbonORM/CarbonORM.dev/blob/www/src/api/rest/Users.tsx) by 
[this command](https://github.com/CarbonORM/CarbonNode/blob/main/scripts/generateRestBindings.ts) in 
[this repository](git@github.com:CarbonORM/CarbonNode.git). We use [Handlebars templates](https://mustache.github.io/) 
to generate the code.

### Generated Tests

Tests are generated for each table in the database. The tests are generated in the same directory as the models. 
Our Jest tests are not designed to run immediately. You will need to edit the tests manually to change *xdescribe* with just
*describe*. Once a test does not have xdescribe it will no longer be updated with new generation changes.

Note - I prefer to keep tests nested in my IDE project viewer. See the documentation for 
[IntelliJ](https://www.jetbrains.com/help/idea/file-nesting-dialog.html) or 
[VSCode](https://code.visualstudio.com/updates/v1_67#_explorer-file-nesting).

### Templates

Three templates are used to generate the models. The output will be multiple files; two files for each table in the 
database consisting of your GET PUT POST and DELETE methods and a Jest test file, a C6.tsx file which contains all 
table information and TypeScript types, and finally a websocket file which contains references to methods that are 
generate. Here are the templates used to generate the code:

1) [C6.tsx.handlebars](https://github.com/CarbonORM/CarbonNode/blob/main/scripts/assets/handlebars/C6.tsx.handlebars)
2) [Table.tsx.handlebars](https://github.com/CarbonORM/CarbonNode/blob/main/scripts/assets/handlebars/Table.tsx.handlebars)
3) [Websocket.tsx.handlebars](https://github.com/CarbonORM/CarbonNode/blob/main/scripts/assets/handlebars/WsLiveUpdates.tsx.handlebars)


# Support and Issues

Any issues found should be reported on [GitHub](https://github.com/CarbonORM/CarbonNode/issues).

