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
        expect(generatedC6PublicSurface.Actor_Info).toBe(
            (generatedC6PublicSurface.C6.ORM as Record<string, unknown>).Actor_Info,
        );
        expect(generatedC6PublicSurface.TABLES.actor_info).toMatchObject({
            RELATION_TYPE: "VIEW",
            READ_ONLY: true,
        });
        expect(generatedC6PublicSurface.VIEWS.actor_info).toBe(
            generatedC6PublicSurface.TABLES.actor_info,
        );
        expect(typeof generatedC6PublicSurface.Actor_Info.Get).toBe("function");
        expect("Post" in generatedC6PublicSurface.Actor_Info).toBe(false);
        expect("Put" in generatedC6PublicSurface.Actor_Info).toBe(false);
        expect("Delete" in generatedC6PublicSurface.Actor_Info).toBe(false);
        expect(typeof generatedC6PublicSurface.C6.IMPORT).toBe("function");
        await expect(generatedC6PublicSurface.C6.IMPORT("actor")).resolves.toMatchObject({
            default: generatedC6PublicSurface.Actor,
        });
        await expect(generatedC6PublicSurface.C6.IMPORT("actor_info")).resolves.toMatchObject({
            default: generatedC6PublicSurface.Actor_Info,
        });
        expect(generatedC6PublicSurface.COLUMNS["actor.actor_id"]).toBe("actor_id");
        expect(generatedC6PublicSurface.COLUMNS["actor_info.film_info"]).toBe("film_info");
        expect(generatedC6PublicSurface.state.actor).toBeUndefined();
        expect(generatedC6PublicSurface.state.actor_info).toBeUndefined();
    });

    it("type-checks public C6 imports and accidental double barrels", () => {
        const result = spawnSync(
            "npx",
            [
                "tsc",
                "--project",
                "src/__tests__/fixtures/generatedC6Typecheck.tsconfig.json",
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

    it("uses final view SQL instead of mysqldump temporary view placeholders", () => {
        const viewPath = path.join(
            process.cwd(),
            "src/__tests__/sakila-db/C6.generated/views/Film_List.ts",
        );
        const content = fs.readFileSync(viewPath, "utf-8");

        expect(content).toContain("CREATE VIEW `film_list` AS select");
        expect(content).toContain("group_concat");
        expect(content).not.toContain("CREATE VIEW `film_list` AS SELECT");
        expect(content).not.toContain(" 1 AS `FID`");
    });

    it("imports GeoJSON only in generated table modules that use GeoJSON types", () => {
        const tablesRoot = path.join(process.cwd(), "src/__tests__/sakila-db/C6.generated/tables");
        const viewsRoot = path.join(process.cwd(), "src/__tests__/sakila-db/C6.generated/views");
        const geoJsonImport = 'import type * as GeoJSON from "geojson";';

        for (const root of [tablesRoot, viewsRoot]) {
            for (const fileName of fs.readdirSync(root)) {
                if (!fileName.endsWith(".ts") || fileName === "index.ts") {
                    continue;
                }

                const content = fs.readFileSync(path.join(root, fileName), "utf-8");
                const contentWithoutGeoJsonImport = content.replace(`${geoJsonImport}\n`, "");
                const usesGeoJsonType = /\bGeoJSON\./.test(contentWithoutGeoJsonImport);

                expect(content.includes(geoJsonImport), fileName).toBe(usesGeoJsonType);
            }
        }
    });
});
