// noinspection JSUnusedGlobalSymbols,SpellCheckingInspection

import {
    C6Constants,
    restRequest,
    restOrm,
} from "@carbonorm/carbonnode";
import type {
    iC6Object,
} from "@carbonorm/carbonnode";
import {
    GLOBAL_REST_PARAMETERS,
    RestTablePrefix,
} from "./core";

export const SCOPED_C6_BY_DATABASE: Record<string, iC6Object<any>> = {
    'sakila': (() => {
        const sakila_actor: Record<string, any> & {
            TABLE_NAME: string;
            RELATION_TYPE: 'TABLE' | 'VIEW';
            READ_ONLY: boolean;
        } = {
            TABLE_NAME: 'actor',
            RELATION_TYPE: 'TABLE',
            READ_ONLY: false,
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
        };
        const sakila_address: Record<string, any> & {
            TABLE_NAME: string;
            RELATION_TYPE: 'TABLE' | 'VIEW';
            READ_ONLY: boolean;
        } = {
            TABLE_NAME: 'address',
            RELATION_TYPE: 'TABLE',
            READ_ONLY: false,
            ADDRESS_ID: 'address.address_id',
            ADDRESS: 'address.address',
            ADDRESS2: 'address.address2',
            DISTRICT: 'address.district',
            CITY_ID: 'address.city_id',
            POSTAL_CODE: 'address.postal_code',
            PHONE: 'address.phone',
            LOCATION: 'address.location',
            LAST_UPDATE: 'address.last_update',
            PRIMARY: [
                'address.address_id',
            ],
            PRIMARY_SHORT: [
                'address_id',
            ],
            COLUMNS: {
                'address.address_id': 'address_id',
                'address.address': 'address',
                'address.address2': 'address2',
                'address.district': 'district',
                'address.city_id': 'city_id',
                'address.postal_code': 'postal_code',
                'address.phone': 'phone',
                'address.location': 'location',
                'address.last_update': 'last_update',
            },
            TYPE_VALIDATION: {
                'address.address_id': {
                    MYSQL_TYPE: 'smallint',
                    MAX_LENGTH: '',
                    AUTO_INCREMENT: true,
                    SKIP_COLUMN_IN_POST: false
                },
                'address.address': {
                    MYSQL_TYPE: 'varchar',
                    MAX_LENGTH: '50',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: false
                },
                'address.address2': {
                    MYSQL_TYPE: 'varchar',
                    MAX_LENGTH: '50',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: false
                },
                'address.district': {
                    MYSQL_TYPE: 'varchar',
                    MAX_LENGTH: '20',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: false
                },
                'address.city_id': {
                    MYSQL_TYPE: 'smallint',
                    MAX_LENGTH: '',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: false
                },
                'address.postal_code': {
                    MYSQL_TYPE: 'varchar',
                    MAX_LENGTH: '10',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: false
                },
                'address.phone': {
                    MYSQL_TYPE: 'varchar',
                    MAX_LENGTH: '20',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: false
                },
                'address.location': {
                    MYSQL_TYPE: 'geometry',
                    MAX_LENGTH: '',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: false
                },
                'address.last_update': {
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
                'city_id': [{
                    TABLE: 'city',
                    COLUMN: 'city_id',
                    CONSTRAINT: 'fk_address_city',
                },],
            },
            TABLE_REFERENCED_BY: {
                'address_id': [{
                    TABLE: 'customer',
                    COLUMN: 'address_id',
                    CONSTRAINT: 'fk_customer_address',
                },{
                    TABLE: 'staff',
                    COLUMN: 'address_id',
                    CONSTRAINT: 'fk_staff_address',
                },{
                    TABLE: 'store',
                    COLUMN: 'address_id',
                    CONSTRAINT: 'fk_store_address',
                },],
            }
        };
        const sakila_binary_test: Record<string, any> & {
            TABLE_NAME: string;
            RELATION_TYPE: 'TABLE' | 'VIEW';
            READ_ONLY: boolean;
        } = {
            TABLE_NAME: 'binary_test',
            RELATION_TYPE: 'TABLE',
            READ_ONLY: false,
            ID: 'binary_test.id',
            BIN_COL: 'binary_test.bin_col',
            PRIMARY: [
                'binary_test.id',
            ],
            PRIMARY_SHORT: [
                'id',
            ],
            COLUMNS: {
                'binary_test.id': 'id',
                'binary_test.bin_col': 'bin_col',
            },
            TYPE_VALIDATION: {
                'binary_test.id': {
                    MYSQL_TYPE: 'int',
                    MAX_LENGTH: '',
                    AUTO_INCREMENT: true,
                    SKIP_COLUMN_IN_POST: false
                },
                'binary_test.bin_col': {
                    MYSQL_TYPE: 'binary',
                    MAX_LENGTH: '16',
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
                
            }
        };
        const sakila_category: Record<string, any> & {
            TABLE_NAME: string;
            RELATION_TYPE: 'TABLE' | 'VIEW';
            READ_ONLY: boolean;
        } = {
            TABLE_NAME: 'category',
            RELATION_TYPE: 'TABLE',
            READ_ONLY: false,
            CATEGORY_ID: 'category.category_id',
            NAME: 'category.name',
            LAST_UPDATE: 'category.last_update',
            PRIMARY: [
                'category.category_id',
            ],
            PRIMARY_SHORT: [
                'category_id',
            ],
            COLUMNS: {
                'category.category_id': 'category_id',
                'category.name': 'name',
                'category.last_update': 'last_update',
            },
            TYPE_VALIDATION: {
                'category.category_id': {
                    MYSQL_TYPE: 'tinyint',
                    MAX_LENGTH: '',
                    AUTO_INCREMENT: true,
                    SKIP_COLUMN_IN_POST: false
                },
                'category.name': {
                    MYSQL_TYPE: 'varchar',
                    MAX_LENGTH: '25',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: false
                },
                'category.last_update': {
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
                'category_id': [{
                    TABLE: 'film_category',
                    COLUMN: 'category_id',
                    CONSTRAINT: 'fk_film_category_category',
                },],
            }
        };
        const sakila_city: Record<string, any> & {
            TABLE_NAME: string;
            RELATION_TYPE: 'TABLE' | 'VIEW';
            READ_ONLY: boolean;
        } = {
            TABLE_NAME: 'city',
            RELATION_TYPE: 'TABLE',
            READ_ONLY: false,
            CITY_ID: 'city.city_id',
            CITY: 'city.city',
            COUNTRY_ID: 'city.country_id',
            LAST_UPDATE: 'city.last_update',
            PRIMARY: [
                'city.city_id',
            ],
            PRIMARY_SHORT: [
                'city_id',
            ],
            COLUMNS: {
                'city.city_id': 'city_id',
                'city.city': 'city',
                'city.country_id': 'country_id',
                'city.last_update': 'last_update',
            },
            TYPE_VALIDATION: {
                'city.city_id': {
                    MYSQL_TYPE: 'smallint',
                    MAX_LENGTH: '',
                    AUTO_INCREMENT: true,
                    SKIP_COLUMN_IN_POST: false
                },
                'city.city': {
                    MYSQL_TYPE: 'varchar',
                    MAX_LENGTH: '50',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: false
                },
                'city.country_id': {
                    MYSQL_TYPE: 'smallint',
                    MAX_LENGTH: '',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: false
                },
                'city.last_update': {
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
                'country_id': [{
                    TABLE: 'country',
                    COLUMN: 'country_id',
                    CONSTRAINT: 'fk_city_country',
                },],
            },
            TABLE_REFERENCED_BY: {
                'city_id': [{
                    TABLE: 'address',
                    COLUMN: 'city_id',
                    CONSTRAINT: 'fk_address_city',
                },],
            }
        };
        const sakila_country: Record<string, any> & {
            TABLE_NAME: string;
            RELATION_TYPE: 'TABLE' | 'VIEW';
            READ_ONLY: boolean;
        } = {
            TABLE_NAME: 'country',
            RELATION_TYPE: 'TABLE',
            READ_ONLY: false,
            COUNTRY_ID: 'country.country_id',
            COUNTRY: 'country.country',
            LAST_UPDATE: 'country.last_update',
            PRIMARY: [
                'country.country_id',
            ],
            PRIMARY_SHORT: [
                'country_id',
            ],
            COLUMNS: {
                'country.country_id': 'country_id',
                'country.country': 'country',
                'country.last_update': 'last_update',
            },
            TYPE_VALIDATION: {
                'country.country_id': {
                    MYSQL_TYPE: 'smallint',
                    MAX_LENGTH: '',
                    AUTO_INCREMENT: true,
                    SKIP_COLUMN_IN_POST: false
                },
                'country.country': {
                    MYSQL_TYPE: 'varchar',
                    MAX_LENGTH: '50',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: false
                },
                'country.last_update': {
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
                'country_id': [{
                    TABLE: 'city',
                    COLUMN: 'country_id',
                    CONSTRAINT: 'fk_city_country',
                },],
            }
        };
        const sakila_customer: Record<string, any> & {
            TABLE_NAME: string;
            RELATION_TYPE: 'TABLE' | 'VIEW';
            READ_ONLY: boolean;
        } = {
            TABLE_NAME: 'customer',
            RELATION_TYPE: 'TABLE',
            READ_ONLY: false,
            CUSTOMER_ID: 'customer.customer_id',
            STORE_ID: 'customer.store_id',
            FIRST_NAME: 'customer.first_name',
            LAST_NAME: 'customer.last_name',
            EMAIL: 'customer.email',
            ADDRESS_ID: 'customer.address_id',
            ACTIVE: 'customer.active',
            CREATE_DATE: 'customer.create_date',
            LAST_UPDATE: 'customer.last_update',
            PRIMARY: [
                'customer.customer_id',
            ],
            PRIMARY_SHORT: [
                'customer_id',
            ],
            COLUMNS: {
                'customer.customer_id': 'customer_id',
                'customer.store_id': 'store_id',
                'customer.first_name': 'first_name',
                'customer.last_name': 'last_name',
                'customer.email': 'email',
                'customer.address_id': 'address_id',
                'customer.active': 'active',
                'customer.create_date': 'create_date',
                'customer.last_update': 'last_update',
            },
            TYPE_VALIDATION: {
                'customer.customer_id': {
                    MYSQL_TYPE: 'smallint',
                    MAX_LENGTH: '',
                    AUTO_INCREMENT: true,
                    SKIP_COLUMN_IN_POST: false
                },
                'customer.store_id': {
                    MYSQL_TYPE: 'tinyint',
                    MAX_LENGTH: '',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: false
                },
                'customer.first_name': {
                    MYSQL_TYPE: 'varchar',
                    MAX_LENGTH: '45',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: false
                },
                'customer.last_name': {
                    MYSQL_TYPE: 'varchar',
                    MAX_LENGTH: '45',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: false
                },
                'customer.email': {
                    MYSQL_TYPE: 'varchar',
                    MAX_LENGTH: '50',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: false
                },
                'customer.address_id': {
                    MYSQL_TYPE: 'smallint',
                    MAX_LENGTH: '',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: false
                },
                'customer.active': {
                    MYSQL_TYPE: 'tinyint',
                    MAX_LENGTH: '1',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: false
                },
                'customer.create_date': {
                    MYSQL_TYPE: 'datetime',
                    MAX_LENGTH: '',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: false
                },
                'customer.last_update': {
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
                'address_id': [{
                    TABLE: 'address',
                    COLUMN: 'address_id',
                    CONSTRAINT: 'fk_customer_address',
                },],'store_id': [{
                    TABLE: 'store',
                    COLUMN: 'store_id',
                    CONSTRAINT: 'fk_customer_store',
                },],
            },
            TABLE_REFERENCED_BY: {
                'customer_id': [{
                    TABLE: 'payment',
                    COLUMN: 'customer_id',
                    CONSTRAINT: 'fk_payment_customer',
                },{
                    TABLE: 'rental',
                    COLUMN: 'customer_id',
                    CONSTRAINT: 'fk_rental_customer',
                },],
            }
        };
        const sakila_film: Record<string, any> & {
            TABLE_NAME: string;
            RELATION_TYPE: 'TABLE' | 'VIEW';
            READ_ONLY: boolean;
        } = {
            TABLE_NAME: 'film',
            RELATION_TYPE: 'TABLE',
            READ_ONLY: false,
            FILM_ID: 'film.film_id',
            TITLE: 'film.title',
            DESCRIPTION: 'film.description',
            RELEASE_YEAR: 'film.release_year',
            LANGUAGE_ID: 'film.language_id',
            ORIGINAL_LANGUAGE_ID: 'film.original_language_id',
            RENTAL_DURATION: 'film.rental_duration',
            RENTAL_RATE: 'film.rental_rate',
            LENGTH: 'film.length',
            REPLACEMENT_COST: 'film.replacement_cost',
            RATING: 'film.rating',
            SPECIAL_FEATURES: 'film.special_features',
            LAST_UPDATE: 'film.last_update',
            PRIMARY: [
                'film.film_id',
            ],
            PRIMARY_SHORT: [
                'film_id',
            ],
            COLUMNS: {
                'film.film_id': 'film_id',
                'film.title': 'title',
                'film.description': 'description',
                'film.release_year': 'release_year',
                'film.language_id': 'language_id',
                'film.original_language_id': 'original_language_id',
                'film.rental_duration': 'rental_duration',
                'film.rental_rate': 'rental_rate',
                'film.length': 'length',
                'film.replacement_cost': 'replacement_cost',
                'film.rating': 'rating',
                'film.special_features': 'special_features',
                'film.last_update': 'last_update',
            },
            TYPE_VALIDATION: {
                'film.film_id': {
                    MYSQL_TYPE: 'smallint',
                    MAX_LENGTH: '',
                    AUTO_INCREMENT: true,
                    SKIP_COLUMN_IN_POST: false
                },
                'film.title': {
                    MYSQL_TYPE: 'varchar',
                    MAX_LENGTH: '128',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: false
                },
                'film.description': {
                    MYSQL_TYPE: 'text',
                    MAX_LENGTH: '',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: true
                },
                'film.release_year': {
                    MYSQL_TYPE: 'year',
                    MAX_LENGTH: '',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: false
                },
                'film.language_id': {
                    MYSQL_TYPE: 'tinyint',
                    MAX_LENGTH: '',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: false
                },
                'film.original_language_id': {
                    MYSQL_TYPE: 'tinyint',
                    MAX_LENGTH: '',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: false
                },
                'film.rental_duration': {
                    MYSQL_TYPE: 'tinyint',
                    MAX_LENGTH: '',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: false
                },
                'film.rental_rate': {
                    MYSQL_TYPE: 'decimal',
                    MAX_LENGTH: '4,2',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: false
                },
                'film.length': {
                    MYSQL_TYPE: 'smallint',
                    MAX_LENGTH: '',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: false
                },
                'film.replacement_cost': {
                    MYSQL_TYPE: 'decimal',
                    MAX_LENGTH: '5,2',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: false
                },
                'film.rating': {
                    MYSQL_TYPE: 'enum',
                    MAX_LENGTH: '&#x27;G&#x27;,&#x27;PG&#x27;,&#x27;PG-13&#x27;,&#x27;R&#x27;,&#x27;NC-17&#x27;',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: false
                },
                'film.special_features': {
                    MYSQL_TYPE: 'set',
                    MAX_LENGTH: '&#x27;Trailers&#x27;,&#x27;Commentaries&#x27;,&#x27;Deleted Scenes&#x27;,&#x27;Behind the Scenes&#x27;',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: false
                },
                'film.last_update': {
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
                'language_id': [{
                    TABLE: 'language',
                    COLUMN: 'language_id',
                    CONSTRAINT: 'fk_film_language',
                },],'original_language_id': [{
                    TABLE: 'language',
                    COLUMN: 'language_id',
                    CONSTRAINT: 'fk_film_language_original',
                },],
            },
            TABLE_REFERENCED_BY: {
                'film_id': [{
                    TABLE: 'film_actor',
                    COLUMN: 'film_id',
                    CONSTRAINT: 'fk_film_actor_film',
                },{
                    TABLE: 'film_category',
                    COLUMN: 'film_id',
                    CONSTRAINT: 'fk_film_category_film',
                },{
                    TABLE: 'inventory',
                    COLUMN: 'film_id',
                    CONSTRAINT: 'fk_inventory_film',
                },],
            }
        };
        const sakila_film_actor: Record<string, any> & {
            TABLE_NAME: string;
            RELATION_TYPE: 'TABLE' | 'VIEW';
            READ_ONLY: boolean;
        } = {
            TABLE_NAME: 'film_actor',
            RELATION_TYPE: 'TABLE',
            READ_ONLY: false,
            ACTOR_ID: 'film_actor.actor_id',
            FILM_ID: 'film_actor.film_id',
            LAST_UPDATE: 'film_actor.last_update',
            PRIMARY: [
                'film_actor.actor_id',
                'film_actor.film_id',
            ],
            PRIMARY_SHORT: [
                'actor_id',
                'film_id',
            ],
            COLUMNS: {
                'film_actor.actor_id': 'actor_id',
                'film_actor.film_id': 'film_id',
                'film_actor.last_update': 'last_update',
            },
            TYPE_VALIDATION: {
                'film_actor.actor_id': {
                    MYSQL_TYPE: 'smallint',
                    MAX_LENGTH: '',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: false
                },
                'film_actor.film_id': {
                    MYSQL_TYPE: 'smallint',
                    MAX_LENGTH: '',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: false
                },
                'film_actor.last_update': {
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
                'actor_id': [{
                    TABLE: 'actor',
                    COLUMN: 'actor_id',
                    CONSTRAINT: 'fk_film_actor_actor',
                },],'film_id': [{
                    TABLE: 'film',
                    COLUMN: 'film_id',
                    CONSTRAINT: 'fk_film_actor_film',
                },],
            },
            TABLE_REFERENCED_BY: {
                
            }
        };
        const sakila_film_category: Record<string, any> & {
            TABLE_NAME: string;
            RELATION_TYPE: 'TABLE' | 'VIEW';
            READ_ONLY: boolean;
        } = {
            TABLE_NAME: 'film_category',
            RELATION_TYPE: 'TABLE',
            READ_ONLY: false,
            FILM_ID: 'film_category.film_id',
            CATEGORY_ID: 'film_category.category_id',
            LAST_UPDATE: 'film_category.last_update',
            PRIMARY: [
                'film_category.film_id',
                'film_category.category_id',
            ],
            PRIMARY_SHORT: [
                'film_id',
                'category_id',
            ],
            COLUMNS: {
                'film_category.film_id': 'film_id',
                'film_category.category_id': 'category_id',
                'film_category.last_update': 'last_update',
            },
            TYPE_VALIDATION: {
                'film_category.film_id': {
                    MYSQL_TYPE: 'smallint',
                    MAX_LENGTH: '',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: false
                },
                'film_category.category_id': {
                    MYSQL_TYPE: 'tinyint',
                    MAX_LENGTH: '',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: false
                },
                'film_category.last_update': {
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
                'category_id': [{
                    TABLE: 'category',
                    COLUMN: 'category_id',
                    CONSTRAINT: 'fk_film_category_category',
                },],'film_id': [{
                    TABLE: 'film',
                    COLUMN: 'film_id',
                    CONSTRAINT: 'fk_film_category_film',
                },],
            },
            TABLE_REFERENCED_BY: {
                
            }
        };
        const sakila_film_text: Record<string, any> & {
            TABLE_NAME: string;
            RELATION_TYPE: 'TABLE' | 'VIEW';
            READ_ONLY: boolean;
        } = {
            TABLE_NAME: 'film_text',
            RELATION_TYPE: 'TABLE',
            READ_ONLY: false,
            FILM_ID: 'film_text.film_id',
            TITLE: 'film_text.title',
            DESCRIPTION: 'film_text.description',
            PRIMARY: [
                'film_text.film_id',
            ],
            PRIMARY_SHORT: [
                'film_id',
            ],
            COLUMNS: {
                'film_text.film_id': 'film_id',
                'film_text.title': 'title',
                'film_text.description': 'description',
            },
            TYPE_VALIDATION: {
                'film_text.film_id': {
                    MYSQL_TYPE: 'smallint',
                    MAX_LENGTH: '',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: false
                },
                'film_text.title': {
                    MYSQL_TYPE: 'varchar',
                    MAX_LENGTH: '255',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: false
                },
                'film_text.description': {
                    MYSQL_TYPE: 'text',
                    MAX_LENGTH: '',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: true
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
                
            }
        };
        const sakila_inventory: Record<string, any> & {
            TABLE_NAME: string;
            RELATION_TYPE: 'TABLE' | 'VIEW';
            READ_ONLY: boolean;
        } = {
            TABLE_NAME: 'inventory',
            RELATION_TYPE: 'TABLE',
            READ_ONLY: false,
            INVENTORY_ID: 'inventory.inventory_id',
            FILM_ID: 'inventory.film_id',
            STORE_ID: 'inventory.store_id',
            LAST_UPDATE: 'inventory.last_update',
            PRIMARY: [
                'inventory.inventory_id',
            ],
            PRIMARY_SHORT: [
                'inventory_id',
            ],
            COLUMNS: {
                'inventory.inventory_id': 'inventory_id',
                'inventory.film_id': 'film_id',
                'inventory.store_id': 'store_id',
                'inventory.last_update': 'last_update',
            },
            TYPE_VALIDATION: {
                'inventory.inventory_id': {
                    MYSQL_TYPE: 'mediumint',
                    MAX_LENGTH: '',
                    AUTO_INCREMENT: true,
                    SKIP_COLUMN_IN_POST: false
                },
                'inventory.film_id': {
                    MYSQL_TYPE: 'smallint',
                    MAX_LENGTH: '',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: false
                },
                'inventory.store_id': {
                    MYSQL_TYPE: 'tinyint',
                    MAX_LENGTH: '',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: false
                },
                'inventory.last_update': {
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
                'film_id': [{
                    TABLE: 'film',
                    COLUMN: 'film_id',
                    CONSTRAINT: 'fk_inventory_film',
                },],'store_id': [{
                    TABLE: 'store',
                    COLUMN: 'store_id',
                    CONSTRAINT: 'fk_inventory_store',
                },],
            },
            TABLE_REFERENCED_BY: {
                'inventory_id': [{
                    TABLE: 'rental',
                    COLUMN: 'inventory_id',
                    CONSTRAINT: 'fk_rental_inventory',
                },],
            }
        };
        const sakila_language: Record<string, any> & {
            TABLE_NAME: string;
            RELATION_TYPE: 'TABLE' | 'VIEW';
            READ_ONLY: boolean;
        } = {
            TABLE_NAME: 'language',
            RELATION_TYPE: 'TABLE',
            READ_ONLY: false,
            LANGUAGE_ID: 'language.language_id',
            NAME: 'language.name',
            LAST_UPDATE: 'language.last_update',
            PRIMARY: [
                'language.language_id',
            ],
            PRIMARY_SHORT: [
                'language_id',
            ],
            COLUMNS: {
                'language.language_id': 'language_id',
                'language.name': 'name',
                'language.last_update': 'last_update',
            },
            TYPE_VALIDATION: {
                'language.language_id': {
                    MYSQL_TYPE: 'tinyint',
                    MAX_LENGTH: '',
                    AUTO_INCREMENT: true,
                    SKIP_COLUMN_IN_POST: false
                },
                'language.name': {
                    MYSQL_TYPE: 'char',
                    MAX_LENGTH: '20',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: false
                },
                'language.last_update': {
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
                'language_id': [{
                    TABLE: 'film',
                    COLUMN: 'language_id',
                    CONSTRAINT: 'fk_film_language',
                },{
                    TABLE: 'film',
                    COLUMN: 'original_language_id',
                    CONSTRAINT: 'fk_film_language_original',
                },],
            }
        };
        const sakila_payment: Record<string, any> & {
            TABLE_NAME: string;
            RELATION_TYPE: 'TABLE' | 'VIEW';
            READ_ONLY: boolean;
        } = {
            TABLE_NAME: 'payment',
            RELATION_TYPE: 'TABLE',
            READ_ONLY: false,
            PAYMENT_ID: 'payment.payment_id',
            CUSTOMER_ID: 'payment.customer_id',
            STAFF_ID: 'payment.staff_id',
            RENTAL_ID: 'payment.rental_id',
            AMOUNT: 'payment.amount',
            PAYMENT_DATE: 'payment.payment_date',
            LAST_UPDATE: 'payment.last_update',
            PRIMARY: [
                'payment.payment_id',
            ],
            PRIMARY_SHORT: [
                'payment_id',
            ],
            COLUMNS: {
                'payment.payment_id': 'payment_id',
                'payment.customer_id': 'customer_id',
                'payment.staff_id': 'staff_id',
                'payment.rental_id': 'rental_id',
                'payment.amount': 'amount',
                'payment.payment_date': 'payment_date',
                'payment.last_update': 'last_update',
            },
            TYPE_VALIDATION: {
                'payment.payment_id': {
                    MYSQL_TYPE: 'smallint',
                    MAX_LENGTH: '',
                    AUTO_INCREMENT: true,
                    SKIP_COLUMN_IN_POST: false
                },
                'payment.customer_id': {
                    MYSQL_TYPE: 'smallint',
                    MAX_LENGTH: '',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: false
                },
                'payment.staff_id': {
                    MYSQL_TYPE: 'tinyint',
                    MAX_LENGTH: '',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: false
                },
                'payment.rental_id': {
                    MYSQL_TYPE: 'int',
                    MAX_LENGTH: '',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: false
                },
                'payment.amount': {
                    MYSQL_TYPE: 'decimal',
                    MAX_LENGTH: '5,2',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: false
                },
                'payment.payment_date': {
                    MYSQL_TYPE: 'datetime',
                    MAX_LENGTH: '',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: false
                },
                'payment.last_update': {
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
                'customer_id': [{
                    TABLE: 'customer',
                    COLUMN: 'customer_id',
                    CONSTRAINT: 'fk_payment_customer',
                },],'rental_id': [{
                    TABLE: 'rental',
                    COLUMN: 'rental_id',
                    CONSTRAINT: 'fk_payment_rental',
                },],'staff_id': [{
                    TABLE: 'staff',
                    COLUMN: 'staff_id',
                    CONSTRAINT: 'fk_payment_staff',
                },],
            },
            TABLE_REFERENCED_BY: {
                
            }
        };
        const sakila_rental: Record<string, any> & {
            TABLE_NAME: string;
            RELATION_TYPE: 'TABLE' | 'VIEW';
            READ_ONLY: boolean;
        } = {
            TABLE_NAME: 'rental',
            RELATION_TYPE: 'TABLE',
            READ_ONLY: false,
            RENTAL_ID: 'rental.rental_id',
            RENTAL_DATE: 'rental.rental_date',
            INVENTORY_ID: 'rental.inventory_id',
            CUSTOMER_ID: 'rental.customer_id',
            RETURN_DATE: 'rental.return_date',
            STAFF_ID: 'rental.staff_id',
            LAST_UPDATE: 'rental.last_update',
            PRIMARY: [
                'rental.rental_id',
            ],
            PRIMARY_SHORT: [
                'rental_id',
            ],
            COLUMNS: {
                'rental.rental_id': 'rental_id',
                'rental.rental_date': 'rental_date',
                'rental.inventory_id': 'inventory_id',
                'rental.customer_id': 'customer_id',
                'rental.return_date': 'return_date',
                'rental.staff_id': 'staff_id',
                'rental.last_update': 'last_update',
            },
            TYPE_VALIDATION: {
                'rental.rental_id': {
                    MYSQL_TYPE: 'int',
                    MAX_LENGTH: '',
                    AUTO_INCREMENT: true,
                    SKIP_COLUMN_IN_POST: false
                },
                'rental.rental_date': {
                    MYSQL_TYPE: 'datetime',
                    MAX_LENGTH: '',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: false
                },
                'rental.inventory_id': {
                    MYSQL_TYPE: 'mediumint',
                    MAX_LENGTH: '',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: false
                },
                'rental.customer_id': {
                    MYSQL_TYPE: 'smallint',
                    MAX_LENGTH: '',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: false
                },
                'rental.return_date': {
                    MYSQL_TYPE: 'datetime',
                    MAX_LENGTH: '',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: false
                },
                'rental.staff_id': {
                    MYSQL_TYPE: 'tinyint',
                    MAX_LENGTH: '',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: false
                },
                'rental.last_update': {
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
                'customer_id': [{
                    TABLE: 'customer',
                    COLUMN: 'customer_id',
                    CONSTRAINT: 'fk_rental_customer',
                },],'inventory_id': [{
                    TABLE: 'inventory',
                    COLUMN: 'inventory_id',
                    CONSTRAINT: 'fk_rental_inventory',
                },],'staff_id': [{
                    TABLE: 'staff',
                    COLUMN: 'staff_id',
                    CONSTRAINT: 'fk_rental_staff',
                },],
            },
            TABLE_REFERENCED_BY: {
                'rental_id': [{
                    TABLE: 'payment',
                    COLUMN: 'rental_id',
                    CONSTRAINT: 'fk_payment_rental',
                },],
            }
        };
        const sakila_staff: Record<string, any> & {
            TABLE_NAME: string;
            RELATION_TYPE: 'TABLE' | 'VIEW';
            READ_ONLY: boolean;
        } = {
            TABLE_NAME: 'staff',
            RELATION_TYPE: 'TABLE',
            READ_ONLY: false,
            STAFF_ID: 'staff.staff_id',
            FIRST_NAME: 'staff.first_name',
            LAST_NAME: 'staff.last_name',
            ADDRESS_ID: 'staff.address_id',
            PICTURE: 'staff.picture',
            EMAIL: 'staff.email',
            STORE_ID: 'staff.store_id',
            ACTIVE: 'staff.active',
            USERNAME: 'staff.username',
            PASSWORD: 'staff.password',
            LAST_UPDATE: 'staff.last_update',
            PRIMARY: [
                'staff.staff_id',
            ],
            PRIMARY_SHORT: [
                'staff_id',
            ],
            COLUMNS: {
                'staff.staff_id': 'staff_id',
                'staff.first_name': 'first_name',
                'staff.last_name': 'last_name',
                'staff.address_id': 'address_id',
                'staff.picture': 'picture',
                'staff.email': 'email',
                'staff.store_id': 'store_id',
                'staff.active': 'active',
                'staff.username': 'username',
                'staff.password': 'password',
                'staff.last_update': 'last_update',
            },
            TYPE_VALIDATION: {
                'staff.staff_id': {
                    MYSQL_TYPE: 'tinyint',
                    MAX_LENGTH: '',
                    AUTO_INCREMENT: true,
                    SKIP_COLUMN_IN_POST: false
                },
                'staff.first_name': {
                    MYSQL_TYPE: 'varchar',
                    MAX_LENGTH: '45',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: false
                },
                'staff.last_name': {
                    MYSQL_TYPE: 'varchar',
                    MAX_LENGTH: '45',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: false
                },
                'staff.address_id': {
                    MYSQL_TYPE: 'smallint',
                    MAX_LENGTH: '',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: false
                },
                'staff.picture': {
                    MYSQL_TYPE: 'blob',
                    MAX_LENGTH: '',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: true
                },
                'staff.email': {
                    MYSQL_TYPE: 'varchar',
                    MAX_LENGTH: '50',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: false
                },
                'staff.store_id': {
                    MYSQL_TYPE: 'tinyint',
                    MAX_LENGTH: '',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: false
                },
                'staff.active': {
                    MYSQL_TYPE: 'tinyint',
                    MAX_LENGTH: '1',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: false
                },
                'staff.username': {
                    MYSQL_TYPE: 'varchar',
                    MAX_LENGTH: '16',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: false
                },
                'staff.password': {
                    MYSQL_TYPE: 'varchar',
                    MAX_LENGTH: '40',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: true
                },
                'staff.last_update': {
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
                'address_id': [{
                    TABLE: 'address',
                    COLUMN: 'address_id',
                    CONSTRAINT: 'fk_staff_address',
                },],'store_id': [{
                    TABLE: 'store',
                    COLUMN: 'store_id',
                    CONSTRAINT: 'fk_staff_store',
                },],
            },
            TABLE_REFERENCED_BY: {
                'staff_id': [{
                    TABLE: 'payment',
                    COLUMN: 'staff_id',
                    CONSTRAINT: 'fk_payment_staff',
                },{
                    TABLE: 'rental',
                    COLUMN: 'staff_id',
                    CONSTRAINT: 'fk_rental_staff',
                },{
                    TABLE: 'store',
                    COLUMN: 'manager_staff_id',
                    CONSTRAINT: 'fk_store_staff',
                },],
            }
        };
        const sakila_store: Record<string, any> & {
            TABLE_NAME: string;
            RELATION_TYPE: 'TABLE' | 'VIEW';
            READ_ONLY: boolean;
        } = {
            TABLE_NAME: 'store',
            RELATION_TYPE: 'TABLE',
            READ_ONLY: false,
            STORE_ID: 'store.store_id',
            MANAGER_STAFF_ID: 'store.manager_staff_id',
            ADDRESS_ID: 'store.address_id',
            LAST_UPDATE: 'store.last_update',
            PRIMARY: [
                'store.store_id',
            ],
            PRIMARY_SHORT: [
                'store_id',
            ],
            COLUMNS: {
                'store.store_id': 'store_id',
                'store.manager_staff_id': 'manager_staff_id',
                'store.address_id': 'address_id',
                'store.last_update': 'last_update',
            },
            TYPE_VALIDATION: {
                'store.store_id': {
                    MYSQL_TYPE: 'tinyint',
                    MAX_LENGTH: '',
                    AUTO_INCREMENT: true,
                    SKIP_COLUMN_IN_POST: false
                },
                'store.manager_staff_id': {
                    MYSQL_TYPE: 'tinyint',
                    MAX_LENGTH: '',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: false
                },
                'store.address_id': {
                    MYSQL_TYPE: 'smallint',
                    MAX_LENGTH: '',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: false
                },
                'store.last_update': {
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
                'address_id': [{
                    TABLE: 'address',
                    COLUMN: 'address_id',
                    CONSTRAINT: 'fk_store_address',
                },],'manager_staff_id': [{
                    TABLE: 'staff',
                    COLUMN: 'staff_id',
                    CONSTRAINT: 'fk_store_staff',
                },],
            },
            TABLE_REFERENCED_BY: {
                'store_id': [{
                    TABLE: 'customer',
                    COLUMN: 'store_id',
                    CONSTRAINT: 'fk_customer_store',
                },{
                    TABLE: 'inventory',
                    COLUMN: 'store_id',
                    CONSTRAINT: 'fk_inventory_store',
                },{
                    TABLE: 'staff',
                    COLUMN: 'store_id',
                    CONSTRAINT: 'fk_staff_store',
                },],
            }
        };
        const sakila_actor_info: Record<string, any> & {
            TABLE_NAME: string;
            RELATION_TYPE: 'TABLE' | 'VIEW';
            READ_ONLY: boolean;
        } = {
            TABLE_NAME: 'actor_info',
            RELATION_TYPE: 'VIEW',
            READ_ONLY: true,
            ACTOR_ID: 'actor_info.actor_id',
            FIRST_NAME: 'actor_info.first_name',
            LAST_NAME: 'actor_info.last_name',
            FILM_INFO: 'actor_info.film_info',
            PRIMARY: [
            ],
            PRIMARY_SHORT: [
            ],
            COLUMNS: {
                'actor_info.actor_id': 'actor_id',
                'actor_info.first_name': 'first_name',
                'actor_info.last_name': 'last_name',
                'actor_info.film_info': 'film_info',
            },
            TYPE_VALIDATION: {
                'actor_info.actor_id': {
                    MYSQL_TYPE: 'smallint',
                    MAX_LENGTH: '',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: true
                },
                'actor_info.first_name': {
                    MYSQL_TYPE: 'varchar',
                    MAX_LENGTH: '45',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: true
                },
                'actor_info.last_name': {
                    MYSQL_TYPE: 'varchar',
                    MAX_LENGTH: '45',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: true
                },
                'actor_info.film_info': {
                    MYSQL_TYPE: 'text',
                    MAX_LENGTH: '',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: true
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
                
            }
        };
        const sakila_customer_list: Record<string, any> & {
            TABLE_NAME: string;
            RELATION_TYPE: 'TABLE' | 'VIEW';
            READ_ONLY: boolean;
        } = {
            TABLE_NAME: 'customer_list',
            RELATION_TYPE: 'VIEW',
            READ_ONLY: true,
            ID: 'customer_list.ID',
            NAME: 'customer_list.name',
            ADDRESS: 'customer_list.address',
            ZIP_CODE: 'customer_list.zip code',
            PHONE: 'customer_list.phone',
            CITY: 'customer_list.city',
            COUNTRY: 'customer_list.country',
            NOTES: 'customer_list.notes',
            SID: 'customer_list.SID',
            PRIMARY: [
            ],
            PRIMARY_SHORT: [
            ],
            COLUMNS: {
                'customer_list.ID': 'ID',
                'customer_list.name': 'name',
                'customer_list.address': 'address',
                'customer_list.zip code': 'zip code',
                'customer_list.phone': 'phone',
                'customer_list.city': 'city',
                'customer_list.country': 'country',
                'customer_list.notes': 'notes',
                'customer_list.SID': 'SID',
            },
            TYPE_VALIDATION: {
                'customer_list.ID': {
                    MYSQL_TYPE: 'smallint',
                    MAX_LENGTH: '',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: true
                },
                'customer_list.name': {
                    MYSQL_TYPE: 'varchar',
                    MAX_LENGTH: '91',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: true
                },
                'customer_list.address': {
                    MYSQL_TYPE: 'varchar',
                    MAX_LENGTH: '50',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: true
                },
                'customer_list.zip code': {
                    MYSQL_TYPE: 'varchar',
                    MAX_LENGTH: '10',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: true
                },
                'customer_list.phone': {
                    MYSQL_TYPE: 'varchar',
                    MAX_LENGTH: '20',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: true
                },
                'customer_list.city': {
                    MYSQL_TYPE: 'varchar',
                    MAX_LENGTH: '50',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: true
                },
                'customer_list.country': {
                    MYSQL_TYPE: 'varchar',
                    MAX_LENGTH: '50',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: true
                },
                'customer_list.notes': {
                    MYSQL_TYPE: 'varchar',
                    MAX_LENGTH: '6',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: true
                },
                'customer_list.SID': {
                    MYSQL_TYPE: 'tinyint',
                    MAX_LENGTH: '',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: true
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
                
            }
        };
        const sakila_film_list: Record<string, any> & {
            TABLE_NAME: string;
            RELATION_TYPE: 'TABLE' | 'VIEW';
            READ_ONLY: boolean;
        } = {
            TABLE_NAME: 'film_list',
            RELATION_TYPE: 'VIEW',
            READ_ONLY: true,
            FID: 'film_list.FID',
            TITLE: 'film_list.title',
            DESCRIPTION: 'film_list.description',
            CATEGORY: 'film_list.category',
            PRICE: 'film_list.price',
            LENGTH: 'film_list.length',
            RATING: 'film_list.rating',
            ACTORS: 'film_list.actors',
            PRIMARY: [
            ],
            PRIMARY_SHORT: [
            ],
            COLUMNS: {
                'film_list.FID': 'FID',
                'film_list.title': 'title',
                'film_list.description': 'description',
                'film_list.category': 'category',
                'film_list.price': 'price',
                'film_list.length': 'length',
                'film_list.rating': 'rating',
                'film_list.actors': 'actors',
            },
            TYPE_VALIDATION: {
                'film_list.FID': {
                    MYSQL_TYPE: 'smallint',
                    MAX_LENGTH: '',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: true
                },
                'film_list.title': {
                    MYSQL_TYPE: 'varchar',
                    MAX_LENGTH: '128',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: true
                },
                'film_list.description': {
                    MYSQL_TYPE: 'text',
                    MAX_LENGTH: '',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: true
                },
                'film_list.category': {
                    MYSQL_TYPE: 'varchar',
                    MAX_LENGTH: '25',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: true
                },
                'film_list.price': {
                    MYSQL_TYPE: 'decimal',
                    MAX_LENGTH: '4,2',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: true
                },
                'film_list.length': {
                    MYSQL_TYPE: 'smallint',
                    MAX_LENGTH: '',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: true
                },
                'film_list.rating': {
                    MYSQL_TYPE: 'enum',
                    MAX_LENGTH: '&#x27;G&#x27;,&#x27;PG&#x27;,&#x27;PG-13&#x27;,&#x27;R&#x27;,&#x27;NC-17&#x27;',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: true
                },
                'film_list.actors': {
                    MYSQL_TYPE: 'text',
                    MAX_LENGTH: '',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: true
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
                
            }
        };
        const sakila_nicer_but_slower_film_list: Record<string, any> & {
            TABLE_NAME: string;
            RELATION_TYPE: 'TABLE' | 'VIEW';
            READ_ONLY: boolean;
        } = {
            TABLE_NAME: 'nicer_but_slower_film_list',
            RELATION_TYPE: 'VIEW',
            READ_ONLY: true,
            FID: 'nicer_but_slower_film_list.FID',
            TITLE: 'nicer_but_slower_film_list.title',
            DESCRIPTION: 'nicer_but_slower_film_list.description',
            CATEGORY: 'nicer_but_slower_film_list.category',
            PRICE: 'nicer_but_slower_film_list.price',
            LENGTH: 'nicer_but_slower_film_list.length',
            RATING: 'nicer_but_slower_film_list.rating',
            ACTORS: 'nicer_but_slower_film_list.actors',
            PRIMARY: [
            ],
            PRIMARY_SHORT: [
            ],
            COLUMNS: {
                'nicer_but_slower_film_list.FID': 'FID',
                'nicer_but_slower_film_list.title': 'title',
                'nicer_but_slower_film_list.description': 'description',
                'nicer_but_slower_film_list.category': 'category',
                'nicer_but_slower_film_list.price': 'price',
                'nicer_but_slower_film_list.length': 'length',
                'nicer_but_slower_film_list.rating': 'rating',
                'nicer_but_slower_film_list.actors': 'actors',
            },
            TYPE_VALIDATION: {
                'nicer_but_slower_film_list.FID': {
                    MYSQL_TYPE: 'smallint',
                    MAX_LENGTH: '',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: true
                },
                'nicer_but_slower_film_list.title': {
                    MYSQL_TYPE: 'varchar',
                    MAX_LENGTH: '128',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: true
                },
                'nicer_but_slower_film_list.description': {
                    MYSQL_TYPE: 'text',
                    MAX_LENGTH: '',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: true
                },
                'nicer_but_slower_film_list.category': {
                    MYSQL_TYPE: 'varchar',
                    MAX_LENGTH: '25',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: true
                },
                'nicer_but_slower_film_list.price': {
                    MYSQL_TYPE: 'decimal',
                    MAX_LENGTH: '4,2',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: true
                },
                'nicer_but_slower_film_list.length': {
                    MYSQL_TYPE: 'smallint',
                    MAX_LENGTH: '',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: true
                },
                'nicer_but_slower_film_list.rating': {
                    MYSQL_TYPE: 'enum',
                    MAX_LENGTH: '&#x27;G&#x27;,&#x27;PG&#x27;,&#x27;PG-13&#x27;,&#x27;R&#x27;,&#x27;NC-17&#x27;',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: true
                },
                'nicer_but_slower_film_list.actors': {
                    MYSQL_TYPE: 'text',
                    MAX_LENGTH: '',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: true
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
                
            }
        };
        const sakila_sales_by_film_category: Record<string, any> & {
            TABLE_NAME: string;
            RELATION_TYPE: 'TABLE' | 'VIEW';
            READ_ONLY: boolean;
        } = {
            TABLE_NAME: 'sales_by_film_category',
            RELATION_TYPE: 'VIEW',
            READ_ONLY: true,
            CATEGORY: 'sales_by_film_category.category',
            TOTAL_SALES: 'sales_by_film_category.total_sales',
            PRIMARY: [
            ],
            PRIMARY_SHORT: [
            ],
            COLUMNS: {
                'sales_by_film_category.category': 'category',
                'sales_by_film_category.total_sales': 'total_sales',
            },
            TYPE_VALIDATION: {
                'sales_by_film_category.category': {
                    MYSQL_TYPE: 'varchar',
                    MAX_LENGTH: '25',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: true
                },
                'sales_by_film_category.total_sales': {
                    MYSQL_TYPE: 'decimal',
                    MAX_LENGTH: '27,2',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: true
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
                
            }
        };
        const sakila_sales_by_store: Record<string, any> & {
            TABLE_NAME: string;
            RELATION_TYPE: 'TABLE' | 'VIEW';
            READ_ONLY: boolean;
        } = {
            TABLE_NAME: 'sales_by_store',
            RELATION_TYPE: 'VIEW',
            READ_ONLY: true,
            STORE: 'sales_by_store.store',
            MANAGER: 'sales_by_store.manager',
            TOTAL_SALES: 'sales_by_store.total_sales',
            PRIMARY: [
            ],
            PRIMARY_SHORT: [
            ],
            COLUMNS: {
                'sales_by_store.store': 'store',
                'sales_by_store.manager': 'manager',
                'sales_by_store.total_sales': 'total_sales',
            },
            TYPE_VALIDATION: {
                'sales_by_store.store': {
                    MYSQL_TYPE: 'varchar',
                    MAX_LENGTH: '101',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: true
                },
                'sales_by_store.manager': {
                    MYSQL_TYPE: 'varchar',
                    MAX_LENGTH: '91',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: true
                },
                'sales_by_store.total_sales': {
                    MYSQL_TYPE: 'decimal',
                    MAX_LENGTH: '27,2',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: true
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
                
            }
        };
        const sakila_staff_list: Record<string, any> & {
            TABLE_NAME: string;
            RELATION_TYPE: 'TABLE' | 'VIEW';
            READ_ONLY: boolean;
        } = {
            TABLE_NAME: 'staff_list',
            RELATION_TYPE: 'VIEW',
            READ_ONLY: true,
            ID: 'staff_list.ID',
            NAME: 'staff_list.name',
            ADDRESS: 'staff_list.address',
            ZIP_CODE: 'staff_list.zip code',
            PHONE: 'staff_list.phone',
            CITY: 'staff_list.city',
            COUNTRY: 'staff_list.country',
            SID: 'staff_list.SID',
            PRIMARY: [
            ],
            PRIMARY_SHORT: [
            ],
            COLUMNS: {
                'staff_list.ID': 'ID',
                'staff_list.name': 'name',
                'staff_list.address': 'address',
                'staff_list.zip code': 'zip code',
                'staff_list.phone': 'phone',
                'staff_list.city': 'city',
                'staff_list.country': 'country',
                'staff_list.SID': 'SID',
            },
            TYPE_VALIDATION: {
                'staff_list.ID': {
                    MYSQL_TYPE: 'tinyint',
                    MAX_LENGTH: '',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: true
                },
                'staff_list.name': {
                    MYSQL_TYPE: 'varchar',
                    MAX_LENGTH: '91',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: true
                },
                'staff_list.address': {
                    MYSQL_TYPE: 'varchar',
                    MAX_LENGTH: '50',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: true
                },
                'staff_list.zip code': {
                    MYSQL_TYPE: 'varchar',
                    MAX_LENGTH: '10',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: true
                },
                'staff_list.phone': {
                    MYSQL_TYPE: 'varchar',
                    MAX_LENGTH: '20',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: true
                },
                'staff_list.city': {
                    MYSQL_TYPE: 'varchar',
                    MAX_LENGTH: '50',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: true
                },
                'staff_list.country': {
                    MYSQL_TYPE: 'varchar',
                    MAX_LENGTH: '50',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: true
                },
                'staff_list.SID': {
                    MYSQL_TYPE: 'tinyint',
                    MAX_LENGTH: '',
                    AUTO_INCREMENT: false,
                    SKIP_COLUMN_IN_POST: true
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
                
            }
        };

        const scopedTables = {
            'actor': sakila_actor,
            'address': sakila_address,
            'binary_test': sakila_binary_test,
            'category': sakila_category,
            'city': sakila_city,
            'country': sakila_country,
            'customer': sakila_customer,
            'film': sakila_film,
            'film_actor': sakila_film_actor,
            'film_category': sakila_film_category,
            'film_text': sakila_film_text,
            'inventory': sakila_inventory,
            'language': sakila_language,
            'payment': sakila_payment,
            'rental': sakila_rental,
            'staff': sakila_staff,
            'store': sakila_store,
            'actor_info': sakila_actor_info,
            'customer_list': sakila_customer_list,
            'film_list': sakila_film_list,
            'nicer_but_slower_film_list': sakila_nicer_but_slower_film_list,
            'sales_by_film_category': sakila_sales_by_film_category,
            'sales_by_store': sakila_sales_by_store,
            'staff_list': sakila_staff_list,
        } as Record<string, any>;

        const scopedC6: iC6Object<any> = {
            ...C6Constants,
            C6VERSION: '6.4.2',
            PREFIX: RestTablePrefix,
            TABLES: scopedTables as any,
            ORM: {},
            ...scopedTables,
        };

        const Sakila_Actor = {
            ...sakila_actor,
            ...restOrm<any>(() => ({
                ...GLOBAL_REST_PARAMETERS,
                C6: scopedC6,
                restModel: sakila_actor as any
            }))
        };
        const Sakila_Address = {
            ...sakila_address,
            ...restOrm<any>(() => ({
                ...GLOBAL_REST_PARAMETERS,
                C6: scopedC6,
                restModel: sakila_address as any
            }))
        };
        const Sakila_Binary_Test = {
            ...sakila_binary_test,
            ...restOrm<any>(() => ({
                ...GLOBAL_REST_PARAMETERS,
                C6: scopedC6,
                restModel: sakila_binary_test as any
            }))
        };
        const Sakila_Category = {
            ...sakila_category,
            ...restOrm<any>(() => ({
                ...GLOBAL_REST_PARAMETERS,
                C6: scopedC6,
                restModel: sakila_category as any
            }))
        };
        const Sakila_City = {
            ...sakila_city,
            ...restOrm<any>(() => ({
                ...GLOBAL_REST_PARAMETERS,
                C6: scopedC6,
                restModel: sakila_city as any
            }))
        };
        const Sakila_Country = {
            ...sakila_country,
            ...restOrm<any>(() => ({
                ...GLOBAL_REST_PARAMETERS,
                C6: scopedC6,
                restModel: sakila_country as any
            }))
        };
        const Sakila_Customer = {
            ...sakila_customer,
            ...restOrm<any>(() => ({
                ...GLOBAL_REST_PARAMETERS,
                C6: scopedC6,
                restModel: sakila_customer as any
            }))
        };
        const Sakila_Film = {
            ...sakila_film,
            ...restOrm<any>(() => ({
                ...GLOBAL_REST_PARAMETERS,
                C6: scopedC6,
                restModel: sakila_film as any
            }))
        };
        const Sakila_Film_Actor = {
            ...sakila_film_actor,
            ...restOrm<any>(() => ({
                ...GLOBAL_REST_PARAMETERS,
                C6: scopedC6,
                restModel: sakila_film_actor as any
            }))
        };
        const Sakila_Film_Category = {
            ...sakila_film_category,
            ...restOrm<any>(() => ({
                ...GLOBAL_REST_PARAMETERS,
                C6: scopedC6,
                restModel: sakila_film_category as any
            }))
        };
        const Sakila_Film_Text = {
            ...sakila_film_text,
            ...restOrm<any>(() => ({
                ...GLOBAL_REST_PARAMETERS,
                C6: scopedC6,
                restModel: sakila_film_text as any
            }))
        };
        const Sakila_Inventory = {
            ...sakila_inventory,
            ...restOrm<any>(() => ({
                ...GLOBAL_REST_PARAMETERS,
                C6: scopedC6,
                restModel: sakila_inventory as any
            }))
        };
        const Sakila_Language = {
            ...sakila_language,
            ...restOrm<any>(() => ({
                ...GLOBAL_REST_PARAMETERS,
                C6: scopedC6,
                restModel: sakila_language as any
            }))
        };
        const Sakila_Payment = {
            ...sakila_payment,
            ...restOrm<any>(() => ({
                ...GLOBAL_REST_PARAMETERS,
                C6: scopedC6,
                restModel: sakila_payment as any
            }))
        };
        const Sakila_Rental = {
            ...sakila_rental,
            ...restOrm<any>(() => ({
                ...GLOBAL_REST_PARAMETERS,
                C6: scopedC6,
                restModel: sakila_rental as any
            }))
        };
        const Sakila_Staff = {
            ...sakila_staff,
            ...restOrm<any>(() => ({
                ...GLOBAL_REST_PARAMETERS,
                C6: scopedC6,
                restModel: sakila_staff as any
            }))
        };
        const Sakila_Store = {
            ...sakila_store,
            ...restOrm<any>(() => ({
                ...GLOBAL_REST_PARAMETERS,
                C6: scopedC6,
                restModel: sakila_store as any
            }))
        };
        const Sakila_Actor_Info = {
            ...sakila_actor_info,
            Get: (restRequest as any)(() => ({
                ...GLOBAL_REST_PARAMETERS,
                C6: scopedC6,
                restModel: sakila_actor_info as any,
                requestMethod: 'GET',
            }))
        };
        const Sakila_Customer_List = {
            ...sakila_customer_list,
            Get: (restRequest as any)(() => ({
                ...GLOBAL_REST_PARAMETERS,
                C6: scopedC6,
                restModel: sakila_customer_list as any,
                requestMethod: 'GET',
            }))
        };
        const Sakila_Film_List = {
            ...sakila_film_list,
            Get: (restRequest as any)(() => ({
                ...GLOBAL_REST_PARAMETERS,
                C6: scopedC6,
                restModel: sakila_film_list as any,
                requestMethod: 'GET',
            }))
        };
        const Sakila_Nicer_But_Slower_Film_List = {
            ...sakila_nicer_but_slower_film_list,
            Get: (restRequest as any)(() => ({
                ...GLOBAL_REST_PARAMETERS,
                C6: scopedC6,
                restModel: sakila_nicer_but_slower_film_list as any,
                requestMethod: 'GET',
            }))
        };
        const Sakila_Sales_By_Film_Category = {
            ...sakila_sales_by_film_category,
            Get: (restRequest as any)(() => ({
                ...GLOBAL_REST_PARAMETERS,
                C6: scopedC6,
                restModel: sakila_sales_by_film_category as any,
                requestMethod: 'GET',
            }))
        };
        const Sakila_Sales_By_Store = {
            ...sakila_sales_by_store,
            Get: (restRequest as any)(() => ({
                ...GLOBAL_REST_PARAMETERS,
                C6: scopedC6,
                restModel: sakila_sales_by_store as any,
                requestMethod: 'GET',
            }))
        };
        const Sakila_Staff_List = {
            ...sakila_staff_list,
            Get: (restRequest as any)(() => ({
                ...GLOBAL_REST_PARAMETERS,
                C6: scopedC6,
                restModel: sakila_staff_list as any,
                requestMethod: 'GET',
            }))
        };

        (scopedC6 as any).ORM = {
            Actor: Sakila_Actor,
            Address: Sakila_Address,
            Binary_Test: Sakila_Binary_Test,
            Category: Sakila_Category,
            City: Sakila_City,
            Country: Sakila_Country,
            Customer: Sakila_Customer,
            Film: Sakila_Film,
            Film_Actor: Sakila_Film_Actor,
            Film_Category: Sakila_Film_Category,
            Film_Text: Sakila_Film_Text,
            Inventory: Sakila_Inventory,
            Language: Sakila_Language,
            Payment: Sakila_Payment,
            Rental: Sakila_Rental,
            Staff: Sakila_Staff,
            Store: Sakila_Store,
            Actor_Info: Sakila_Actor_Info,
            Customer_List: Sakila_Customer_List,
            Film_List: Sakila_Film_List,
            Nicer_But_Slower_Film_List: Sakila_Nicer_But_Slower_Film_List,
            Sales_By_Film_Category: Sakila_Sales_By_Film_Category,
            Sales_By_Store: Sakila_Sales_By_Store,
            Staff_List: Sakila_Staff_List,
        };

        return scopedC6;
    })(),
};
