// noinspection JSUnusedGlobalSymbols,SpellCheckingInspection

import {
    C6Constants,
    iC6Object,
    iRest,
    removePrefixIfExists,
} from "@carbonorm/carbonnode";
import type {
    C6RestfulModel,
    iDynamicApiImport,
} from "@carbonorm/carbonnode";
import type { iActor } from "./tables/Actor";
import type { iAddress } from "./tables/Address";
import type { iBinary_Test } from "./tables/Binary_Test";
import type { iCategory } from "./tables/Category";
import type { iCity } from "./tables/City";
import type { iCountry } from "./tables/Country";
import type { iCustomer } from "./tables/Customer";
import type { iFilm } from "./tables/Film";
import type { iFilm_Actor } from "./tables/Film_Actor";
import type { iFilm_Category } from "./tables/Film_Category";
import type { iFilm_Text } from "./tables/Film_Text";
import type { iInventory } from "./tables/Inventory";
import type { iLanguage } from "./tables/Language";
import type { iPayment } from "./tables/Payment";
import type { iRental } from "./tables/Rental";
import type { iStaff } from "./tables/Staff";
import type { iStore } from "./tables/Store";
import type { iActor_Info } from "./views/Actor_Info";
import type { iCustomer_List } from "./views/Customer_List";
import type { iFilm_List } from "./views/Film_List";
import type { iNicer_But_Slower_Film_List } from "./views/Nicer_But_Slower_Film_List";
import type { iSales_By_Film_Category } from "./views/Sales_By_Film_Category";
import type { iSales_By_Store } from "./views/Sales_By_Store";
import type { iStaff_List } from "./views/Staff_List";

export const RestTablePrefix = '';

export type RestTableNames = 'actor'
 | 'address'
 | 'binary_test'
 | 'category'
 | 'city'
 | 'country'
 | 'customer'
 | 'film'
 | 'film_actor'
 | 'film_category'
 | 'film_text'
 | 'inventory'
 | 'language'
 | 'payment'
 | 'rental'
 | 'staff'
 | 'store'
 | 'actor_info'
 | 'customer_list'
 | 'film_list'
 | 'nicer_but_slower_film_list'
 | 'sales_by_film_category'
 | 'sales_by_store'
 | 'staff_list';

export type RestShortTableNames = 'actor'
 | 'address'
 | 'binary_test'
 | 'category'
 | 'city'
 | 'country'
 | 'customer'
 | 'film'
 | 'film_actor'
 | 'film_category'
 | 'film_text'
 | 'inventory'
 | 'language'
 | 'payment'
 | 'rental'
 | 'staff'
 | 'store'
 | 'actor_info'
 | 'customer_list'
 | 'film_list'
 | 'nicer_but_slower_film_list'
 | 'sales_by_film_category'
 | 'sales_by_store'
 | 'staff_list';

export type RestViewNames = 'actor_info'
 | 'customer_list'
 | 'film_list'
 | 'nicer_but_slower_film_list'
 | 'sales_by_film_category'
 | 'sales_by_store'
 | 'staff_list';

export type RestShortViewNames = 'actor_info'
 | 'customer_list'
 | 'film_list'
 | 'nicer_but_slower_film_list'
 | 'sales_by_film_category'
 | 'sales_by_store'
 | 'staff_list';

export type RestTableInterfaces = iActor
 | iAddress
 | iBinary_Test
 | iCategory
 | iCity
 | iCountry
 | iCustomer
 | iFilm
 | iFilm_Actor
 | iFilm_Category
 | iFilm_Text
 | iInventory
 | iLanguage
 | iPayment
 | iRental
 | iStaff
 | iStore
 | iActor_Info
 | iCustomer_List
 | iFilm_List
 | iNicer_But_Slower_Film_List
 | iSales_By_Film_Category
 | iSales_By_Store
 | iStaff_List;

export const TABLES = {} as Record<RestShortTableNames, C6RestfulModel<any, any, any>>;
export const VIEWS = {} as Record<RestShortViewNames, C6RestfulModel<any, any, any>>;

