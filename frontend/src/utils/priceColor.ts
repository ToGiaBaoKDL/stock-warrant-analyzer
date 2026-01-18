/**
 * Price color utilities
 * Centralized color logic for stock/warrant price changes
 */

export type PriceColorType = "positive" | "negative" | "neutral";

/**
 * Determine color type based on numeric change
 */
export function getPriceColorType(change: number): PriceColorType {
    if (change > 0) return "positive";
    if (change < 0) return "negative";
    return "neutral";
}

/**
 * Get Tailwind CSS class for price change color
 * Uses !important to override Ant Design default link styles
 */
export function getPriceColorClass(change: number): string {
    if (change > 0) return "!text-green-600";
    if (change < 0) return "!text-red-600";
    return "!text-yellow-600";
}

/**
 * Get inline style color for price change
 * Use when Tailwind classes don't work (e.g., in Table Cell)
 */
export function getPriceColorHex(change: number): string {
    if (change > 0) return "#16a34a"; // green-600
    if (change < 0) return "#dc2626"; // red-600
    return "#ca8a04"; // yellow-600
}

/**
 * Get background color class for profit/loss badges
 */
export function getProfitBgClass(isProfit: boolean): string {
    return isProfit ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800";
}

/**
 * Format percentage with sign
 */
export function formatPercentWithSign(value: number, decimals: number = 2): string {
    const formatted = value.toFixed(decimals);
    return value > 0 ? `+${formatted}%` : `${formatted}%`;
}
