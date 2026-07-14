export function createPageUrl(pageName: string) {
    return '/' + pageName.replace(/ /g, '-');
}

/**
 * Formats a GPS/numeric metric value:
 * - Removes trailing zeros from decimal part
 * - Never rounds (uses string manipulation)
 * - Returns "—" for null/undefined/NaN
 * - Example: 40.110000 → "40.11", 12.000000 → "12"
 */
/**
 * Formats a GPS metric: strips trailing zeros, no rounding.
 * 3251.2818000 → "3251.2818" | 12.000000 → "12" | 0.000000 → "0"
 */
export function fmtMetric(value: number | undefined | null): string {
    if (value === undefined || value === null) return "—";
    const n = typeof value === "number" ? value : parseFloat(value as any);
    if (isNaN(n)) return "—";
    return Math.round(n).toString();
}

/**
 * Formats smax (max velocity) to exactly 1 decimal place.
 */
export function fmtSmax(value: number | undefined | null): string {
    if (value === undefined || value === null) return "—";
    const n = typeof value === "number" ? value : parseFloat(value as any);
    if (isNaN(n)) return "—";
    return n.toFixed(1);
}