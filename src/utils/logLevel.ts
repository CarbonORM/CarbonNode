import {getEnvDebug} from "../variables/getEnv";

export enum LogLevel {
    NONE = 0,
    ERROR = 1,
    WARN = 2,
    INFO = 3,
    DEBUG = 4,
    TRACE = 5,
}

export type LogContext = {
    logLevel?: number | null;
    verbose?: boolean | null;
    request?: { debug?: boolean } | null;
};

const LOG_LEVEL_KEYS = ["LOG_LEVEL", "REACT_APP_LOG_LEVEL", "VITE_LOG_LEVEL"] as const;
const VERBOSE_KEYS = ["VERBOSE", "REACT_APP_VERBOSE", "VITE_VERBOSE"] as const;

const TRUE_VALUES = new Set(["true", "1", "yes", "y", "on", "enabled"]);
const FALSE_VALUES = new Set(["false", "0", "no", "n", "off", "disabled"]);

const clampLevel = (level: number): LogLevel => {
    if (level <= LogLevel.NONE) return LogLevel.NONE;
    if (level >= LogLevel.TRACE) return LogLevel.TRACE;
    return level as LogLevel;
};

const parseBoolean = (value: unknown): boolean | undefined => {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    if (typeof value !== "string") return undefined;
    const normalized = value.trim().toLowerCase();
    if (TRUE_VALUES.has(normalized)) return true;
    if (FALSE_VALUES.has(normalized)) return false;
    return undefined;
};

export const parseLogLevel = (value: unknown): LogLevel | undefined => {
    if (value === null || value === undefined) return undefined;
    if (typeof value === "number" && Number.isFinite(value)) {
        return clampLevel(Math.round(value));
    }
    if (typeof value !== "string") return undefined;

    const raw = value.trim();
    if (!raw) return undefined;

    if (/^-?\d+(\.\d+)?$/.test(raw)) {
        return clampLevel(Math.round(Number(raw)));
    }

    switch (raw.toUpperCase()) {
        case "NONE":
        case "OFF":
        case "SILENT":
            return LogLevel.NONE;
        case "ERROR":
        case "ERR":
            return LogLevel.ERROR;
        case "WARN":
        case "WARNING":
            return LogLevel.WARN;
        case "INFO":
            return LogLevel.INFO;
        case "DEBUG":
            return LogLevel.DEBUG;
        case "TRACE":
            return LogLevel.TRACE;
        default:
            return undefined;
    }
};

export const getEnvLogLevel = (): LogLevel | undefined => {
    for (const key of LOG_LEVEL_KEYS) {
        const {value, source} = getEnvDebug(key);
        if (source !== "missing") {
            const parsed = parseLogLevel(value);
            if (parsed !== undefined) return parsed;
        }
    }

    for (const key of VERBOSE_KEYS) {
        const {value, source} = getEnvDebug(key);
        if (source !== "missing") {
            const parsed = parseBoolean(value);
            if (parsed !== undefined) {
                return parsed ? LogLevel.DEBUG : LogLevel.WARN;
            }
        }
    }

    return undefined;
};

export const
    resolveLogLevel = (context?: LogContext): LogLevel => {
    const configured = parseLogLevel(context?.logLevel);
    const verbose = context?.verbose;
    const base =
        configured ??
        (verbose !== undefined && verbose !== null
            ? (verbose ? LogLevel.DEBUG : LogLevel.WARN)
            : undefined) ??
        getEnvLogLevel() ??
        LogLevel.WARN;

    if (context?.request?.debug && base < LogLevel.DEBUG) {
        return LogLevel.DEBUG;
    }

    return base;
};

export const shouldLog = (requiredLevel: LogLevel, context?: LogContext): boolean =>
    resolveLogLevel(context) >= requiredLevel;

export const applyLogLevelDefaults = (
    config: { logLevel?: number | null; verbose?: boolean | null },
    request?: { debug?: boolean } | null,
): LogLevel => {
    if (config.logLevel === null || config.logLevel === undefined) {
        const resolved = resolveLogLevel({
            logLevel: config.logLevel,
            verbose: config.verbose,
            request: request ?? undefined,
        });
        config.logLevel = resolved;
        return resolved;
    }

    return parseLogLevel(config.logLevel) ?? LogLevel.WARN;
};

export const getLogContext = (
    config: { logLevel?: number | null; verbose?: boolean | null },
    request: { debug?: boolean } | null,
): LogContext => {
    return {
        logLevel: config?.logLevel ?? undefined,
        verbose: config?.verbose ?? undefined,
        request: request ?? undefined,
    };
};

export const logWithLevel = (
    requiredLevel: LogLevel,
    context: LogContext | undefined,
    logger: (...args: any[]) => void,
    ...args: any[]
): void => {
    if (shouldLog(requiredLevel, context)) {
        logger(...args);
    }
};
