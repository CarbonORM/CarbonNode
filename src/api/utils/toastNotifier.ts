import { toast } from "react-toastify";
import { toastOptions, toastOptionsDevs } from "variables/toastOptions";
import isLocal from "variables/isLocal";

export function onSuccess(message: string): void {
    toast.success(message, isLocal() ? toastOptionsDevs : toastOptions);
}

export function onError(message: string): void {
    toast.error(message, isLocal() ? toastOptionsDevs : toastOptions);
}
