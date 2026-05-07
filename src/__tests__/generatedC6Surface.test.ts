import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { describe, expect, it } from "vitest";
import { Actor as BarrelActor } from "./fixtures/generatedC6DoubleBarrel";
import { generatedC6PublicSurface } from "./fixtures/generatedC6PublicImports";

const collectGeneratedJsFiles = (dir: string): string[] => {
    if (!fs.existsSync(dir)) {
        return [];
    }

    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const entryPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            return collectGeneratedJsFiles(entryPath);
        }

        return entry.name.endsWith(".js") ? [entryPath] : [];
    });
};

describe("generated C6 compatibility facade", () => {
    it("keeps current public imports wired to the generated table modules", async () => {
        expect(generatedC6PublicSurface.Actor).toBe(BarrelActor);
        expect(generatedC6PublicSurface.Actor).toBe(
            (generatedC6PublicSurface.C6.ORM as Record<string, unknown>).Actor,
        );
        expect(generatedC6PublicSurface.TABLES.actor).toBe(
            generatedC6PublicSurface.C6.TABLES.actor,
        );
        expect(typeof generatedC6PublicSurface.C6.IMPORT).toBe("function");
        await expect(generatedC6PublicSurface.C6.IMPORT("actor")).resolves.toMatchObject({
            default: generatedC6PublicSurface.Actor,
        });
        expect(generatedC6PublicSurface.COLUMNS["actor.actor_id"]).toBe("actor_id");
        expect(generatedC6PublicSurface.state.actor).toBeUndefined();
    });

    it("type-checks public C6 imports and accidental double barrels", () => {
        const result = spawnSync(
            "npx",
            [
                "tsc",
                "src/__tests__/fixtures/generatedC6PublicImports.ts",
                "src/__tests__/fixtures/generatedC6DoubleBarrel.ts",
                "--target",
                "ES2020",
                "--module",
                "ES2020",
                "--moduleResolution",
                "node",
                "--esModuleInterop",
                "--skipLibCheck",
                "--noEmit",
            ],
            {
                cwd: process.cwd(),
                encoding: "utf-8",
            },
        );

        expect(`${result.stdout}\n${result.stderr}`).toMatch(/^(\s*)$/);
        expect(result.status).toBe(0);
    });

    it("keeps generated C6 fixtures TypeScript-only", () => {
        const generatedRoot = path.join(process.cwd(), "src/__tests__/sakila-db");
        expect(
            collectGeneratedJsFiles(generatedRoot)
                .map((filePath) => path.relative(generatedRoot, filePath))
                .sort(),
        ).toEqual([]);
    });

    it("imports GeoJSON only in generated table modules that use GeoJSON types", () => {
        const tablesRoot = path.join(process.cwd(), "src/__tests__/sakila-db/C6.generated/tables");
        const geoJsonImport = 'import type * as GeoJSON from "geojson";';

        for (const fileName of fs.readdirSync(tablesRoot)) {
            if (!fileName.endsWith(".ts") || fileName === "index.ts") {
                continue;
            }

            const content = fs.readFileSync(path.join(tablesRoot, fileName), "utf-8");
            const contentWithoutGeoJsonImport = content.replace(`${geoJsonImport}\n`, "");
            const usesGeoJsonType = /\bGeoJSON\./.test(contentWithoutGeoJsonImport);

            expect(content.includes(geoJsonImport), fileName).toBe(usesGeoJsonType);
        }
    });
});
