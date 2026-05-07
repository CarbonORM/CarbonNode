// noinspection JSUnusedGlobalSymbols,SpellCheckingInspection

import {
    C6Constants,
    restOrm,
} from "@carbonorm/carbonnode";
import type {
    C6RestfulModel,
    iC6Object,
} from "@carbonorm/carbonnode";
import {
    GLOBAL_REST_PARAMETERS,
    RestTablePrefix,
} from "./core";

export const SCOPED_C6_BY_DATABASE: Record<string, iC6Object<any>> = {
    'sakila': (() => {
        const sakila_actor: C6RestfulModel<any, any, any> = {
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
        };
        const sakila_address: C6RestfulModel<any, any, any> = {
            TABLE_NAME: 'address',
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
        const sakila_binary_test: C6RestfulModel<any, any, any> = {
            TABLE_NAME: 'binary_test',
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
        const sakila_category: C6RestfulModel<any, any, any> = {
            TABLE_NAME: 'category',
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
        const sakila_city: C6RestfulModel<any, any, any> = {
            TABLE_NAME: 'city',
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
        const sakila_country: C6RestfulModel<any, any, any> = {
            TABLE_NAME: 'country',
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
        const sakila_customer: C6RestfulModel<any, any, any> = {
            TABLE_NAME: 'customer',
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
        const sakila_film: C6RestfulModel<any, any, any> = {
            TABLE_NAME: 'film',
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
        const sakila_film_actor: C6RestfulModel<any, any, any> = {
            TABLE_NAME: 'film_actor',
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
        const sakila_film_category: C6RestfulModel<any, any, any> = {
            TABLE_NAME: 'film_category',
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
        const sakila_film_text: C6RestfulModel<any, any, any> = {
            TABLE_NAME: 'film_text',
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
        const sakila_inventory: C6RestfulModel<any, any, any> = {
            TABLE_NAME: 'inventory',
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
        const sakila_language: C6RestfulModel<any, any, any> = {
            TABLE_NAME: 'language',
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
        const sakila_payment: C6RestfulModel<any, any, any> = {
            TABLE_NAME: 'payment',
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
        const sakila_rental: C6RestfulModel<any, any, any> = {
            TABLE_NAME: 'rental',
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
        const sakila_staff: C6RestfulModel<any, any, any> = {
            TABLE_NAME: 'staff',
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
        const sakila_store: C6RestfulModel<any, any, any> = {
            TABLE_NAME: 'store',
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
        };

        const scopedC6: iC6Object<any> = {
            ...C6Constants,
            C6VERSION: '6.3.1',
            PREFIX: RestTablePrefix,
            TABLES: scopedTables,
            ORM: {},
            ...scopedTables,
        };

        const Sakila_Actor = {
            ...sakila_actor,
            ...restOrm<any>(() => ({
                ...GLOBAL_REST_PARAMETERS,
                C6: scopedC6,
                restModel: sakila_actor
            }))
        };
        const Sakila_Address = {
            ...sakila_address,
            ...restOrm<any>(() => ({
                ...GLOBAL_REST_PARAMETERS,
                C6: scopedC6,
                restModel: sakila_address
            }))
        };
        const Sakila_Binary_Test = {
            ...sakila_binary_test,
            ...restOrm<any>(() => ({
                ...GLOBAL_REST_PARAMETERS,
                C6: scopedC6,
                restModel: sakila_binary_test
            }))
        };
        const Sakila_Category = {
            ...sakila_category,
            ...restOrm<any>(() => ({
                ...GLOBAL_REST_PARAMETERS,
                C6: scopedC6,
                restModel: sakila_category
            }))
        };
        const Sakila_City = {
            ...sakila_city,
            ...restOrm<any>(() => ({
                ...GLOBAL_REST_PARAMETERS,
                C6: scopedC6,
                restModel: sakila_city
            }))
        };
        const Sakila_Country = {
            ...sakila_country,
            ...restOrm<any>(() => ({
                ...GLOBAL_REST_PARAMETERS,
                C6: scopedC6,
                restModel: sakila_country
            }))
        };
        const Sakila_Customer = {
            ...sakila_customer,
            ...restOrm<any>(() => ({
                ...GLOBAL_REST_PARAMETERS,
                C6: scopedC6,
                restModel: sakila_customer
            }))
        };
        const Sakila_Film = {
            ...sakila_film,
            ...restOrm<any>(() => ({
                ...GLOBAL_REST_PARAMETERS,
                C6: scopedC6,
                restModel: sakila_film
            }))
        };
        const Sakila_Film_Actor = {
            ...sakila_film_actor,
            ...restOrm<any>(() => ({
                ...GLOBAL_REST_PARAMETERS,
                C6: scopedC6,
                restModel: sakila_film_actor
            }))
        };
        const Sakila_Film_Category = {
            ...sakila_film_category,
            ...restOrm<any>(() => ({
                ...GLOBAL_REST_PARAMETERS,
                C6: scopedC6,
                restModel: sakila_film_category
            }))
        };
        const Sakila_Film_Text = {
            ...sakila_film_text,
            ...restOrm<any>(() => ({
                ...GLOBAL_REST_PARAMETERS,
                C6: scopedC6,
                restModel: sakila_film_text
            }))
        };
        const Sakila_Inventory = {
            ...sakila_inventory,
            ...restOrm<any>(() => ({
                ...GLOBAL_REST_PARAMETERS,
                C6: scopedC6,
                restModel: sakila_inventory
            }))
        };
        const Sakila_Language = {
            ...sakila_language,
            ...restOrm<any>(() => ({
                ...GLOBAL_REST_PARAMETERS,
                C6: scopedC6,
                restModel: sakila_language
            }))
        };
        const Sakila_Payment = {
            ...sakila_payment,
            ...restOrm<any>(() => ({
                ...GLOBAL_REST_PARAMETERS,
                C6: scopedC6,
                restModel: sakila_payment
            }))
        };
        const Sakila_Rental = {
            ...sakila_rental,
            ...restOrm<any>(() => ({
                ...GLOBAL_REST_PARAMETERS,
                C6: scopedC6,
                restModel: sakila_rental
            }))
        };
        const Sakila_Staff = {
            ...sakila_staff,
            ...restOrm<any>(() => ({
                ...GLOBAL_REST_PARAMETERS,
                C6: scopedC6,
                restModel: sakila_staff
            }))
        };
        const Sakila_Store = {
            ...sakila_store,
            ...restOrm<any>(() => ({
                ...GLOBAL_REST_PARAMETERS,
                C6: scopedC6,
                restModel: sakila_store
            }))
        };

        scopedC6.ORM = {
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
        };

        return scopedC6;
    })(),
};
