


export interface SqlBuilderResult {
    sql: string;
    params: any[] | { [key: string]: any };  // params can be an array or an object for named placeholders
}


export function convertHexIfBinary(
    _col: string,
    val: any,
    columnDef?: any
): any {
    if (
        typeof val === 'string' &&
        /^[0-9a-fA-F]{32}$/.test(val) &&
        typeof columnDef === 'object' &&
        columnDef.MYSQL_TYPE.toUpperCase().includes('BINARY')
    ) {
        return Buffer.from(val, 'hex');
    }
    return val;
}
