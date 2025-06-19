import {apiReturn, iAPI, iRest} from "@carbonorm/carbonnode";
import {Modify} from "../types/modifyTypes";

export abstract class Executor<
    RestShortTableName extends string = any,
    RestTableInterface extends { [key: string]: any } = any,
    PrimaryKey extends Extract<keyof RestTableInterface, string> = Extract<keyof RestTableInterface, string>,
    CustomAndRequiredFields extends { [key: string]: any } = any,
    RequestTableOverrides extends { [key: string]: any; } = { [key in keyof RestTableInterface]: any },
    ResponseDataType = any
> {

    public constructor(
        protected config: iRest<
            RestShortTableName,
            RestTableInterface,
            PrimaryKey,
            CustomAndRequiredFields,
            RequestTableOverrides,
            ResponseDataType
        >,
        protected request: iAPI<Modify<RestTableInterface, RequestTableOverrides>> & CustomAndRequiredFields = {} as iAPI<Modify<RestTableInterface, RequestTableOverrides>> & CustomAndRequiredFields
    ) {
    }

    abstract execute(): Promise<apiReturn<ResponseDataType>>

}