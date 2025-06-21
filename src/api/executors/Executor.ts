import {
    apiReturn,
    DetermineResponseDataType,
    iRest,
    iRestMethods,
    iRestReactiveLifecycle,
    RequestQueryBody
} from "@carbonorm/carbonnode";
import isVerbose from "../../variables/isVerbose";

export abstract class Executor<
    RequestMethod extends iRestMethods,
    RestShortTableName extends string = any,
    RestTableInterface extends { [key: string]: any } = any,
    PrimaryKey extends Extract<keyof RestTableInterface, string> = Extract<keyof RestTableInterface, string>,
    CustomAndRequiredFields extends { [key: string]: any } = any,
    RequestTableOverrides extends { [key in keyof RestTableInterface]: any } = { [key in keyof RestTableInterface]: any }
> {
    public constructor(
        protected config: iRest<
            RestShortTableName,
            RestTableInterface,
            PrimaryKey
        >,
        protected request: RequestQueryBody<
            RequestMethod,
            RestTableInterface,
            CustomAndRequiredFields,
            RequestTableOverrides
        >
    ) {}

    abstract execute(): Promise<apiReturn<DetermineResponseDataType<RequestMethod, RestTableInterface>>>;

    async runLifecycleHooks<
        Phase extends keyof iRestReactiveLifecycle<
            RequestMethod,
            RestShortTableName,
            RestTableInterface,
            PrimaryKey,
            CustomAndRequiredFields,
            RequestTableOverrides
        >
    >(
        phase: Phase,
        args: Parameters<NonNullable<
            iRestReactiveLifecycle<
                RequestMethod,
                RestShortTableName,
                RestTableInterface,
                PrimaryKey,
                CustomAndRequiredFields,
                RequestTableOverrides
            >[Phase]
        >[string]>[0]
    ): Promise<void> {
        const lifecycleGroup = this.config.restModel.LIFECYCLE_HOOKS[this.config.requestMethod]?.[phase];

        if (!lifecycleGroup) return;

        for (const [key, fn] of Object.entries(lifecycleGroup)) {
            if (typeof fn === "function") {
                if (isVerbose || (args.request as any).debug) {
                    console.groupCollapsed(`[LIFECYCLE] ${this.config.requestMethod}.${String(phase)}:${key}`);
                    console.log("config:", args.config);
                    console.log("request:", args.request);
                    if ("response" in args) {
                        console.log("response:", args.response);
                    }
                    console.groupEnd();
                }

                try {
                    await fn(args);
                } catch (err) {
                    console.error(`[LIFECYCLE ERROR] ${this.config.requestMethod}.${String(phase)}:${key}`, err);
                    throw err;
                }
            }
        }
    }
}
