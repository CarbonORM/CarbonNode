import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const generatorScriptPath = path.resolve(repoRoot, "scripts/generateRestBindings.cjs");
let generatorBuiltForTestRun = false;
const minimalSchemaDump = `CREATE TABLE \`actor\` (
  \`actor_id\` int NOT NULL AUTO_INCREMENT,
  \`first_name\` varchar(45) NOT NULL,
  PRIMARY KEY (\`actor_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;

const ensureGeneratorScript = () => {
    if (generatorBuiltForTestRun && fs.existsSync(generatorScriptPath)) {
        return;
    }

    const build = spawnSync("npm", ["run", "build:generateRestBindings"], {
        cwd: repoRoot,
        encoding: "utf-8",
    });

    if (build.status !== 0) {
        throw new Error(
            `Failed to build generateRestBindings.cjs:\n${build.stdout ?? ""}\n${build.stderr ?? ""}`,
        );
    }

    generatorBuiltForTestRun = true;
};

const makeTempDir = (): string =>
    fs.mkdtempSync(path.join(os.tmpdir(), "carbonnode-generate-config-"));

const writeJson = (filePath: string, payload: Record<string, any>) => {
    fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`);
};

const runGenerator = (args: string[], cwd: string) => {
    ensureGeneratorScript();
    const result = spawnSync("node", [generatorScriptPath, ...args], {
        cwd,
        encoding: "utf-8",
        env: {
            ...process.env,
            FORCE_COLOR: "0",
            C6_SKIP_GENERATED_TSC: "1",
        },
    });

    return {
        status: result.status ?? 1,
        output: `${result.stdout ?? ""}\n${result.stderr ?? ""}`,
    };
};

