
export function sortAndSerializeQueryObject(tables: String, query: Object) {
    const orderedQuery = Object.keys(query).sort().reduce(
        (obj, key) => {
            obj[key] = query[key];
            return obj;
        },
        {}
    );

    return tables + ' ' + JSON.stringify(orderedQuery);
}