export const C6Core: iC6Object<RestTableInterfaces> = {
    ...C6Constants,
    C6VERSION: '6.4.2',
    IMPORT: async (tableName: string): Promise<iDynamicApiImport> => {
        tableName = tableName.toLowerCase();

        const error = (table: string) => {
            throw Error('Table (' + table + ') does not exist in the TABLES object. Possible values include (' + Object.keys(TABLES).join(', ') + ')');
        };

        if (!TABLES[tableName as RestShortTableNames]) {
            if (!tableName.startsWith(RestTablePrefix.toLowerCase())) {
                error(tableName);
            }
            tableName = removePrefixIfExists(tableName, RestTablePrefix);
            if (!TABLES[tableName as RestShortTableNames]) {
                error(tableName);
            }
        }

        const toPascalUnderscore = (name: string) =>
            name
                .split("_")
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join("_");

        const relation = TABLES[tableName as RestShortTableNames];
        const moduleDir = relation?.RELATION_TYPE === 'VIEW' ? 'views' : 'tables';

        return import(
            /* @vite-ignore */ `./${moduleDir}/${toPascalUnderscore(tableName)}`
        );
    },
    PREFIX: RestTablePrefix,
    TABLES: TABLES as any,
    VIEWS: VIEWS as any,
    ORM: {},
};

export type tStatefulApiData<T> = T[] | undefined;

// this refers to the value types of the keys above, aka values in the state
export interface iRestfulObjectArrayTypes {
    actor: tStatefulApiData<iActor>,
    address: tStatefulApiData<iAddress>,
    binary_test: tStatefulApiData<iBinary_Test>,
    category: tStatefulApiData<iCategory>,
    city: tStatefulApiData<iCity>,
    country: tStatefulApiData<iCountry>,
    customer: tStatefulApiData<iCustomer>,
    film: tStatefulApiData<iFilm>,
    film_actor: tStatefulApiData<iFilm_Actor>,
    film_category: tStatefulApiData<iFilm_Category>,
    film_text: tStatefulApiData<iFilm_Text>,
    inventory: tStatefulApiData<iInventory>,
    language: tStatefulApiData<iLanguage>,
    payment: tStatefulApiData<iPayment>,
    rental: tStatefulApiData<iRental>,
    staff: tStatefulApiData<iStaff>,
    store: tStatefulApiData<iStore>,
    actor_info: tStatefulApiData<iActor_Info>,
    customer_list: tStatefulApiData<iCustomer_List>,
    film_list: tStatefulApiData<iFilm_List>,
    nicer_but_slower_film_list: tStatefulApiData<iNicer_But_Slower_Film_List>,
    sales_by_film_category: tStatefulApiData<iSales_By_Film_Category>,
    sales_by_store: tStatefulApiData<iSales_By_Store>,
    staff_list: tStatefulApiData<iStaff_List>,
}

export type tRestfulObjectArrayValues = iRestfulObjectArrayTypes[keyof iRestfulObjectArrayTypes];

export const initialRestfulObjectsState: iRestfulObjectArrayTypes = {
    actor: undefined,
    address: undefined,
    binary_test: undefined,
    category: undefined,
    city: undefined,
    country: undefined,
    customer: undefined,
    film: undefined,
    film_actor: undefined,
    film_category: undefined,
    film_text: undefined,
    inventory: undefined,
    language: undefined,
    payment: undefined,
    rental: undefined,
    staff: undefined,
    store: undefined,
    actor_info: undefined,
    customer_list: undefined,
    film_list: undefined,
    nicer_but_slower_film_list: undefined,
    sales_by_film_category: undefined,
    sales_by_store: undefined,
    staff_list: undefined,
};

