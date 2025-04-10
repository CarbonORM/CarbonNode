export function getEnvVar(key: string, fallback = ''): string {
    // Vite-style injection
    if (typeof import.meta !== 'undefined' && import.meta.env && key in import.meta.env) {
        return import.meta.env[key];
    }

    // Node or SSR
    if (typeof process !== 'undefined' && process.env && key in process.env) {
        return process.env[key]!;
    }

    return fallback;
}
