import {apiReturn, iAPI, iRest} from "@carbonorm/carbonnode";
import {Modify} from "../types/modifyTypes";

export abstract class Executor<
    CustomAndRequiredFields extends { [key: string]: any },           // CustomAndRequiredFields
    RestTableInterfaces extends  { [key: string]: any },            // RestTableInterfaces
    RequestTableOverrides = { [key in keyof RestTableInterfaces]: any },   // RequestTableOverrides
    ResponseDataType = any,                // ResponseDataType
    RestShortTableNames extends string = ""    // RestShortTableNames
> {

    public constructor(
        protected config: iRest<
            CustomAndRequiredFields,
            RestTableInterfaces,
            RequestTableOverrides,
            ResponseDataType,
            RestShortTableNames
        >,
        protected request: iAPI<Modify<RestTableInterfaces, RequestTableOverrides>> & CustomAndRequiredFields = {} as iAPI<Modify<RestTableInterfaces, RequestTableOverrides>> & CustomAndRequiredFields
    ) {
    }

    abstract execute(): Promise<apiReturn<ResponseDataType>>

}