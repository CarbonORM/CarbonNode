import isVerbose from "variables/isVerbose";

/**
 * Conditionally group a log if verbose.
 */
export function group(title: string, data?: any): void {
    if (!isVerbose) return;
    console.groupCollapsed(`%c${title}`, "color: #007acc");
    if (data !== undefined) console.log(data);
    console.groupEnd();
}

export function info(message: string, ...optional: any[]): void {
    if (!isVerbose) return;
    console.info(`%cINFO: ${message}`, "color: #0a0", ...optional);
}

export function warn(message: string, ...optional: any[]): void {
    console.warn(`%cWARN: ${message}`, "color: #e90", ...optional);
}

export function error(message: string, ...optional: any[]): void {
    console.error(`%cERROR: ${message}`, "color: #c00", ...optional);
}
