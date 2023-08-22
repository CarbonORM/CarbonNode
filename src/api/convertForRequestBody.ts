import {C6Constants} from "api/C6Constants";
import {C6Object} from "api/restRequest";


export default function <RestTableInterfaces extends { [key:string] : any }>(restfulObject: RestTableInterfaces, tableName: string | string[], C6: C6Object, regexErrorHandler: (message:string) => void = alert) {

    let payload = {};

    const tableNames = Array.isArray(tableName) ? tableName : [tableName];

    tableNames.forEach((table) => {

        if (!(table in C6)) {

            console.error(`Table name (${table}) is not found in the C6 object.`, C6);

            throw new Error(`Table name (${table}) is not found in the C6 object.`);

        }

        if (undefined === C6[table]) {

            console.log(`Table name (${table}) exists but is undefined in the C6 object. This is unexpected.`)

            throw new Error(`Table name (${table}) exists but is undefined in the C6 object. This is unexpected.`);

        }


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

            if (shortReference in C6[table]) {

                const longName = C6[table][shortReference];

                payload[longName] = restfulObject[value]

                const regexValidations = C6[table].REGEX_VALIDATION[longName]

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