describe("generateRestBindings config validation", () => {
    it("fails on duplicate aliases", () => {
        const tempDir = makeTempDir();
        try {
            const configPath = path.join(tempDir, "rest.config.json");
            writeJson(configPath, {
                databases: [
                    {
                        alias: "app",
                        host: "127.0.0.1",
                        port: 3306,
                        user: "root",
                        pass: "password",
                        dbnames: ["app"],
                    },
                    {
                        alias: "app",
                        host: "127.0.0.2",
                        port: 3306,
                        user: "root",
                        pass: "password",
                        dbnames: ["billing"],
                    },
                ],
            });

            const { status, output } = runGenerator(
                ["--config", configPath, "--output", path.join(tempDir, "out")],
                tempDir,
            );

            expect(status).not.toBe(0);
            expect(output).toMatch(/Duplicate database alias 'app'/i);
        } finally {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    it("fails on alias identifier collisions after sanitization", () => {
        const tempDir = makeTempDir();
        try {
            const configPath = path.join(tempDir, "rest.config.json");
            writeJson(configPath, {
                databases: [
                    {
                        alias: "app-main",
                        host: "127.0.0.1",
                        port: 3306,
                        user: "root",
                        pass: "password",
                        dbnames: ["app"],
                    },
                    {
                        alias: "app_main",
                        host: "127.0.0.2",
                        port: 3306,
                        user: "root",
                        pass: "password",
                        dbnames: ["billing"],
                    },
                ],
            });

            const { status, output } = runGenerator(
                ["--config", configPath, "--output", path.join(tempDir, "out")],
                tempDir,
            );

            expect(status).not.toBe(0);
            expect(output).toMatch(/duplicate identifier/i);
        } finally {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    it("fails when pass and passEnv are both missing", () => {
        const tempDir = makeTempDir();
        try {
            const configPath = path.join(tempDir, "rest.config.json");
            writeJson(configPath, {
                databases: [
                    {
                        alias: "app",
                        host: "127.0.0.1",
                        port: 3306,
                        user: "root",
                        dbnames: ["app"],
                    },
                ],
            });

            const { status, output } = runGenerator(
                ["--config", configPath, "--output", path.join(tempDir, "out")],
                tempDir,
            );

            expect(status).not.toBe(0);
            expect(output).toMatch(/must provide either 'pass' or 'passEnv'/i);
        } finally {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    it("fails on empty dbnames", () => {
        const tempDir = makeTempDir();
        try {
            const configPath = path.join(tempDir, "rest.config.json");
            writeJson(configPath, {
                databases: [
                    {
                        alias: "app",
                        host: "127.0.0.1",
                        port: 3306,
                        user: "root",
                        pass: "password",
                        dbnames: [],
                    },
                ],
            });

            const { status, output } = runGenerator(
                ["--config", configPath, "--output", path.join(tempDir, "out")],
                tempDir,
            );

            expect(status).not.toBe(0);
            expect(output).toMatch(/must provide 'dbname' or a non-empty 'dbnames' array/i);
        } finally {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    it("fails when primaryAlias does not exist", () => {
        const tempDir = makeTempDir();
        try {
            const configPath = path.join(tempDir, "rest.config.json");
            writeJson(configPath, {
                databases: [
                    {
                        alias: "app",
                        host: "127.0.0.1",
                        port: 3306,
                        user: "root",
                        pass: "password",
                        dbnames: ["app"],
                    },
                ],
                primaryAlias: "billing",
            });

            const { status, output } = runGenerator(
                ["--config", configPath, "--output", path.join(tempDir, "out")],
                tempDir,
            );

            expect(status).not.toBe(0);
            expect(output).toMatch(/primaryAlias 'billing' was not found/i);
        } finally {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    it("discovers C6.config.json by walking parent directories", () => {
        const tempDir = makeTempDir();
        try {
            const nestedDir = path.join(tempDir, "nested", "deeper");
            const outputDir = path.join(tempDir, "generated");
            fs.mkdirSync(nestedDir, { recursive: true });
            fs.mkdirSync(outputDir, { recursive: true });
            fs.writeFileSync(
                path.join(outputDir, "C6.mysqldump.sql"),
                minimalSchemaDump,
            );

            writeJson(path.join(tempDir, "C6.config.json"), {
                databases: [
                    {
                        alias: "app",
                        host: "127.0.0.1",
                        port: 3306,
                        user: "root",
                        pass: "password",
                        dbnames: ["sakila"],
                    },
                ],
            });

            const { status, output } = runGenerator(
                ["--output", outputDir],
                nestedDir,
            );

            expect(status).toBe(0);
            expect(output).toMatch(/Successfully created CarbonORM bindings/i);
            const generatedC6Path = path.join(outputDir, "C6.ts");
            expect(fs.existsSync(generatedC6Path)).toBe(true);
            expect(fs.readFileSync(generatedC6Path, "utf-8")).toMatch(
                /SCOPED_C6_BY_DATABASE/,
            );
        } finally {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    it("discovers C6.config.ts and supports async default export", () => {
        const tempDir = makeTempDir();
        try {
            const nestedDir = path.join(tempDir, "nested", "deeper");
            const outputDir = path.join(tempDir, "generated");
            fs.mkdirSync(nestedDir, { recursive: true });
            fs.mkdirSync(outputDir, { recursive: true });
            fs.writeFileSync(
                path.join(outputDir, "C6.mysqldump.sql"),
                minimalSchemaDump,
            );

            fs.writeFileSync(
                path.join(tempDir, "C6.config.ts"),
                `export default async () => ({
  databases: [
    {
      alias: "app",
      host: "127.0.0.1",
      port: 3306,
      user: "root",
      pass: "password",
      dbnames: ["sakila"]
    }
  ]
});
`,
            );

            const { status, output } = runGenerator(
                ["--output", outputDir],
                nestedDir,
            );

            expect(status).toBe(0);
            expect(output).toMatch(/Successfully created CarbonORM bindings/i);
            const generatedC6Path = path.join(outputDir, "C6.ts");
            expect(fs.existsSync(generatedC6Path)).toBe(true);
        } finally {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    it("discovers .C6.ts by walking parent directories", () => {
        const tempDir = makeTempDir();
        try {
            const nestedDir = path.join(tempDir, "nested", "deeper");
            const outputDir = path.join(tempDir, "generated");
            fs.mkdirSync(nestedDir, { recursive: true });
            fs.mkdirSync(outputDir, { recursive: true });
            fs.writeFileSync(
                path.join(outputDir, "C6.mysqldump.sql"),
                minimalSchemaDump,
            );

            fs.writeFileSync(
                path.join(tempDir, ".C6.ts"),
                `export default {
  databases: [
    {
      alias: "app",
      host: "127.0.0.1",
      port: 3306,
      user: "root",
      pass: "password",
      dbnames: ["sakila"]
    }
  ]
};
`,
            );

            const { status, output } = runGenerator(
                ["--output", outputDir],
                nestedDir,
            );

            expect(status).toBe(0);
            expect(output).toMatch(/Successfully created CarbonORM bindings/i);
            expect(fs.existsSync(path.join(outputDir, "C6.ts"))).toBe(true);
        } finally {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });
});
