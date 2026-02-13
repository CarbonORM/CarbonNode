import { getEnvBool } from "../variables/getEnv";
import colorSql from "./colorSql";
import { version } from "../../package.json";
import versionToRgb from "./versionColor";
import type { LogContext } from "./logLevel";
import { LogLevel, shouldLog } from "./logLevel";

export type SqlAllowListStatus = "allowed" | "denied" | "not verified";
export type SqlCacheStatus = "hit" | "miss" | "ignored" | "evicted";

export type LogSqlContextOptions = {
    cacheStatus: SqlCacheStatus;
    allowListStatus: SqlAllowListStatus;
    method: string,
    sql: string,
    context?: LogContext,
};

const C = {
    SSR: "\x1b[95m", // bright magenta
    HTTP: "\x1b[94m", // bright blue
    SQL: "\x1b[96m", // bright cyan
    WARN: "\x1b[93m", // yellow
    ORANGE: "\x1b[38;2;255;165;0m", // orange (truecolor)
    ERROR: "\x1b[91m", // red
    METHOD_COLORS: {
        SELECT: "\x1b[92m", // green
        INSERT: "\x1b[96m", // cyan
        REPLACE: "\x1b[96m", // cyan
        UPDATE: "\x1b[95m", // magenta
        DELETE: "\x1b[38;2;255;179;179m", // very light red (truecolor)
    },
    METHOD_FALLBACK: [
        "\x1b[92m", // green
        "\x1b[93m", // yellow
        "\x1b[95m", // magenta
        "\x1b[96m", // cyan
        "\x1b[94m", // blue
        "\x1b[97m", // white
    ],
    GREY: "\x1b[90m", // light grey
    RESET: "\x1b[0m",
};

const rgbAnsi = ({ r, g, b }: { r: number; g: number; b: number }) =>
    `\x1b[38;2;${r};${g};${b}m`;

function hashString(value: string): number {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
        hash = (hash * 31 + value.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
}

function methodColor(method: string): string {
    const key = method.toUpperCase();
    if (key in C.METHOD_COLORS) {
        return C.METHOD_COLORS[key as keyof typeof C.METHOD_COLORS];
    }
    const idx = hashString(key) % C.METHOD_FALLBACK.length;
    return C.METHOD_FALLBACK[idx];
}

const cacheLabel = (cacheStatus: SqlCacheStatus): string => {
    switch (cacheStatus) {
        case "hit":
            return `${C.METHOD_COLORS.SELECT}[CACHE HIT]${C.RESET}`;
        case "evicted":
            return `${C.WARN}[CACHE EVICTED]${C.RESET}`;
        case "ignored":
            return `${C.WARN}[CACHE IGNORED]${C.RESET}`;
        default:
            return `${C.ORANGE}[CACHE MISS]${C.RESET}`;
    }
};

const allowListLabel = (status: SqlAllowListStatus): string => {
    switch (status) {
        case "allowed":
            return `${C.METHOD_COLORS.SELECT}[VERIFIED]${C.RESET}`;
        case "denied":
            return `${C.ERROR}[DENIED]${C.RESET}`;
        default:
            return `${C.GREY}[NOT VERIFIED]${C.RESET}`;
    }
};

export default function logSql(
    options: LogSqlContextOptions,
): void {
    const method = options.method.toUpperCase();

    if (!shouldLog(LogLevel.INFO, options.context)) return;
    const preText = getEnvBool("SSR", false)
        ? `${C.SSR}[SSR]${C.RESET} `
        : `${C.HTTP}[API]${C.RESET} `;

    const labelColor = methodColor(method);
    const versionColor = rgbAnsi(versionToRgb(version));
    const cacheText = cacheLabel(options.cacheStatus);
    const allowListText = allowListLabel(options.allowListStatus);
    console.log(
        `${versionColor}[${version}]${C.RESET} ${cacheText} ${allowListText} ${preText}${labelColor}[${method}]${C.RESET} ${colorSql(options.sql)}`,
    );
}
