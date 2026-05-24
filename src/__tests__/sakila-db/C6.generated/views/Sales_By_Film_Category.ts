// noinspection JSUnusedGlobalSymbols,SpellCheckingInspection

import { restRequest } from "@carbonorm/carbonnode";
import {
    GLOBAL_REST_PARAMETERS,
    registerC6Table,
} from "../core";

/**
CREATE VIEW `sales_by_film_category` AS select `c`.`name` AS `category`,sum(`p`.`amount`) AS `total_sales` from (((((`payment` `p` join `rental` `r` on((`p`.`rental_id` = `r`.`rental_id`))) join `inventory` `i` on((`r`.`inventory_id` = `i`.`inventory_id`))) join `film` `f` on((`i`.`film_id` = `f`.`film_id`))) join `film_category` `fc` on((`f`.`film_id` = `fc`.`film_id`))) join `category` `c` on((`fc`.`category_id` = `c`.`category_id`))) group by `c`.`name` order by `total_sales` desc;
**/

export interface iSales_By_Film_Category {
    'category'?: string;
    'total_sales'?: number | null;
}

export type Sales_By_Film_CategoryPrimaryKeys = never;

const sales_by_film_category: Record<string, any> & {
        TABLE_NAME: 'sales_by_film_category';
        RELATION_TYPE: 'VIEW';
        READ_ONLY: true;
    } = {
    TABLE_NAME: 'sales_by_film_category',
    RELATION_TYPE: 'VIEW',
    READ_ONLY: true,
    CATEGORY: 'sales_by_film_category.category',
    TOTAL_SALES: 'sales_by_film_category.total_sales',
    PRIMARY: [],
    PRIMARY_SHORT: [],
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
    TABLE_REFERENCES: {},
    TABLE_REFERENCED_BY: {}
}

export const Sales_By_Film_Category = {
    ...sales_by_film_category,
    Get: (restRequest as any)(() => ({
        ...GLOBAL_REST_PARAMETERS,
        restModel: sales_by_film_category as any,
        requestMethod: 'GET',
    }))
}

registerC6Table(
    'sales_by_film_category',
    'Sales_By_Film_Category',
    sales_by_film_category,
    Sales_By_Film_Category,
    'VIEW',
);

export default Sales_By_Film_Category;
