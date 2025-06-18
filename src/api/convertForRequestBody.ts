import {C6Constants} from "api/C6Constants";
import {iC6Object, iC6RestfulModel} from "./types/ormInterfaces";


export default function <RestTableInterfaces extends { [key:string] : any }>(restfulObject: RestTableInterfaces, tableName: string | string[], C6: iC6Object, regexErrorHandler: (message:string) => void = alert) {

    let payload = {};

    const tableNames = Array.isArray(tableName) ? tableName : [tableName];

    let tableDefinitions : (iC6RestfulModel & any)[] = [];

    tableNames.forEach((tableName) => {

        let tableDefinition = Object.values(C6.TABLES).find((tableDefinition) => tableDefinition.TABLE_NAME === tableName);

        if (undefined === tableDefinition) {

            console.error(`Table name (${tableName}) is not found in the C6.TABLES object.`, C6.TABLES);

            throw new Error(`Table name (${tableName}) is not found in the C6.TABLES object.`);

        }

        tableDefinitions.push(tableDefinition);

    })

    tableDefinitions.forEach((tableDefinition) => {

        Object.keys(restfulObject).forEach(value => {

            let shortReference = value.toUpperCase();

            switch (value) {
                case C6Constants.GET:
                case C6Constants.POST:
                case C6Constants.UPDATE:
                case C6Constants.REPLACE:
                case C6Constants.DELETE:
                case C6Constants.WHERE:
                case C6Constants.JOIN:
                case C6Constants.PAGINATION:
                    if (Array.isArray(restfulObject[value])) {
                        payload[value] = restfulObject[value].sort()
                    } else if (typeof restfulObject[value] === 'object' && restfulObject[value] !== null) {
                        payload[value] = Object.keys(restfulObject[value])
                            .sort()
                            .reduce((acc, key) => ({
                                ...acc, [key]: restfulObject[value][key]
                            }), {})
                    }
                    return
                default:
            }

            if (shortReference in tableDefinition) {

                const longName = tableDefinition[shortReference];

                payload[longName] = restfulObject[value]

                const regexValidations = tableDefinition.REGEX_VALIDATION[longName]

                if (regexValidations instanceof RegExp) {

                    if (false === regexValidations.test(restfulObject[value])) {

                        regexErrorHandler('Failed to match regex (' + regexValidations + ') for column (' + longName + ')')

                        throw Error('Failed to match regex (' + regexValidations + ') for column (' + longName + ')')

                    }

                } else if (typeof regexValidations === 'object' && regexValidations !== null) {

                    Object.keys(regexValidations)?.forEach((errorMessage) => {

                        const regex : RegExp = regexValidations[errorMessage];

                        if (false === regex.test(restfulObject[value])) {

                            const devErrorMessage = 'Failed to match regex (' + regex + ') for column (' + longName + ')';

                            regexErrorHandler(errorMessage ?? devErrorMessage)

                            throw Error(devErrorMessage)

                        }

                    })

                }

            }

        })

        return true;

    });

    return Object.keys(payload)
        .sort()
        .reduce((acc, key) => ({
            ...acc, [key]: payload[key]
        }), {})

};
