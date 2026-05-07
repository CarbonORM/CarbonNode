const isPlainObject = (value: unknown): value is Record<string, any> =>
    Object.prototype.toString.call(value) === "[object Object]";

export function sortQueryValue<T>(value: T): T {
    if (Array.isArray(value)) {
        return value.map((entry) => sortQueryValue(entry)) as T;
    }

    if (!isPlainObject(value)) {
        return value;
    }

    return Object.keys(value)
        .sort()
        .reduce((acc, key) => {
            acc[key] = sortQueryValue(value[key]);
            return acc;
        }, {} as Record<string, any>) as T;
}

export function sortAndSerializeQueryObject(
    tables: string,
    query: Record<string, any>,
) {
    return `${tables} ${JSON.stringify(sortQueryValue(query))}`;
}
