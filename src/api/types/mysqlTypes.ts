
// ========================
// 🔧 SQL Operator & Helpers
// ========================

export type SQLFunction =
    | 'COUNT'
    | 'GROUP_CONCAT'
    | 'MAX'
    | 'MIN'
    | 'SUM'
    | 'DISTINCT';

export type SQLComparisonOperator =
    | '='
    | '!='
    | '<'
    | '<='
    | '>'
    | '>='
    | 'IN'
    | 'NOT IN'
    | 'LIKE'
    | 'IS NULL'
    | 'IS NOT NULL'
    | 'BETWEEN'
    | 'LESS_THAN'
    | 'GREATER_THAN';

export type JoinType = 'INNER' | 'LEFT_OUTER' | 'RIGHT_OUTER';

export type OrderDirection = 'ASC' | 'DESC';

