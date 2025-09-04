![npm](https://img.shields.io/npm/v/%40carbonorm%2Fcarbonnode)
![License](https://img.shields.io/npm/l/%40carbonorm%2Fcarbonnode)
![Size](https://img.shields.io/github/languages/code-size/carbonorm/carbonnode)
![Documentation](https://img.shields.io/website?down_color=lightgrey&down_message=Offline&up_color=green&up_message=Online&url=https%3A%2F%2Fcarbonorm.dev)
![Monthly Downloads](https://img.shields.io/npm/dm/%40carbonorm%2Fcarbonnode)
![All Downloads](https://img.shields.io/npm/dt/%40carbonorm%2Fcarbonnode)
![Star](https://img.shields.io/github/stars/carbonorm/carbonnode?style=social)
[![Github Actions Test and Publish to NPM](https://github.com/CarbonORM/CarbonNode/actions/workflows/npm-publish-on-bump.yml/badge.svg)](https://github.com/CarbonORM/CarbonNode/actions/workflows/npm-publish-on-bump.yml)

# CarbonNode (Alpha Release)

CarbonNode is a part of the CarbonORM series. It is a NodeJS MySQL ORM that is designed to work with CarbonPHP. This langauge
will implement the same ORM as CarbonPHP, but will be written in Typescript. Currently only C6 enabled requests can be sent 
using the bindings. Receiving API requests and handling it appropriately is not yet implemented. This is scheduled for 
early 2024. This repository is in the early stages of development an any support is greatly appreciated.

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
```sql
--
-- Table structure for table `carbon_users`
--

DROP TABLE IF EXISTS `carbon_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `carbon_users` (
  `user_username` varchar(100) NOT NULL,
  `user_password` varchar(225) NOT NULL,
  `user_id` binary(16) NOT NULL,
  `user_type` varchar(20) NOT NULL DEFAULT 'Athlete',
  `user_sport` varchar(20) DEFAULT 'GOLF',
  `user_session_id` varchar(225) DEFAULT NULL,
  `user_facebook_id` varchar(225) DEFAULT NULL,
  `user_first_name` varchar(25) NOT NULL,
  `user_last_name` varchar(25) NOT NULL,
  `user_profile_pic` varchar(225) DEFAULT NULL,
  `user_profile_uri` varchar(225) DEFAULT NULL,
  `user_cover_photo` varchar(225) DEFAULT NULL,
  `user_birthday` varchar(9) DEFAULT NULL,
  `user_gender` varchar(25) DEFAULT NULL,
  `user_about_me` varchar(225) DEFAULT NULL,
  `user_rank` int DEFAULT '0',
  `user_email` varchar(50) NOT NULL,
  `user_email_code` varchar(225) DEFAULT NULL,
  `user_email_confirmed` tinyint DEFAULT '0' COMMENT 'need to change to enums, but no support in rest yet',
  `user_generated_string` varchar(200) DEFAULT NULL,
  `user_membership` int DEFAULT '0',
  `user_deactivated` tinyint DEFAULT '0',
  `user_last_login` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `user_ip` varchar(20) NOT NULL,
  `user_education_history` varchar(200) DEFAULT NULL,
  `user_location` varchar(20) DEFAULT NULL,
  `user_creation_date` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `carbon_users_user_username_uindex` (`user_username`),
  UNIQUE KEY `user_user_profile_uri_uindex` (`user_profile_uri`),
  UNIQUE KEY `carbon_users_user_facebook_id_uindex` (`user_facebook_id`),
  CONSTRAINT `user_entity_entity_pk_fk` FOREIGN KEY (`user_id`) REFERENCES `carbon_carbons` (`entity_pk`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;
```
3) **Profit**
  - C6 will produce 1-1 constants.
```typescript  
export interface iUsers {
    'user_username'?: string;
    'user_password'?: string;
    'user_id'?: string;
    'user_type'?: string;
    'user_sport'?: string | null;
    'user_session_id'?: string | null;
    'user_facebook_id'?: string | null;
    'user_first_name'?: string;
    'user_last_name'?: string;
    'user_profile_pic'?: string | null;
    'user_profile_uri'?: string | null;
    'user_cover_photo'?: string | null;
    'user_birthday'?: string | null;
    'user_gender'?: string | null;
    'user_about_me'?: string | null;
    'user_rank'?: number | null;
    'user_email'?: string;
    'user_email_code'?: string | null;
    'user_email_confirmed'?: number | null;
    'user_generated_string'?: string | null;
    'user_membership'?: number | null;
    'user_deactivated'?: number | null;
    'user_last_login'?: string;
    'user_ip'?: string;
    'user_education_history'?: string | null;
    'user_location'?: string | null;
    'user_creation_date'?: string | null;
}

interface iDefineUsers {
    'USER_USERNAME': string;
    'USER_PASSWORD': string;
    'USER_ID': string;
    'USER_TYPE': string;
    'USER_SPORT': string;
    'USER_SESSION_ID': string;
    'USER_FACEBOOK_ID': string;
    'USER_FIRST_NAME': string;
    'USER_LAST_NAME': string;
    'USER_PROFILE_PIC': string;
    'USER_PROFILE_URI': string;
    'USER_COVER_PHOTO': string;
    'USER_BIRTHDAY': string;
    'USER_GENDER': string;
    'USER_ABOUT_ME': string;
    'USER_RANK': string;
    'USER_EMAIL': string;
    'USER_EMAIL_CODE': string;
    'USER_EMAIL_CONFIRMED': string;
    'USER_GENERATED_STRING': string;
    'USER_MEMBERSHIP': string;
    'USER_DEACTIVATED': string;
    'USER_LAST_LOGIN': string;
    'USER_IP': string;
    'USER_EDUCATION_HISTORY': string;
    'USER_LOCATION': string;
    'USER_CREATION_DATE': string;
}

export const users: iC6RestfulModel<RestTableNames> & iDefineUsers = {
    TABLE_NAME: 'carbon_users',
    USER_USERNAME: 'carbon_users.user_username',
    USER_PASSWORD: 'carbon_users.user_password',
    USER_ID: 'carbon_users.user_id',
    USER_TYPE: 'carbon_users.user_type',
    USER_SPORT: 'carbon_users.user_sport',
    USER_SESSION_ID: 'carbon_users.user_session_id',
    USER_FACEBOOK_ID: 'carbon_users.user_facebook_id',
    USER_FIRST_NAME: 'carbon_users.user_first_name',
    USER_LAST_NAME: 'carbon_users.user_last_name',
    USER_PROFILE_PIC: 'carbon_users.user_profile_pic',
    USER_PROFILE_URI: 'carbon_users.user_profile_uri',
    USER_COVER_PHOTO: 'carbon_users.user_cover_photo',
    USER_BIRTHDAY: 'carbon_users.user_birthday',
    USER_GENDER: 'carbon_users.user_gender',
    USER_ABOUT_ME: 'carbon_users.user_about_me',
    USER_RANK: 'carbon_users.user_rank',
    USER_EMAIL: 'carbon_users.user_email',
    USER_EMAIL_CODE: 'carbon_users.user_email_code',
    USER_EMAIL_CONFIRMED: 'carbon_users.user_email_confirmed',
    USER_GENERATED_STRING: 'carbon_users.user_generated_string',
    USER_MEMBERSHIP: 'carbon_users.user_membership',
    USER_DEACTIVATED: 'carbon_users.user_deactivated',
    USER_LAST_LOGIN: 'carbon_users.user_last_login',
    USER_IP: 'carbon_users.user_ip',
    USER_EDUCATION_HISTORY: 'carbon_users.user_education_history',
    USER_LOCATION: 'carbon_users.user_location',
    USER_CREATION_DATE: 'carbon_users.user_creation_date',
    PRIMARY: [
        'carbon_users.user_id',
    ],
    PRIMARY_SHORT: [
        'user_id',
    ],
    COLUMNS: {
        'carbon_users.user_username': 'user_username',
        'carbon_users.user_password': 'user_password',
        'carbon_users.user_id': 'user_id',
        'carbon_users.user_type': 'user_type',
        'carbon_users.user_sport': 'user_sport',
        'carbon_users.user_session_id': 'user_session_id',
        'carbon_users.user_facebook_id': 'user_facebook_id',
        'carbon_users.user_first_name': 'user_first_name',
        'carbon_users.user_last_name': 'user_last_name',
        'carbon_users.user_profile_pic': 'user_profile_pic',
        'carbon_users.user_profile_uri': 'user_profile_uri',
        'carbon_users.user_cover_photo': 'user_cover_photo',
        'carbon_users.user_birthday': 'user_birthday',
        'carbon_users.user_gender': 'user_gender',
        'carbon_users.user_about_me': 'user_about_me',
        'carbon_users.user_rank': 'user_rank',
        'carbon_users.user_email': 'user_email',
        'carbon_users.user_email_code': 'user_email_code',
        'carbon_users.user_email_confirmed': 'user_email_confirmed',
        'carbon_users.user_generated_string': 'user_generated_string',
        'carbon_users.user_membership': 'user_membership',
        'carbon_users.user_deactivated': 'user_deactivated',
        'carbon_users.user_last_login': 'user_last_login',
        'carbon_users.user_ip': 'user_ip',
        'carbon_users.user_education_history': 'user_education_history',
        'carbon_users.user_location': 'user_location',
        'carbon_users.user_creation_date': 'user_creation_date',
    },
    TYPE_VALIDATION: {
        'carbon_users.user_username': {
            MYSQL_TYPE: 'varchar',
            MAX_LENGTH: '100',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'carbon_users.user_password': {
            MYSQL_TYPE: 'varchar',
            MAX_LENGTH: '225',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'carbon_users.user_id': {
            MYSQL_TYPE: 'binary',
            MAX_LENGTH: '16',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'carbon_users.user_type': {
            MYSQL_TYPE: 'varchar',
            MAX_LENGTH: '20',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'carbon_users.user_sport': {
            MYSQL_TYPE: 'varchar',
            MAX_LENGTH: '20',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'carbon_users.user_session_id': {
            MYSQL_TYPE: 'varchar',
            MAX_LENGTH: '225',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'carbon_users.user_facebook_id': {
            MYSQL_TYPE: 'varchar',
            MAX_LENGTH: '225',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'carbon_users.user_first_name': {
            MYSQL_TYPE: 'varchar',
            MAX_LENGTH: '25',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'carbon_users.user_last_name': {
            MYSQL_TYPE: 'varchar',
            MAX_LENGTH: '25',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'carbon_users.user_profile_pic': {
            MYSQL_TYPE: 'varchar',
            MAX_LENGTH: '225',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'carbon_users.user_profile_uri': {
            MYSQL_TYPE: 'varchar',
            MAX_LENGTH: '225',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'carbon_users.user_cover_photo': {
            MYSQL_TYPE: 'varchar',
            MAX_LENGTH: '225',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'carbon_users.user_birthday': {
            MYSQL_TYPE: 'varchar',
            MAX_LENGTH: '9',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'carbon_users.user_gender': {
            MYSQL_TYPE: 'varchar',
            MAX_LENGTH: '25',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'carbon_users.user_about_me': {
            MYSQL_TYPE: 'varchar',
            MAX_LENGTH: '225',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'carbon_users.user_rank': {
            MYSQL_TYPE: 'int',
            MAX_LENGTH: '',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'carbon_users.user_email': {
            MYSQL_TYPE: 'varchar',
            MAX_LENGTH: '50',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'carbon_users.user_email_code': {
            MYSQL_TYPE: 'varchar',
            MAX_LENGTH: '225',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'carbon_users.user_email_confirmed': {
            MYSQL_TYPE: 'tinyint',
            MAX_LENGTH: '',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'carbon_users.user_generated_string': {
            MYSQL_TYPE: 'varchar',
            MAX_LENGTH: '200',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'carbon_users.user_membership': {
            MYSQL_TYPE: 'int',
            MAX_LENGTH: '',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'carbon_users.user_deactivated': {
            MYSQL_TYPE: 'tinyint',
            MAX_LENGTH: '',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'carbon_users.user_last_login': {
            MYSQL_TYPE: 'datetime',
            MAX_LENGTH: '',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'carbon_users.user_ip': {
            MYSQL_TYPE: 'varchar',
            MAX_LENGTH: '20',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'carbon_users.user_education_history': {
            MYSQL_TYPE: 'varchar',
            MAX_LENGTH: '200',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'carbon_users.user_location': {
            MYSQL_TYPE: 'varchar',
            MAX_LENGTH: '20',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
        'carbon_users.user_creation_date': {
            MYSQL_TYPE: 'datetime',
            MAX_LENGTH: '',
            AUTO_INCREMENT: false,
            SKIP_COLUMN_IN_POST: false
        },
    },
    REGEX_VALIDATION: {
    },
    TABLE_REFERENCES: {
        'user_id': [{
            TABLE: 'carbon_carbons',
            COLUMN: 'entity_pk',
            CONSTRAINT: 'user_entity_entity_pk_fk',
        },],
    },
    TABLE_REFERENCED_BY: {
        
    }
}
```
  - A File named the pascal case formated table name will be created with bindings to query the middleware (backend langague) -> MySQL.
```typescript
import {AxiosResponse} from "axios";
import {
    iPostC6RestResponse,
    restRequest,
    GET,
    POST,
    PUT,
    DELETE,
    iDeleteC6RestResponse,
    iGetC6RestResponse,
    iPutC6RestResponse,
    removeInvalidKeys,
    iAPI,
    Modify
} from "@carbonorm/carbonnode";
import {deleteRestfulObjectArrays, updateRestfulObjectArrays} from "@carbonorm/carbonreact";
import {C6, iUsers, users, RestTableNames} from "./C6";

type GetCustomAndRequiredFields = {}

type GetRequestTableOverrides = {}

// required parameters, optional parameters, parameter type overrides, response, and table names
const Get = restRequest<GetCustomAndRequiredFields, iUsers, GetRequestTableOverrides, iGetC6RestResponse<iUsers>, RestTableNames>({
    C6: C6,
    tableName: users.TABLE_NAME,
    requestMethod: GET,
    queryCallback: (request) => {
        request.success ??= 'Successfully received users!'
        request.error ??= 'An unknown issue occurred creating the users!'
        return request
    },
    responseCallback: (response, _request) => {
        const responseData = response?.data?.rest;
        updateRestfulObjectArrays<iUsers>(Array.isArray(responseData) ? responseData : [responseData], "users", C6.users.PRIMARY_SHORT as (keyof iUsers)[])
    }
});

type PutCustomAndRequiredFields = {}

type PutRequestTableOverrides = {}

export function putStateUsers(response : AxiosResponse<iPutC6RestResponse<iUsers>>, request : iAPI<Modify<iUsers, PutRequestTableOverrides>> & PutCustomAndRequiredFields) {
    updateRestfulObjectArrays<iUsers>([
        removeInvalidKeys<iUsers>({
            ...request,
            ...response?.data?.rest,
        }, C6.TABLES)
    ], "users", users.PRIMARY_SHORT as (keyof iUsers)[])
}

const Put = restRequest<PutCustomAndRequiredFields, iUsers, PutRequestTableOverrides, iPutC6RestResponse<iUsers>, RestTableNames>({
    C6: C6,
    tableName: users.TABLE_NAME,
    requestMethod: PUT,
    queryCallback: (request) => {
        request.success ??= 'Successfully updated users data!'
        request.error ??= 'An unknown issue occurred updating the users data!'
        return request
    },
    responseCallback: putStateUsers
});

type PostCustomAndRequiredFields = {}

type PostRequestTableOverrides = {}

export function postStateUsers(response : AxiosResponse<iPostC6RestResponse<iUsers>>, request : iAPI<Modify<iUsers, PostRequestTableOverrides>> & PostCustomAndRequiredFields, id: string | number | boolean) {
    if ('number' === typeof id || 'string' === typeof id) {
        if (1 !== users.PRIMARY_SHORT.length) {
            console.error("C6 received unexpected result's given the primary key length");
        } else {
            request[users.PRIMARY_SHORT[0]] = id
        }
    }
    updateRestfulObjectArrays<iUsers>(
        undefined !== request.dataInsertMultipleRows
            ? request.dataInsertMultipleRows.map((request, index) => {
                return removeInvalidKeys<iUsers>({
                    ...request,
                    ...(index === 0 ? response?.data?.rest : {}),
                }, C6.TABLES)
            })
            : [
                removeInvalidKeys<iUsers>({
                    ...request,
                    ...response?.data?.rest,
                    }, C6.TABLES)
            ],
        "users",
        users.PRIMARY_SHORT as (keyof iUsers)[]
    )
}

const Post = restRequest<PostCustomAndRequiredFields, iUsers, PostRequestTableOverrides, iPostC6RestResponse<iUsers>, RestTableNames>({
    C6: C6,
    tableName: users.TABLE_NAME,
    requestMethod: POST,
    queryCallback: (request) => {
        request.success ??= 'Successfully created the users data!'
        request.error ??= 'An unknown issue occurred creating the users data!'
        return request
    },
    responseCallback: postStateUsers
});

type DeleteCustomAndRequiredFields = {}

type DeleteRequestTableOverrides = {}

export function deleteStateUsers(_response : AxiosResponse<iDeleteC6RestResponse<iUsers>>, request : iAPI<Modify<iUsers, DeleteRequestTableOverrides>> & DeleteCustomAndRequiredFields) {
    deleteRestfulObjectArrays<iUsers>([
        request
    ], "users", users.PRIMARY_SHORT as (keyof iUsers)[])
}

const Delete = restRequest<DeleteCustomAndRequiredFields, iUsers, DeleteRequestTableOverrides, iDeleteC6RestResponse<iUsers>, RestTableNames>({
    C6: C6,
    tableName: users.TABLE_NAME,
    requestMethod: DELETE,
    queryCallback: (request) => {
        request.success ??= 'Successfully removed the users data!'
        request.error ??= 'An unknown issue occurred removing the users data!'
        return request
    },
    responseCallback: deleteStateUsers
});

const Users = {
    // Export all GET, POST, PUT, DELETE functions for each table
    Get,
    Post,
    Put,
    Delete,
}

export default Users;
```




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

