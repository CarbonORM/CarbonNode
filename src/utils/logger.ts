/**
 * Conditionally emit logs based on log level.
 */
import {LogLevel, shouldLog} from "./logLevel";

export function group(title: string, data?: any): void {
    if (!shouldLog(LogLevel.DEBUG)) return;
    console.groupCollapsed(`%c${title}`, "color: #007acc");
    if (data !== undefined) console.log(data);
    console.groupEnd();
}

export function info(message: string, ...optional: any[]): void {
    if (!shouldLog(LogLevel.INFO)) return;
    console.info(`%cINFO: ${message}`, "color: #0a0", ...optional);
}

export function warn(message: string, ...optional: any[]): void {
    if (!shouldLog(LogLevel.WARN)) return;
    console.warn(`%cWARN: ${message}`, "color: #e90", ...optional);
}

export function error(message: string, ...optional: any[]): void {
    if (!shouldLog(LogLevel.ERROR)) return;
    console.error(`%cERROR: ${message}`, "color: #c00", ...optional);
}
