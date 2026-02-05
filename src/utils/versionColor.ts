export interface RgbColor {
    r: number;
    g: number;
    b: number;
}

const DEFAULT_STEP = 8;

function parseSemver(version: string): { major: number; minor: number; patch: number } {
    const [core] = version.trim().split("-");
    const [majorRaw, minorRaw, patchRaw] = core.split(".");

    const major = Number.parseInt(majorRaw ?? "0", 10);
    const minor = Number.parseInt(minorRaw ?? "0", 10);
    const patch = Number.parseInt(patchRaw ?? "0", 10);

    return {
        major: Number.isFinite(major) ? major : 0,
        minor: Number.isFinite(minor) ? minor : 0,
        patch: Number.isFinite(patch) ? patch : 0,
    };
}

function channelValue(n: number, step: number): number {
    const value = 255 - ((n * step) % 256);
    return (value + 256) % 256;
}

export default function versionToRgb(version: string, step: number = DEFAULT_STEP): RgbColor {
    const safeStep = Number.isFinite(step) && step > 0 ? Math.floor(step) : DEFAULT_STEP;
    const { major, minor, patch } = parseSemver(version);
    const rotation = major % 3;

    const base = [major, minor, patch] as const;
    const rotated =
        rotation === 1
            ? [base[2], base[0], base[1]]
            : rotation === 2
                ? [base[1], base[2], base[0]]
                : base;

    return {
        r: channelValue(rotated[0], safeStep),
        g: channelValue(rotated[1], safeStep),
        b: channelValue(rotated[2], safeStep),
    };
}
