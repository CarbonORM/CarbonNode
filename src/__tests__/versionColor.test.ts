import { describe, expect, it } from "vitest";
import versionToRgb from "../utils/versionColor";

const channel = (n: number, step: number) => 255 - ((n * step) % 256);

describe("versionToRgb", () => {
    it("maps major/minor/patch with rotation 0", () => {
        const color = versionToRgb("2.3.4", 8);
        expect(color).toEqual({
            r: channel(2, 8),
            g: channel(3, 8),
            b: channel(4, 8),
        });
    });

    it("rotates channels when major % 3 is 1", () => {
        const color = versionToRgb("1.10.20", 10);
        expect(color).toEqual({
            r: channel(20, 10),
            g: channel(1, 10),
            b: channel(10, 10),
        });
    });

    it("rotates channels when major % 3 is 2", () => {
        const color = versionToRgb("2.10.20", 10);
        expect(color).toEqual({
            r: channel(10, 10),
            g: channel(20, 10),
            b: channel(2, 10),
        });
    });

    it("handles prerelease suffixes and defaults step", () => {
        const color = versionToRgb("3.4.5-beta.1");
        expect(color).toEqual({
            r: channel(4, 8),
            g: channel(5, 8),
            b: channel(3, 8),
        });
    });
});
