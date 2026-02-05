import { getEnvBool } from "../variables/getEnv";
import colorSql from "./colorSql";
import { version } from "../../package.json";
import versionToRgb from "./versionColor";
import type {LogContext} from "./logLevel";
import {LogLevel, shouldLog} from "./logLevel";

const C = {
    SSR: "\x1b[95m", // bright magenta
    HTTP: "\x1b[94m", // bright blue
    SQL: "\x1b[96m", // bright cyan
    METHOD_COLORS: {
        SELECT: "\x1b[92m", // green
        INSERT: "\x1b[96m", // cyan
        REPLACE: "\x1b[96m", // cyan
        UPDATE: "\x1b[95m", // magenta
        DELETE: "\x1b[91m", // red
    },
    METHOD_FALLBACK: [
        "\x1b[92m", // green
        "\x1b[93m", // yellow
        "\x1b[95m", // magenta
        "\x1b[96m", // cyan
        "\x1b[94m", // blue
        "\x1b[97m", // white
    ],
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

export default function logSql(method: string, sql: string, context?: LogContext): void {
    if (!shouldLog(LogLevel.DEBUG, context)) return;
    const preText = getEnvBool("SSR", false)
        ? `${C.SSR}[SSR]${C.RESET} `
        : `${C.HTTP}[API]${C.RESET} `;

    const labelColor = methodColor(method);
    const versionColor = rgbAnsi(versionToRgb(version));
    console.log(`${versionColor}[${version}]${C.RESET} ${preText}${labelColor}[${method}]${C.RESET} ${colorSql(sql)}`);
}
