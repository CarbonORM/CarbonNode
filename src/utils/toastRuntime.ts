import type {ToastOptions} from "variables/toastOptions";

export type ToastLevel = "success" | "error" | "info" | "warning";
export type ToastHandler = (
    level: ToastLevel,
    message: string,
    options?: ToastOptions,
) => void;

let toastHandler: ToastHandler | null = null;

export const setToastHandler = (handler: ToastHandler | null): void => {
    toastHandler = handler;
};

export const notifyToast = (
    level: ToastLevel,
    message: string,
    options?: ToastOptions,
): void => {
    toastHandler?.(level, message, options);
};
