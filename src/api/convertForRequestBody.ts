import {C6} from "api/C6";


export default function <RestTableInterfaces extends { [key:string] : any }>(restfulObject: RestTableInterfaces, tableName: string | string[], regexErrorHandler: (message:string) => void = alert) {

    let payload = {};

    const tableNames = Array.isArray(tableName) ? tableName : [tableName];

    tableNames.forEach((table) => {

        if (!(table in C6)) {

            console.error(`Table name (${table}) is not found in the C6 object.`, C6);

            throw new Error(`Table name (${table}) is not found in the C6 object.`);

        }

        Object.keys(restfulObject).map(value => {

            let shortReference = value.toUpperCase();

            switch (value) {
                case C6.GET:
                case C6.POST:
                case C6.UPDATE:
                case C6.REPLACE:
                case C6.DELETE:
                case C6.WHERE:
                case C6.JOIN:
                case C6.PAGINATION:
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

                    Object.keys(regexValidations)?.map((errorMessage) => {

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
