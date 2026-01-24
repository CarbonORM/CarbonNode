import {OrmGenerics} from "../types/ormGenerics";
import {
    DetermineResponseDataType,
    iRest,
    iRestReactiveLifecycle,
    RequestQueryBody
} from "../types/ormInterfaces";

export abstract class Executor<
    G extends OrmGenerics
> {
    public constructor(
        protected config: iRest<
            G['RestShortTableName'],
            G['RestTableInterface'],
            G['PrimaryKey']
        >,
        protected request: RequestQueryBody<
            G['RequestMethod'],
            G['RestTableInterface'],
            G['CustomAndRequiredFields'],
            G['RequestTableOverrides']
        >,
        protected useNamedParams: boolean = false,
    ) {
    }

    abstract execute(): Promise<DetermineResponseDataType<G['RequestMethod'], G['RestTableInterface']>>;

    async runLifecycleHooks<
        Phase extends keyof iRestReactiveLifecycle<G>
    >(
        phase: Phase,
        args: Parameters<NonNullable<iRestReactiveLifecycle<G>[Phase]>[string]>[0]
    ): Promise<void> {
        const lifecycleGroup = this.config.restModel.LIFECYCLE_HOOKS[this.config.requestMethod]?.[phase];

        if (!lifecycleGroup) return;

        for (const [key, fn] of Object.entries(lifecycleGroup)) {
            if (typeof fn === "function") {
                if (this.config.verbose || (args.request as any).debug) {
                    console.groupCollapsed(`[LIFECYCLE] ${this.config.requestMethod}.${String(phase)}:${key}`);
                    console.log("config:", args.config);
                    console.log("request:", args.request);
                    if ("response" in args) {
                        console.log("response:", args.response);
                    }
                    console.groupEnd();
                }

                try {
                    // todo - this
                    await fn(args  as any);
                } catch (err) {
                    console.error(`[LIFECYCLE ERROR] ${this.config.requestMethod}.${String(phase)}:${key}`, err);
                    throw err;
                }
            }
        }
    }
}
