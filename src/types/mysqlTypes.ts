// ========================
// SQL Operators & Expressions
// ========================

export const SQL_KNOWN_FUNCTIONS = [
    'ADDDATE',
    'ADDTIME',
    'CONCAT',
    'CONVERT_TZ',
    'COUNT',
    'COUNT_ALL',
    'CURRENT_DATE',
    'CURRENT_TIMESTAMP',
    'DAY',
    'DAY_HOUR',
    'DAY_MICROSECOND',
    'DAY_MINUTE',
    'DAY_SECOND',
    'DAYNAME',
    'DAYOFMONTH',
    'DAYOFWEEK',
    'DAYOFYEAR',
    'DATE',
    'DATE_ADD',
    'DATEDIFF',
    'DATE_SUB',
    'DATE_FORMAT',
    'EXTRACT',
    'FROM_DAYS',
    'FROM_UNIXTIME',
    'GET_FORMAT',
    'GROUP_CONCAT',
    'HEX',
    'HOUR',
    'HOUR_MICROSECOND',
    'HOUR_MINUTE',
    'HOUR_SECOND',
    'INTERVAL',
    'LOCALTIME',
    'LOCALTIMESTAMP',
    'MAKEDATE',
    'MAKETIME',
    'MAX',
    'MBRContains',
    'MICROSECOND',
    'MIN',
    'MINUTE',
    'MINUTE_MICROSECOND',
    'MINUTE_SECOND',
    'MONTH',
    'MONTHNAME',
    'NOW',
    'POINT',
    'POLYGON',
    'SECOND',
    'SECOND_MICROSECOND',
    'ST_Area',
    'ST_AsBinary',
    'ST_AsText',
    'ST_Buffer',
    'ST_Contains',
    'ST_Crosses',
    'ST_Difference',
    'ST_Dimension',
    'ST_Disjoint',
    'ST_Distance',
    'ST_Distance_Sphere',
    'ST_EndPoint',
    'ST_Envelope',
    'ST_Equals',
    'ST_GeomFromGeoJSON',
    'ST_GeomFromText',
    'ST_GeomFromWKB',
    'ST_Intersects',
    'ST_Length',
    'ST_MakeEnvelope',
    'ST_Overlaps',
    'ST_Point',
    'ST_SetSRID',
    'ST_SRID',
    'ST_StartPoint',
    'ST_SymDifference',
    'ST_Touches',
    'ST_Union',
    'ST_Within',
    'ST_X',
    'ST_Y',
    'STR_TO_DATE',
    'SUBDATE',
    'SUBTIME',
    'SUM',
    'SYSDATE',
    'TIME',
    'TIME_FORMAT',
    'TIME_TO_SEC',
    'TIMEDIFF',
    'TIMESTAMP',
    'TIMESTAMPADD',
    'TIMESTAMPDIFF',
    'TO_DAYS',
    'TO_SECONDS',
    'TRANSACTION_TIMESTAMP',
    'UNHEX',
    'UNIX_TIMESTAMP',
    'UTC_DATE',
    'UTC_TIME',
    'UTC_TIMESTAMP',
    'WEEKDAY',
    'WEEKOFYEAR',
    'YEARWEEK',
] as const;

export type SQLKnownFunction = typeof SQL_KNOWN_FUNCTIONS[number];

// Backwards alias for existing public import name.
export type SQLFunction = SQLKnownFunction;

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

export type SQLExpression =
    | string
    | number
    | boolean
    | null
    | SQLExpressionTuple;

export type SQLExpressionTuple =
    | ['AS', SQLExpression, string]
    | ['DISTINCT', SQLExpression]
    | ['CALL', string, ...SQLExpression[]]
    | ['LIT', any]
    | ['PARAM', any]
    | ['SUBSELECT', Record<string, any>]
    | [SQLKnownFunction, ...SQLExpression[]];

export type OrderTerm = [SQLExpression, OrderDirection?];
