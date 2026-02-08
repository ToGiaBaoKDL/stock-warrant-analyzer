/**
 * OBV (On-Balance Volume) Indicator Module
 *
 * OBV is a momentum indicator that uses volume flow to predict changes in
 * stock price. It was developed by Joseph Granville in 1963.
 *
 * Formula:
 * - If close > prev close: OBV = prev OBV + volume
 * - If close < prev close: OBV = prev OBV - volume
 * - If close == prev close: OBV = prev OBV (unchanged)
 *
 * Interpretation:
 * - Rising OBV: Accumulation (buying pressure)
 * - Falling OBV: Distribution (selling pressure)
 * - OBV divergence from price: Potential trend reversal
 *
 * Signals:
 * - Bullish divergence: Price makes lower low, OBV makes higher low
 * - Bearish divergence: Price makes higher high, OBV makes lower high
 * - OBV above its MA: Positive momentum (accumulation)
 * - OBV below its MA: Negative momentum (distribution)
 *
 * Default OBV MA period: 20
 */

import { calculateSMA } from "./ma";

export interface OBVResult {
    obv: number[];                // On-Balance Volume line
    obvMA: (number | null)[];     // Moving average of OBV
}

/**
 * Calculate On-Balance Volume (OBV)
 *
 * OBV accumulates volume based on price direction. A rising OBV reflects
 * positive volume pressure that can lead to higher prices, while falling
 * OBV reflects negative volume pressure that can foreshadow lower prices.
 *
 * @param closes - Array of closing prices
 * @param volumes - Array of volume data (must match closes length)
 * @param maPeriod - Period for OBV moving average (default: 20)
 * @returns Object containing obv and obvMA arrays
 *
 * @example
 * const { obv, obvMA } = calculateOBV(closes, volumes, 20);
 */
export function calculateOBV(
    closes: number[],
    volumes: number[],
    maPeriod: number = 20
): OBVResult {
    if (!closes || !volumes || closes.length === 0 || volumes.length === 0) {
        return { obv: [], obvMA: [] };
    }

    const length = Math.min(closes.length, volumes.length);
    const obv: number[] = new Array(length);

    // First OBV value is simply the first volume
    obv[0] = volumes[0];

    // Calculate OBV for remaining bars
    for (let i = 1; i < length; i++) {
        if (closes[i] > closes[i - 1]) {
            obv[i] = obv[i - 1] + volumes[i];
        } else if (closes[i] < closes[i - 1]) {
            obv[i] = obv[i - 1] - volumes[i];
        } else {
            obv[i] = obv[i - 1];
        }
    }

    // Calculate moving average of OBV for signal detection
    const obvMA = calculateSMA(obv, maPeriod);

    return { obv, obvMA };
}

/**
 * Detect OBV divergences with price
 *
 * Divergences between price and OBV often precede trend reversals:
 * - Bullish divergence: Price making lower lows while OBV makes higher lows
 *   → Suggests accumulation despite falling prices, potential upward reversal
 * - Bearish divergence: Price making higher highs while OBV makes lower highs
 *   → Suggests distribution despite rising prices, potential downward reversal
 *
 * @param closes - Array of closing prices
 * @param obv - Array of OBV values
 * @param lookback - Number of bars to look back for divergence (default: 14)
 * @returns "bullish" | "bearish" | null
 *
 * @example
 * const divergence = detectOBVDivergence(closes, obv, 14);
 * if (divergence === "bullish") { ... }
 */
export function detectOBVDivergence(
    closes: number[],
    obv: number[],
    lookback: number = 14
): "bullish" | "bearish" | null {
    if (!closes || !obv || closes.length < lookback + 1 || obv.length < lookback + 1) {
        return null;
    }

    const length = Math.min(closes.length, obv.length);
    const recentCloses = closes.slice(length - lookback - 1, length);
    const recentOBV = obv.slice(length - lookback - 1, length);

    // Find lows and highs in the lookback period
    const priceLow = Math.min(...recentCloses);
    const priceHigh = Math.max(...recentCloses);
    const obvLow = Math.min(...recentOBV);
    const obvHigh = Math.max(...recentOBV);

    const currentPrice = recentCloses[recentCloses.length - 1];
    const currentOBV = recentOBV[recentOBV.length - 1];
    const startPrice = recentCloses[0];
    const startOBV = recentOBV[0];

    // Bullish divergence: price making lower lows, OBV making higher lows
    if (currentPrice <= priceLow && currentPrice < startPrice &&
        currentOBV >= obvLow && currentOBV > startOBV) {
        return "bullish";
    }

    // Bearish divergence: price making higher highs, OBV making lower highs
    if (currentPrice >= priceHigh && currentPrice > startPrice &&
        currentOBV <= obvHigh && currentOBV < startOBV) {
        return "bearish";
    }

    return null;
}

/**
 * Get OBV trend classification
 *
 * Compares recent OBV slope against the OBV MA to determine whether
 * the security is under accumulation, distribution, or neutral pressure.
 *
 * - Accumulation: OBV is rising and above its MA → buying pressure
 * - Distribution: OBV is falling and below its MA → selling pressure
 * - Neutral: Mixed signals or flat OBV
 *
 * @param obv - Array of OBV values
 * @param period - Period for slope calculation and MA comparison (default: 20)
 * @returns "accumulation" | "distribution" | "neutral"
 *
 * @example
 * const trend = getOBVTrend(obv, 20);
 */
export function getOBVTrend(
    obv: number[],
    period: number = 20
): "accumulation" | "distribution" | "neutral" {
    if (!obv || obv.length < period) {
        return "neutral";
    }

    const recentOBV = obv.slice(-period);
    const obvMA = calculateSMA(obv, period);
    const currentMA = obvMA[obvMA.length - 1];

    if (currentMA === null) {
        return "neutral";
    }

    // Calculate recent OBV slope (linear regression-style simple slope)
    const currentOBV = recentOBV[recentOBV.length - 1];
    const startOBV = recentOBV[0];
    const slope = currentOBV - startOBV;

    // Accumulation: OBV rising and above its MA
    if (slope > 0 && currentOBV > currentMA) {
        return "accumulation";
    }

    // Distribution: OBV falling and below its MA
    if (slope < 0 && currentOBV < currentMA) {
        return "distribution";
    }

    return "neutral";
}

/**
 * OBV color scheme
 */
export const OBV_COLORS = {
    line: "#2196F3",          // Blue - OBV line
    ma: "#FF9800",            // Orange - OBV MA line
    accumulation: "#26a69a",  // Green - Accumulation zone
    distribution: "#ef5350",  // Red - Distribution zone
    neutral: "#9e9e9e",       // Gray - Neutral zone
} as const;
