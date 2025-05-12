export function getEnvVar(key: string, fallback = ''): string {
    // Vite-style injection
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && key in import.meta.env) {
        // @ts-ignore
        return import.meta.env[key];
    }

    // Node or SSR
    if (typeof process !== 'undefined' && process.env && key in process.env) {
        return process.env[key]!;
    }

    return fallback;
}
