/* eslint-disable no-control-regex */

const RESET = "\x1b[0m";

const C = {
    KEYWORD: "\x1b[94m", // blue
    LIMIT: "\x1b[93m",   // yellow
    NUMBER: "\x1b[92m",  // green
    DIM: "\x1b[90m",     // gray
};

/* ---------- ANSI helpers ---------- */

const ansi256 = (n: number) => `\x1b[38;5;${n}m`;

/* ---------- table color hashing ---------- */

function hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash * 31 + str.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
}

function tableColor(tableName: string): string {
    const name = tableName.replace(/[`"]/g, "").toLowerCase();
    const hash = hashString(name);

    // major hue bucket from first letter
    const first = name.charCodeAt(0) || 97;
    const hueBase = (first - 97) % 6;

    // minor variation
    const shade = hash % 6;
    const brightness = 3 + (hash % 2);

    // ANSI 256 color cube
    const r = (hueBase + shade) % 6;
    const g = (shade + brightness) % 6;
    const b = (hash % 3) + 2;

    return ansi256(16 + 36 * r + 6 * g + b);
}

/* ---------- placeholder collapsing ---------- */

/**
 * Collapses long bind runs:
 *   ?, ?, ?, ?, ?, ?   →   ? ×6
 *
 * Rules:
 * - ≥4 binds collapse
 * - BETWEEN ? AND ? is preserved
 * - Works across wrapping / truncation
 */
function collapseBinds(sql: string): string {
    return sql.replace(
        /(\?\s*,\s*){3,}\?/g,
        (match) => {
            const count = match.split("?").length - 1;
            return `${C.DIM}? ×${count}${RESET}`;
        },
    );
}

/* ---------- main formatter ---------- */

export default function colorSql(sql: string): string {
    let s = sql.trim();

    // 1️⃣ Collapse noisy bind runs FIRST
    s = collapseBinds(s);

    // 2️⃣ Color tables FIRST (before keywords)
    s = s.replace(
        /\b(FROM|JOIN|UPDATE|INTO)\s+(`[^`]+`|\w+)/gi,
        (_, kw, table) =>
            `${C.KEYWORD}${kw}${RESET} ${tableColor(table)}${table}${RESET}`,
    );

    // 3️⃣ SQL keywords (safe after table coloring)
    s = s.replace(
        /\b(SELECT|WHERE|AND|OR|BETWEEN|ON|IN)\b/gi,
        `${C.KEYWORD}$1${RESET}`,
    );

    // 4️⃣ LIMIT highlighting
    s = s.replace(
        /\bLIMIT\s+(\d+)/gi,
        `${C.LIMIT}LIMIT${RESET} ${C.NUMBER}$1${RESET}`,
    );

    return s;
}