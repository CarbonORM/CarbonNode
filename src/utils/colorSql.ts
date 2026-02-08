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

/* ---------- hashing ---------- */

function hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash * 31 + str.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
}

/* ---------- table color ---------- */

function tableRGB(tableName: string): [number, number, number] {
    const name = tableName.replace(/[`"]/g, "").toLowerCase();
    const hash = hashString(name);

    // Stable hue bucket by first letter
    const first = name.charCodeAt(0) || 97;
    const hueBase = (first - 97) % 6;

    const r = (hueBase + (hash % 3)) % 6;
    const g = (hash >> 3) % 6;
    const b = (hash >> 6) % 6;

    return [r, g, Math.max(2, b)]; // avoid muddy dark blues
}

function tableColor(table: string): string {
    const [r, g, b] = tableRGB(table);
    return ansi256(16 + 36 * r + 6 * g + b);
}

/* ---------- column color (same hue, lighter) ---------- */

function columnColorFromTable(table: string): string {
    const [r, g, b] = tableRGB(table);

    // Lift toward white, preserve hue
    const lr = Math.min(5, r + 1);
    const lg = Math.min(5, g + 1);
    const lb = Math.min(5, b + 2);

    return ansi256(16 + 36 * lr + 6 * lg + lb);
}

/* ---------- bind collapsing ---------- */
/**
 * ?, ?, ?, ?, ?, ?  →  ? ×6
 * triggers at 4+
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

/**
 * ( ? ×9 ), ( ? ×9 ), ( ? ×9 )  ->  ( ? ×9 ) ×3
 */
function collapseRepeatedValueRows(sql: string): string {
    const repeatedRowPattern =
        /(\((?:\x1b\[[0-9;]*m)?\?\s*×\d+(?:\x1b\[[0-9;]*m)?\)|\(\s*(?:\?\s*,\s*)+\?\s*\))(?:\s*,\s*\1){2,}/g;

    return sql.replace(repeatedRowPattern, (match, row: string) => {
        const rowMatches = match.match(new RegExp(row.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"));
        const count = rowMatches?.length ?? 1;
        const normalizedRow = row.includes("×")
            ? row
            : `(${C.DIM}? ×${(row.match(/\?/g) ?? []).length}${RESET})`;
        return `${normalizedRow} ${C.DIM}×${count}${RESET}`;
    });
}

/* ---------- main formatter ---------- */

export default function colorSql(sql: string): string {
    let s = sql.trim();

    /* 1️⃣ collapse bind noise */
    s = collapseBinds(s);
    s = collapseRepeatedValueRows(s);

    /* 2️⃣ table.column coloring (core visual grouping) */
    s = s.replace(
        /\b(`?\w+`?)\.(\w+)\b/g,
        (_, table, column) =>
            `${tableColor(table)}${table}${RESET}.` +
            `${columnColorFromTable(table)}${column}${RESET}`,
    );

    /* 3️⃣ FROM / JOIN tables */
    s = s.replace(
        /\b(FROM|JOIN|UPDATE|INTO)\s+(`[^`]+`|\w+)/gi,
        (_, kw, table) =>
            `${C.KEYWORD}${kw}${RESET} ${tableColor(table)}${table}${RESET}`,
    );

    /* 4️⃣ SQL keywords */
    s = s.replace(
        /\b(SELECT|WHERE|AND|OR|ON|IN|BETWEEN|EXISTS|ORDER BY|GROUP BY|HAVING|SET|VALUES|INSERT|REPLACE|DELETE|UPDATE|DUPLICATE|KEY)\b/gi,
        `${C.KEYWORD}$1${RESET}`,
    );

    /* 5️⃣ LIMIT */
    s = s.replace(
        /\bLIMIT\s+(\d+)/gi,
        `${C.LIMIT}LIMIT${RESET} ${C.NUMBER}$1${RESET}`,
    );

    return s;
}
