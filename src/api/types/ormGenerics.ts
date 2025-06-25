// types/ormGenerics.ts
import { iRestMethods } from './ormInterfaces';

export type OrmGenerics<
    RequestMethod extends iRestMethods = iRestMethods,
    RestShortTableName extends string | string[] = any,
    RestTableInterface extends Record<string, any> = any,
    PrimaryKey extends keyof RestTableInterface & string = keyof RestTableInterface & string,
    CustomAndRequiredFields extends Record<string, any> = any,
    RequestTableOverrides extends { [key in keyof RestTableInterface]: any } = { [key in keyof RestTableInterface]: any }
> = {
    RequestMethod: RequestMethod;
    RestShortTableName: RestShortTableName;
    RestTableInterface: RestTableInterface;
    PrimaryKey: PrimaryKey;
    CustomAndRequiredFields: CustomAndRequiredFields;
    RequestTableOverrides: RequestTableOverrides;
};
