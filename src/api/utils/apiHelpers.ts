// When we capture DropExceptions and display them as a custom page, this will change.
import {toast} from "react-toastify";
import isTest from "../../variables/isTest";
import { AxiosResponse } from "axios";
import {toastOptions} from "../../variables/toastOptions";
import {iC6RestfulModel} from "../types/ormInterfaces";





export function TestRestfulResponse(response: AxiosResponse | any, success: ((r: AxiosResponse) => (string | void)) | string | undefined, error: ((r: AxiosResponse) => (string | void)) | string | undefined): string | boolean | number {

    if (undefined === response.data?.['ERROR TYPE']
        && (undefined !== response?.data?.rest
            || undefined !== response.data?.created
            || undefined !== response.data?.updated
            || undefined !== response.data?.deleted)) {

        let successReturn: string | undefined | void = 'function' === typeof success ? success?.(response) : success;

        if (typeof successReturn === 'string') {

            toast.success(successReturn, toastOptions);

        }

        // this could end up with bad results for deleting id's === 0
        return response.data.created ?? response.data.updated ?? response.data.deleted ?? true;

    }

    let errorReturn: string | undefined | void = 'function' === typeof error ? error?.(response) : error;

    if (typeof errorReturn === 'string') {

        toast.error(errorReturn, toastOptions);

    }

    return false;

}

export function removePrefixIfExists(tableName: string, prefix: string): string {
    if (tableName.startsWith(prefix.toLowerCase())) {
        return tableName.slice(prefix.length);
    }
    return tableName;
}

export function removeInvalidKeys<iRestObject>(request: any, c6Tables: {
    [key: string]: (iC6RestfulModel<any,any,any> & { [key: string]: any })
}): iRestObject {

    let intersection: iRestObject = {} as iRestObject

    let restfulObjectKeys: string[] = [];

    const tableList = Object.values(c6Tables)

    tableList.forEach(table => Object.values(table.COLUMNS).forEach(column => {

        if (false === restfulObjectKeys.includes(column)) {

            restfulObjectKeys.push(column)

        }

    }))

    Object.keys(request).forEach(key => {

        if (restfulObjectKeys.includes(key)) {

            intersection[key] = request[key]

        }

    });

    isTest() || console.log('intersection', intersection)

    return intersection

}