import { C6Constants } from "../constants/C6Constants";
import {iC6Object, C6RestfulModel, iRestMethods, RequestQueryBody} from "../types/ormInterfaces";
import {LogLevel, logWithLevel} from "../utils/logLevel";

export default function <
    RequestMethod extends iRestMethods,
    RestTableInterface extends { [key: string]: any },
    CustomAndRequiredFields extends { [key: string]: any } = {},
    RequestTableOverrides extends { [K in keyof RestTableInterface]?: any } = {}
>(
    restfulObject: RequestQueryBody<RequestMethod, RestTableInterface, CustomAndRequiredFields, RequestTableOverrides>,
    tableName: string | string[],
    C6: iC6Object,
    regexErrorHandler: (message: string) => void = alert
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
                C6Constants.UPDATE,
                C6Constants.REPLACE,
                C6Constants.DELETE,
                C6Constants.WHERE,
                C6Constants.JOIN,
                C6Constants.PAGINATION
            ].includes(value)) {
                const val = restfulObject[value];
                if (Array.isArray(val)) {
                    payload[value] = val.sort();
                } else if (typeof val === 'object' && val !== null) {
                    payload[value] = Object.keys(val)
                        .sort()
                        .reduce((acc, key) => ({ ...acc, [key]: val[key] }), {});
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
