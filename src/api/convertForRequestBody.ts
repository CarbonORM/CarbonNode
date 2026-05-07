import { C6Constants } from "../constants/C6Constants";
import {iC6Object, C6RestfulModel, iRestMethods, RequestQueryBody} from "../types/ormInterfaces";
import {LogLevel, logWithLevel} from "../utils/logLevel";
import {sortQueryValue} from "../utils/sortAndSerializeQueryObject";

const sortShallowObjectKeys = (value: any) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return value;
    }

    return Object.keys(value)
        .sort()
        .reduce((acc, key) => {
            acc[key] = value[key];
            return acc;
        }, {} as Record<string, any>);
};

const SHALLOW_SORT_CONTROL_KEYS = new Set<string>([
    C6Constants.UPDATE,
    C6Constants.INSERT,
    C6Constants.REPLACE,
]);

export default function <
    RequestMethod extends iRestMethods,
    RestTableInterface extends { [key: string]: any },
    CustomAndRequiredFields extends { [key: string]: any } = {},
    RequestTableOverrides extends { [K in keyof RestTableInterface]?: any } = {}
>(
    restfulObject: RequestQueryBody<RequestMethod, RestTableInterface, CustomAndRequiredFields, RequestTableOverrides>,
    tableName: string | string[],
    C6: iC6Object,
    regexErrorHandler: (message: string) => void = (message: string) => {
        if (typeof globalThis !== "undefined" && typeof (globalThis as any).alert === "function") {
            (globalThis as any).alert(message);
        }
    }
) {
    const payload: Record<string, any> = {};
    const tableNames = Array.isArray(tableName) ? tableName : [tableName];

    const tableDefinitions: (C6RestfulModel<any, any, any> & any)[] = tableNames.map((name) => {
        const tableDefinition = Object.values(C6.TABLES).find((t) => t.TABLE_NAME === name);
        if (!tableDefinition) {
            logWithLevel(
                LogLevel.ERROR,
                undefined,
                console.error,
                `Table name (${name}) is not found in the C6.TABLES object.`,
                C6.TABLES,
            );
            throw new Error(`Table name (${name}) is not found in the C6.TABLES object.`);
        }
        return tableDefinition;
    });

    for (const tableDefinition of tableDefinitions) {
        for (const value of Object.keys(restfulObject)) {
            const shortReference = value.toUpperCase();
            
            if ([
                C6Constants.GET,
                C6Constants.POST,
                C6Constants.DB,
                C6Constants.SELECT,
                C6Constants.ORDER,
                C6Constants.UPDATE,
                C6Constants.INSERT,
                C6Constants.REPLACE,
                C6Constants.DELETE,
                C6Constants.WHERE,
                C6Constants.JOIN,
                C6Constants.GROUP_BY,
                C6Constants.HAVING,
                C6Constants.INDEX_HINTS,
                C6Constants.PAGINATION,
                "cacheResults",
            ].includes(value)) {
                const controlValue = restfulObject[value];

                if (SHALLOW_SORT_CONTROL_KEYS.has(value)) {
                    payload[value] = Array.isArray(controlValue)
                        ? [...controlValue]
                        : sortShallowObjectKeys(controlValue);
                } else {
                    payload[value] = sortQueryValue(controlValue);
                }
                continue;
            }

            if (shortReference in tableDefinition) {
                const longName = tableDefinition[shortReference];
                const columnValue = restfulObject[value];
                payload[longName] = columnValue;

                const regexValidations = tableDefinition.REGEX_VALIDATION[longName];

                if (regexValidations instanceof RegExp) {
                    if (!regexValidations.test(columnValue)) {
                        regexErrorHandler(`Failed to match regex (${regexValidations}) for column (${longName})`);
                        throw new Error(`Failed to match regex (${regexValidations}) for column (${longName})`);
                    }
                } else if (typeof regexValidations === 'object' && regexValidations !== null) {
                    for (const errorMessage in regexValidations) {
                        const regex: RegExp = regexValidations[errorMessage];
                        if (!regex.test(columnValue)) {
                            const devErrorMessage = `Failed to match regex (${regex}) for column (${longName})`;
                            regexErrorHandler(errorMessage || devErrorMessage);
                            throw new Error(devErrorMessage);
                        }
                    }
                }
            } else if (Object.keys(tableDefinition.COLUMNS).includes(value)) {
                // Already using a fully qualified column name
                const columnValue = restfulObject[value];
                payload[value] = columnValue;

                const regexValidations = tableDefinition.REGEX_VALIDATION[value];

                if (regexValidations instanceof RegExp) {
                    if (!regexValidations.test(columnValue)) {
                        regexErrorHandler(`Failed to match regex (${regexValidations}) for column (${value})`);
                        throw new Error(`Failed to match regex (${regexValidations}) for column (${value})`);
                    }
                } else if (typeof regexValidations === 'object' && regexValidations !== null) {
                    for (const errorMessage in regexValidations) {
                        const regex: RegExp = regexValidations[errorMessage];
                        if (!regex.test(columnValue)) {
                            const devErrorMessage = `Failed to match regex (${regex}) for column (${value})`;
                            regexErrorHandler(errorMessage || devErrorMessage);
                            throw new Error(devErrorMessage);
                        }
                    }
                }
            }
        }
    }

    return Object.keys(payload)
        .sort()
        .reduce((acc, key) => ({ ...acc, [key]: payload[key] }), {});
}
