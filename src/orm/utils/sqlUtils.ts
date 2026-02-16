export interface SqlBuilderResult {
    sql: string;
    params: any[] | { [key: string]: any };  // params can be an array or an object for named placeholders
}


export function convertHexIfBinary(
    _col: string,
    val: any,
    columnDef?: any
): any {
    if (
        typeof val === 'string' &&
        /^[0-9a-fA-F]{32}$/.test(val) &&
        typeof columnDef === 'object' &&
        String(columnDef.MYSQL_TYPE ?? '').toUpperCase().includes('BINARY')
    ) {
        return Buffer.from(val, 'hex');
    }
    return val;
}

type TemporalMysqlType = 'date' | 'datetime' | 'timestamp' | 'time' | 'year';

const TEMPORAL_TYPES = new Set<TemporalMysqlType>([
    'date',
    'datetime',
    'timestamp',
    'time',
    'year',
]);

const MYSQL_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MYSQL_DATETIME_REGEX = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d{1,6})?$/;
const MYSQL_TIME_REGEX = /^-?\d{2,3}:\d{2}:\d{2}(?:\.\d{1,6})?$/;
const ISO_DATETIME_REGEX = /^(\d{4}-\d{2}-\d{2})[Tt](\d{2}:\d{2}:\d{2})(\.\d{1,6})?([zZ]|[+-]\d{2}:\d{2})?$/;

const pad2 = (value: number): string => value.toString().padStart(2, '0');

function trimFraction(value: string, precision: number): string {
    const [base, fractionRaw] = value.split('.', 2);
    if (precision <= 0 || !fractionRaw) return base;
    return `${base}.${fractionRaw.slice(0, precision).padEnd(precision, '0')}`;
}

function normalizeFraction(raw: string | undefined, precision: number): string {
    if (precision <= 0) return '';
    if (!raw) return '';
    const digits = raw.startsWith('.') ? raw.slice(1) : raw;
    return `.${digits.slice(0, precision).padEnd(precision, '0')}`;
}

function formatDateUtc(value: Date): string {
    return `${value.getUTCFullYear()}-${pad2(value.getUTCMonth() + 1)}-${pad2(value.getUTCDate())}`;
}

function formatTimeUtc(value: Date, precision: number): string {
    const base = `${pad2(value.getUTCHours())}:${pad2(value.getUTCMinutes())}:${pad2(value.getUTCSeconds())}`;
    if (precision <= 0) return base;

    const millis = value.getUTCMilliseconds().toString().padStart(3, '0');
    const fraction = millis.slice(0, Math.min(precision, 3)).padEnd(precision, '0');
    return `${base}.${fraction}`;
}

function formatDateTimeUtc(value: Date, precision: number): string {
    return `${formatDateUtc(value)} ${formatTimeUtc(value, precision)}`;
}

function parseEpochNumber(value: number): Date | undefined {
    if (!Number.isFinite(value)) return undefined;
    const abs = Math.abs(value);
    if (abs >= 1e12) {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? undefined : date;
    }
    if (abs >= 1e9) {
        const date = new Date(value * 1000);
        return Number.isNaN(date.getTime()) ? undefined : date;
    }
    return undefined;
}

function parseTemporalType(columnDef?: any): { baseType?: TemporalMysqlType; precision: number } {
    const raw = String(columnDef?.MYSQL_TYPE ?? '').trim().toLowerCase();
    if (!raw) return { baseType: undefined, precision: 0 };

    const base = raw.split(/[\s(]/, 1)[0] as TemporalMysqlType;
    if (!TEMPORAL_TYPES.has(base)) return { baseType: undefined, precision: 0 };

    const precisionMatch = raw.match(/^(?:datetime|timestamp|time)\((\d+)\)/);
    if (!precisionMatch) return { baseType: base, precision: 0 };
    const parsed = Number.parseInt(precisionMatch[1], 10);
    if (!Number.isFinite(parsed)) return { baseType: base, precision: 0 };
    return { baseType: base, precision: Math.max(0, Math.min(6, parsed)) };
}

function normalizeTemporalString(
    value: string,
    baseType: TemporalMysqlType,
    precision: number,
): string {
    const trimmed = value.trim();
    if (!trimmed) return value;

    if (baseType === 'date') {
        if (MYSQL_DATE_REGEX.test(trimmed)) return trimmed;
        const iso = trimmed.match(ISO_DATETIME_REGEX);
        if (iso) {
            const [, datePart, , , timezonePart] = iso;
            if (!timezonePart) return datePart;
            const parsed = new Date(trimmed);
            return Number.isNaN(parsed.getTime()) ? value : formatDateUtc(parsed);
        }
        const parsed = new Date(trimmed);
        return Number.isNaN(parsed.getTime()) ? value : formatDateUtc(parsed);
    }

    if (baseType === 'time') {
        if (MYSQL_TIME_REGEX.test(trimmed)) return trimFraction(trimmed, precision);
        const iso = trimmed.match(ISO_DATETIME_REGEX);
        if (iso) {
            const [, , timePart, fractionPart, timezonePart] = iso;
            if (!timezonePart) {
                return `${timePart}${normalizeFraction(fractionPart, precision)}`;
            }
            const parsed = new Date(trimmed);
            return Number.isNaN(parsed.getTime()) ? value : formatTimeUtc(parsed, precision);
        }
        const parsed = new Date(trimmed);
        return Number.isNaN(parsed.getTime()) ? value : formatTimeUtc(parsed, precision);
    }

    if (baseType === 'year') {
        if (/^\d{2,4}$/.test(trimmed)) return trimmed;
        const parsed = new Date(trimmed);
        return Number.isNaN(parsed.getTime()) ? value : String(parsed.getUTCFullYear());
    }

    if (MYSQL_DATETIME_REGEX.test(trimmed)) return trimFraction(trimmed, precision);
    const iso = trimmed.match(ISO_DATETIME_REGEX);
    if (iso) {
        const [, datePart, timePart, fractionPart, timezonePart] = iso;
        if (!timezonePart) {
            return `${datePart} ${timePart}${normalizeFraction(fractionPart, precision)}`;
        }
        const parsed = new Date(trimmed);
        return Number.isNaN(parsed.getTime()) ? value : formatDateTimeUtc(parsed, precision);
    }

    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? value : formatDateTimeUtc(parsed, precision);
}

function convertTemporalIfNeeded(value: any, columnDef?: any): any {
    const { baseType, precision } = parseTemporalType(columnDef);
    if (!baseType) return value;

    if (value === null || value === undefined) return value;
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer && Buffer.isBuffer(value)) return value;

    if (value instanceof Date) {
        if (baseType === 'date') return formatDateUtc(value);
        if (baseType === 'time') return formatTimeUtc(value, precision);
        if (baseType === 'year') return String(value.getUTCFullYear());
        return formatDateTimeUtc(value, precision);
    }

    if (typeof value === 'number') {
        const parsed = parseEpochNumber(value);
        if (!parsed) return value;
        if (baseType === 'date') return formatDateUtc(parsed);
        if (baseType === 'time') return formatTimeUtc(parsed, precision);
        if (baseType === 'year') return String(parsed.getUTCFullYear());
        return formatDateTimeUtc(parsed, precision);
    }

    if (typeof value === 'string') {
        return normalizeTemporalString(value, baseType, precision);
    }

    return value;
}

export function convertSqlValueForColumn(
    col: string,
    val: any,
    columnDef?: any
): any {
    const binaryConverted = convertHexIfBinary(col, val, columnDef);
    return convertTemporalIfNeeded(binaryConverted, columnDef);
}
