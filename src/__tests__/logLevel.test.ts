import {afterEach, describe, expect, it} from "vitest";
import {LogLevel, resolveLogLevel} from "../utils/logLevel";

const LOG_LEVEL_KEY = "LOG_LEVEL";
const VERBOSE_KEY = "VERBOSE";

const originalLogLevel = process.env[LOG_LEVEL_KEY];
const originalVerbose = process.env[VERBOSE_KEY];

const resetEnv = () => {
    if (originalLogLevel === undefined) {
        delete process.env[LOG_LEVEL_KEY];
    } else {
        process.env[LOG_LEVEL_KEY] = originalLogLevel;
    }

    if (originalVerbose === undefined) {
        delete process.env[VERBOSE_KEY];
    } else {
        process.env[VERBOSE_KEY] = originalVerbose;
    }
};

afterEach(() => {
    resetEnv();
});

describe("log level resolution", () => {
    it("uses LOG_LEVEL env when set", () => {
        process.env[LOG_LEVEL_KEY] = "1";
        delete process.env[VERBOSE_KEY];

        expect(resolveLogLevel()).toBe(LogLevel.ERROR);
    });

    it("maps VERBOSE env to DEBUG when log level env is unset", () => {
        delete process.env[LOG_LEVEL_KEY];
        process.env[VERBOSE_KEY] = "true";

        expect(resolveLogLevel()).toBe(LogLevel.DEBUG);
    });

    it("maps verbose config to DEBUG/WARN and respects logLevel override", () => {
        expect(resolveLogLevel({verbose: true})).toBe(LogLevel.DEBUG);
        expect(resolveLogLevel({verbose: false})).toBe(LogLevel.WARN);
        expect(resolveLogLevel({logLevel: LogLevel.ERROR, verbose: true})).toBe(LogLevel.ERROR);
        expect(resolveLogLevel({logLevel: "TRACE" as any})).toBe(LogLevel.TRACE);
    });

    it("bumps request debug to DEBUG when base level is lower", () => {
        expect(resolveLogLevel({logLevel: LogLevel.ERROR, request: {debug: true}})).toBe(LogLevel.DEBUG);
        expect(resolveLogLevel({logLevel: LogLevel.TRACE, request: {debug: true}})).toBe(LogLevel.TRACE);
    });
});
