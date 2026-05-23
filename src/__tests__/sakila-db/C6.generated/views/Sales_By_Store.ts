// noinspection JSUnusedGlobalSymbols,SpellCheckingInspection

import { restRequest } from "@carbonorm/carbonnode";
import {
    GLOBAL_REST_PARAMETERS,
    registerC6Table,
} from "../core";

/**
CREATE VIEW `sales_by_store` AS select concat(`c`.`city`,_utf8mb4',',`cy`.`country`) AS `store`,concat(`m`.`first_name`,_utf8mb4' ',`m`.`last_name`) AS `manager`,sum(`p`.`amount`) AS `total_sales` from (((((((`payment` `p` join `rental` `r` on((`p`.`rental_id` = `r`.`rental_id`))) join `inventory` `i` on((`r`.`inventory_id` = `i`.`inventory_id`))) join `store` `s` on((`i`.`store_id` = `s`.`store_id`))) join `address` `a` on((`s`.`address_id` = `a`.`address_id`))) join `city` `c` on((`a`.`city_id` = `c`.`city_id`))) join `country` `cy` on((`c`.`country_id` = `cy`.`country_id`))) join `staff` `m` on((`s`.`manager_staff_id` = `m`.`staff_id`))) group by `s`.`store_id` order by `cy`.`country`,`c`.`city`;
**/

export interface iSales_By_Store {
    'store'?: string | null;
    'manager'?: string | null;
    'total_sales'?: number | null;
}

export type Sales_By_StorePrimaryKeys = never;

const sales_by_store: Record<string, any> & {
        TABLE_NAME: 'sales_by_store';
        RELATION_TYPE: 'VIEW';
        READ_ONLY: true;
    } = {
    TABLE_NAME: 'sales_by_store',
    RELATION_TYPE: 'VIEW',
    READ_ONLY: true,
    STORE: 'sales_by_store.store',
    MANAGER: 'sales_by_store.manager',
    TOTAL_SALES: 'sales_by_store.total_sales',
    PRIMARY: [],
    PRIMARY_SHORT: [],
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
    TABLE_REFERENCES: {},
    TABLE_REFERENCED_BY: {}
}

export const Sales_By_Store = {
    ...sales_by_store,
    Get: (restRequest as any)(() => ({
        ...GLOBAL_REST_PARAMETERS,
        restModel: sales_by_store as any,
        requestMethod: 'GET',
    }))
}

registerC6Table(
    'sales_by_store',
    'Sales_By_Store',
    sales_by_store,
    Sales_By_Store,
    'VIEW',
);

export default Sales_By_Store;
