import { describe, it, expect, vi, afterEach } from "vitest";
import logSql from "../utils/logSql";
import colorSql from "../utils/colorSql";
import { version } from "../../package.json";

const stripAnsi = (value: string) => value.replace(/\x1b\[[0-9;]*m/g, "");

const SSR_ENV_KEY = "SSR";
const originalSsr = process.env[SSR_ENV_KEY];
const LOG_LEVEL_KEY = "LOG_LEVEL";
const originalLogLevel = process.env[LOG_LEVEL_KEY];

const restoreEnv = () => {
    if (originalSsr === undefined) {
        delete process.env[SSR_ENV_KEY];
    } else {
        process.env[SSR_ENV_KEY] = originalSsr;
    }

    if (originalLogLevel === undefined) {
        delete process.env[LOG_LEVEL_KEY];
    } else {
        process.env[LOG_LEVEL_KEY] = originalLogLevel;
    }
};

afterEach(() => {
    restoreEnv();
    vi.restoreAllMocks();
});

describe("logSql", () => {
    it("logs API prefix when SSR is disabled", () => {
        process.env[SSR_ENV_KEY] = "false";
        process.env[LOG_LEVEL_KEY] = "DEBUG";
        const spy = vi.spyOn(console, "log").mockImplementation(() => {});

        logSql("SELECT", "SELECT * FROM `users`");

        expect(spy).toHaveBeenCalledTimes(1);
        const message = stripAnsi(String(spy.mock.calls[0][0]));
        expect(message).toContain(`[${version}]`);
        expect(message).toContain("[API]");
        expect(message).toContain("[SELECT]");
        expect(message).toContain("SELECT * FROM `users`");
    });

    it("logs SSR prefix when SSR is enabled", () => {
        process.env[SSR_ENV_KEY] = "true";
        process.env[LOG_LEVEL_KEY] = "DEBUG";
        const spy = vi.spyOn(console, "log").mockImplementation(() => {});

        logSql("DELETE", "DELETE `users` FROM `users`");

        const message = stripAnsi(String(spy.mock.calls[0][0]));
        expect(message).toContain("[SSR]");
        expect(message).toContain("[DELETE]");
    });
});

describe("colorSql", () => {
    it("highlights INSERT and UPDATE keywords", () => {
        const sql = "INSERT INTO `users` (id) VALUES (1) ON DUPLICATE KEY UPDATE id = VALUES(id)";
        const colored = colorSql(sql);

        expect(colored).toContain("\x1b[94mINSERT\x1b[0m");
        expect(colored).toContain("\x1b[94mUPDATE\x1b[0m");
        expect(colored).toContain("\x1b[94mDUPLICATE\x1b[0m");
    });

    it("collapses repeated multi-row value groups", () => {
        const sql = `INSERT INTO \`valuation_report_comparables\` (a,b,c) VALUES
            (?, ?, ?),
            (?, ?, ?),
            (?, ?, ?),
            (?, ?, ?)`;
        const colored = colorSql(sql);
        const plain = stripAnsi(colored);

        expect(plain).toContain("(? ×3) ×4");
        expect(plain).not.toContain("(? ×3),");
    });
});