export const COLUMNS = {
    'actor.actor_id': 'actor_id','actor.first_name': 'first_name','actor.last_name': 'last_name','actor.last_update': 'last_update',
'address.address_id': 'address_id','address.address': 'address','address.address2': 'address2','address.district': 'district','address.city_id': 'city_id','address.postal_code': 'postal_code','address.phone': 'phone','address.location': 'location','address.last_update': 'last_update',
'binary_test.id': 'id','binary_test.bin_col': 'bin_col',
'category.category_id': 'category_id','category.name': 'name','category.last_update': 'last_update',
'city.city_id': 'city_id','city.city': 'city','city.country_id': 'country_id','city.last_update': 'last_update',
'country.country_id': 'country_id','country.country': 'country','country.last_update': 'last_update',
'customer.customer_id': 'customer_id','customer.store_id': 'store_id','customer.first_name': 'first_name','customer.last_name': 'last_name','customer.email': 'email','customer.address_id': 'address_id','customer.active': 'active','customer.create_date': 'create_date','customer.last_update': 'last_update',
'film.film_id': 'film_id','film.title': 'title','film.description': 'description','film.release_year': 'release_year','film.language_id': 'language_id','film.original_language_id': 'original_language_id','film.rental_duration': 'rental_duration','film.rental_rate': 'rental_rate','film.length': 'length','film.replacement_cost': 'replacement_cost','film.rating': 'rating','film.special_features': 'special_features','film.last_update': 'last_update',
'film_actor.actor_id': 'actor_id','film_actor.film_id': 'film_id','film_actor.last_update': 'last_update',
'film_category.film_id': 'film_id','film_category.category_id': 'category_id','film_category.last_update': 'last_update',
'film_text.film_id': 'film_id','film_text.title': 'title','film_text.description': 'description',
'inventory.inventory_id': 'inventory_id','inventory.film_id': 'film_id','inventory.store_id': 'store_id','inventory.last_update': 'last_update',
'language.language_id': 'language_id','language.name': 'name','language.last_update': 'last_update',
'payment.payment_id': 'payment_id','payment.customer_id': 'customer_id','payment.staff_id': 'staff_id','payment.rental_id': 'rental_id','payment.amount': 'amount','payment.payment_date': 'payment_date','payment.last_update': 'last_update',
'rental.rental_id': 'rental_id','rental.rental_date': 'rental_date','rental.inventory_id': 'inventory_id','rental.customer_id': 'customer_id','rental.return_date': 'return_date','rental.staff_id': 'staff_id','rental.last_update': 'last_update',
'staff.staff_id': 'staff_id','staff.first_name': 'first_name','staff.last_name': 'last_name','staff.address_id': 'address_id','staff.picture': 'picture','staff.email': 'email','staff.store_id': 'store_id','staff.active': 'active','staff.username': 'username','staff.password': 'password','staff.last_update': 'last_update',
'store.store_id': 'store_id','store.manager_staff_id': 'manager_staff_id','store.address_id': 'address_id','store.last_update': 'last_update',
'actor_info.actor_id': 'actor_id','actor_info.first_name': 'first_name','actor_info.last_name': 'last_name','actor_info.film_info': 'film_info',
'customer_list.ID': 'ID','customer_list.name': 'name','customer_list.address': 'address','customer_list.zip code': 'zip code','customer_list.phone': 'phone','customer_list.city': 'city','customer_list.country': 'country','customer_list.notes': 'notes','customer_list.SID': 'SID',
'film_list.FID': 'FID','film_list.title': 'title','film_list.description': 'description','film_list.category': 'category','film_list.price': 'price','film_list.length': 'length','film_list.rating': 'rating','film_list.actors': 'actors',
'nicer_but_slower_film_list.FID': 'FID','nicer_but_slower_film_list.title': 'title','nicer_but_slower_film_list.description': 'description','nicer_but_slower_film_list.category': 'category','nicer_but_slower_film_list.price': 'price','nicer_but_slower_film_list.length': 'length','nicer_but_slower_film_list.rating': 'rating','nicer_but_slower_film_list.actors': 'actors',
'sales_by_film_category.category': 'category','sales_by_film_category.total_sales': 'total_sales',
'sales_by_store.store': 'store','sales_by_store.manager': 'manager','sales_by_store.total_sales': 'total_sales',
'staff_list.ID': 'ID','staff_list.name': 'name','staff_list.address': 'address','staff_list.zip code': 'zip code','staff_list.phone': 'phone','staff_list.city': 'city','staff_list.country': 'country','staff_list.SID': 'SID',
};

export const GLOBAL_REST_PARAMETERS: Omit<iRest<
    RestShortTableNames,
    RestTableInterfaces>, "requestMethod" | "restModel"> = {
        C6: C6Core,
        restURL: "/rest/",
};

export const registerC6Table = (
    shortName: string,
    bindingName: string,
    tableModel: Record<string, any>,
    restBinding: Record<string, any>,
    relationType: 'TABLE' | 'VIEW' = 'TABLE',
) => {
    (TABLES as Record<string, C6RestfulModel<any, any, any>>)[shortName] = tableModel as C6RestfulModel<any, any, any>;
    if (relationType === 'VIEW') {
        (VIEWS as Record<string, C6RestfulModel<any, any, any>>)[shortName] = tableModel as C6RestfulModel<any, any, any>;
    }
    (C6Core as Record<string, unknown>)[shortName] = tableModel;
    (C6Core.ORM as Record<string, unknown>)[bindingName] = restBinding;
};
