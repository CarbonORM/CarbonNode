![npm](https://img.shields.io/npm/v/%40carbonorm%2Fcarbonnode)
![License](https://img.shields.io/npm/l/%40carbonorm%2Fcarbonnode)
![Size](https://img.shields.io/github/languages/code-size/carbonorm/carbonnode)
![Documentation](https://img.shields.io/website?down_color=lightgrey&down_message=Offline&up_color=green&up_message=Online&url=https%3A%2F%2Fcarbonorm.dev)
![Monthly Downloads](https://img.shields.io/npm/dm/%40carbonorm%2Fcarbonnode)
![All Downloads](https://img.shields.io/npm/dt/%40carbonorm%2Fcarbonnode)
![Star](https://img.shields.io/github/stars/carbonorm/carbonnode?style=social)
[![Github Actions Test and Publish to NPM](https://github.com/CarbonORM/CarbonNode/actions/workflows/npm-publish-on-bump.yml/badge.svg)](https://github.com/CarbonORM/CarbonNode/actions/workflows/npm-publish-on-bump.yml)

# CarbonNode

CarbonNode is a part of the CarbonORM series. It is a NodeJS MySQL ORM that can run independently in the backend or paired with 
CarbonReact for 1=1 syntax. Note the CarbonNode + CarbonReact experience is unmatched in interoperability.

# Purpose

CarbonNode is designed to generate RESTful API bindings for a MySQL database. The generated code provides a simple and
consistent interface for performing CRUD operations on the database tables. The goal is to reduce the amount of boilerplate
code needed to interact with the database and to provide a more efficient and reliable way to work with MySQL data in a NodeJS
environment. The major goals:
- Allow a 1-1 interoperability when querying data from the frontend to the backend. 
- Language based Objects/Arrays for representing and modifying queries to eliminate string manipulation operations.
- Explicit column references to allow for easier refactoring and code completion in IDEs. 
  - Selecting a dead column will result in a compile time error instead of a runtime error.
- TypeScript types generated for each table in the database.
- Lifecycle hooks for each CRUD operation to allow for custom logic to be executed before and after the operation.
- Validation of data types and formats before executing CRUD operations to ensure data integrity.

It's easier to scale your middleware than your database. 
CarbonNode aims to capture issues before they reach your database.


## Alpha Release

This is an alpha release. The code is not yet ready for production. We are looking for feedback on the API and any bugs.
Some features are not yet implemented. We are working on the documentation and will be adding more examples. Please 
check out [any issue](https://github.com/CarbonORM/CarbonWordPress/issues) we have open and feel free to contribute.

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

1) [C6.ts.handlebars](https://github.com/CarbonORM/CarbonNode/blob/main/scripts/assets/handlebars/C6.ts.handlebars)
2) [Table.ts.handlebars](https://github.com/CarbonORM/CarbonNode/blob/main/scripts/assets/handlebars/Table.ts.handlebars)
3) [Websocket.ts.handlebars](https://github.com/CarbonORM/CarbonNode/blob/main/scripts/assets/handlebars/C6RestApi.ts.handlebars)

#### Generation Example

0) **npx generateRestBindings** is executed.
1) **The MySQL dump tool** outputs a strcture for every table.

```mysql
CREATE TABLE actor (
  actor_id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  first_name VARCHAR(45) NOT NULL,
  last_name VARCHAR(45) NOT NULL,
  last_update TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY  (actor_id),
  KEY idx_actor_last_name (last_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

```typescript
export interface iActor {
    'actor_id'?: number;
    'first_name'?: string;
    'last_name'?: string;
    'last_update'?: Date | number | string;
}

export type ActorPrimaryKeys =
    'actor_id'
    ;

const actor:
    C6RestfulModel<
        'actor',
        iActor,
        ActorPrimaryKeys
    > = {
    TABLE_NAME: 'actor',
    ACTOR_ID: 'actor.actor_id',
    FIRST_NAME: 'actor.first_name',
    LAST_NAME: 'actor.last_name',
    LAST_UPDATE: 'actor.last_update',
    PRIMARY: [
        'actor.actor_id',
    ],
    PRIMARY_SHORT: [
        'actor_id',
    ],
    COLUMNS: {
        'actor.actor_id': 'actor_id',
        'actor.first_name': 'first_name',
        'actor.last_name': 'last_name',
        'actor.last_update': 'last_update',
    },
    TYPE_VALIDATION: {
        'actor.actor_id': {
            MYSQL_TYPE: 'smallint',
            MAX_LENGTH: '',
            AUTO_INCREMENT: true,
            SKIP_COLUMN_IN_POST: false
        },
        'actor.first_name': {
            MYSQL_TYPE: 'varchar',
            MAX_LENGTH: '45',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'actor.last_name': {
            MYSQL_TYPE: 'varchar',
            MAX_LENGTH: '45',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'actor.last_update': {
            MYSQL_TYPE: 'timestamp',
            MAX_LENGTH: '',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
    },
    REGEX_VALIDATION: {
    },
    LIFECYCLE_HOOKS: {
        GET: {beforeProcessing:{}, beforeExecution:{}, afterExecution:{}, afterCommit:{}},
        PUT: {beforeProcessing:{}, beforeExecution:{}, afterExecution:{}, afterCommit:{}},
        POST: {beforeProcessing:{}, beforeExecution:{}, afterExecution:{}, afterCommit:{}},
        DELETE: {beforeProcessing:{}, beforeExecution:{}, afterExecution:{}, afterCommit:{}},
    },
    TABLE_REFERENCES: {

    },
    TABLE_REFERENCED_BY: {
        'actor_id': [{
            TABLE: 'film_actor',
            COLUMN: 'actor_id',
            CONSTRAINT: 'fk_film_actor_actor',
        },],
    }
}

export const Actor = {
    ...actor,
    ...restOrm<
        OrmGenerics<any, 'actor', iActor, ActorPrimaryKeys>
    >(() => ({
        ...GLOBAL_REST_PARAMETERS,
        restModel: actor
    }))
}
```

3) **Profit**
- C6 will produce 1-1 constants.

Allowing you to do:

```typescript
import { Actor, C6C } from "./api/rest/Actor";

// GET
const actors = await Actor.GET({
    [C6C.SELECT]: [
        Actor.ACTOR_ID,
        Actor.FIRST_NAME,
        Actor.LAST_NAME,
    ],
    [C6C.WHERE]: {
        [Actor.LAST_NAME]: { like: "%PITT%" },
    },
    [C6C.LIMIT]: 10,
});

// POST
await Actor.POST({
    [C6C.DATA]: {
        [Actor.FIRST_NAME]: "Brad",
        [Actor.LAST_NAME]: "Pitt",
    },
});

// PUT
await Actor.PUT({
    [C6C.WHERE]: {
        [Actor.ACTOR_ID]: 42,
    },
    [C6C.DATA]: {
        [Actor.LAST_NAME]: "Updated",
    },
});

// DELETE
await Actor.DELETE({
    [C6C.WHERE]: {
        [Actor.ACTOR_ID]: 42,
    },
});
```

Our CarbonReact extends this solution for automatic state and pagination management.


# Git Hooks

This project uses Git hooks to automate certain tasks:

- **post-commit**: Builds the project before pushing to ensure only working code is pushed
- **post-push**: Automatically publishes to npm when the version number changes

To set up the Git hooks, run:

```bash
npm run hooks:setup
```

This will configure Git to use the hooks in the `.githooks` directory. The hooks are automatically set up when you run `npm install` as well.

# Support and Issues

Any issues found should be reported on [GitHub](https://github.com/CarbonORM/CarbonNode/issues).

