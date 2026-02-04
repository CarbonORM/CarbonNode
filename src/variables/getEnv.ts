/** biome-ignore-all lint/suspicious/noExplicitAny: working with global browser objects */
function getRuntimeEnv(key: string): any {
    return typeof window !== "undefined" && (window as any).__ENV__?.[key];
}
// Do not import anything here
function getViteEnv(key: string): any {
    // @ts-expect-error
    return typeof import.meta !== "undefined" && import.meta.env?.[key];
}

export function getEnv(key: string, fallback?: string): string;
export function getEnv<T>(key: string, fallback: T): T;
export function getEnv<T = string>(key: string, fallback?: T): T {
    try {
        const viteEnv = getViteEnv(key);
        if (viteEnv !== undefined) return viteEnv as T;
    } catch {}

    const runtimeEnv = getRuntimeEnv(key);
    if (runtimeEnv !== undefined) return runtimeEnv as T;

    if (typeof process !== "undefined" && process.env?.[key] !== undefined) {
        return process.env[key] as T;
    }

    if (fallback !== undefined) return fallback;
    throw new Error(`Missing environment variable: ${key}`);
}

export function getEnvBool(key: string, fallback = false): boolean {
    const raw = getEnv(key, fallback);
    const v = String(raw).trim().toLowerCase();

    return (
        v === "true" ||
        v === "1" ||
        v === "yes" ||
        v === "y" ||
        v === "on" ||
        v === "enabled"
    );
}

type EnvSource = "vite" | "runtime" | "process" | "fallback" | "missing";

export function getEnvDebug<T = string>(
    key: string,
    fallback?: T,
): { key: string; value: T; source: EnvSource } {
    try {
        const viteEnv = getViteEnv(key);
        if (viteEnv !== undefined) {
            return { key, value: viteEnv as T, source: "vite" };
        }
    } catch {}

    const runtimeEnv = getRuntimeEnv(key);
    if (runtimeEnv !== undefined) {
        return { key, value: runtimeEnv as T, source: "runtime" };
    }

    if (typeof process !== "undefined" && process.env?.[key] !== undefined) {
        return { key, value: process.env[key] as T, source: "process" };
    }

    if (fallback !== undefined) {
        return { key, value: fallback, source: "fallback" };
    }

    return { key, value: undefined as any, source: "missing" };
}
