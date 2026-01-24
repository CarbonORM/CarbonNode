import { toastOptions, toastOptionsDevs } from "variables/toastOptions";
import isLocal from "variables/isLocal";
import { notifyToast } from "./toastRuntime";

export function onSuccess(message: string): void {
    notifyToast("success", message, isLocal() ? toastOptionsDevs : toastOptions);
}

export function onError(message: string): void {
    notifyToast("error", message, isLocal() ? toastOptionsDevs : toastOptions);
}
