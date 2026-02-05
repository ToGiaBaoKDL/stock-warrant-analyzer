/**
 * Ichimoku Cloud (Ichimoku Kinko Hyo) Indicator Module
 * 
 * Ichimoku is a comprehensive indicator developed by Goichi Hosoda in the 1930s
 * and published in 1968. It defines support/resistance, trend direction,
 * momentum, and provides trading signals.
 * 
 * Components (5 lines):
 * 1. Tenkan-sen (Conversion Line): (9-period high + 9-period low) / 2
 *    - Short-term trend, similar to fast MA
 * 
 * 2. Kijun-sen (Base Line): (26-period high + 26-period low) / 2
 *    - Medium-term trend, similar to slow MA
 * 
 * 3. Senkou Span A (Leading Span A): (Tenkan + Kijun) / 2, plotted 26 periods ahead
 *    - First cloud boundary
 * 
 * 4. Senkou Span B (Leading Span B): (52-period high + 52-period low) / 2, plotted 26 periods ahead
 *    - Second cloud boundary
 * 
 * 5. Chikou Span (Lagging Span): Close price plotted 26 periods back
 *    - Confirms trend direction
 * 
 * The Cloud (Kumo):
 * - Area between Senkou Span A and B
 * - Green cloud (bullish): Span A > Span B
 * - Red cloud (bearish): Span A < Span B
 * 
 * Signals:
 * - TK Cross: Tenkan crosses Kijun (like MA crossover)
 * - Price vs Cloud: Above = bullish, Below = bearish, Inside = consolidation
 * - Cloud breakout: Strong trend signal
 * - Chikou confirmation: Price position relative to historical price
 * 
 * Default periods: 9, 26, 52 (based on Japanese trading weeks)
 */

export interface IchimokuResult {
    tenkanSen: (number | null)[];    // Conversion Line
    kijunSen: (number | null)[];     // Base Line
    senkouSpanA: (number | null)[];  // Leading Span A (shifted forward)
    senkouSpanB: (number | null)[];  // Leading Span B (shifted forward)
    chikouSpan: (number | null)[];   // Lagging Span (shifted backward)
}

/**
 * Calculate highest high over a period
 */
function highestHigh(highs: number[], endIndex: number, period: number): number | null {
    if (endIndex < period - 1) return null;
    let max = highs[endIndex - period + 1];
    for (let i = endIndex - period + 2; i <= endIndex; i++) {
        if (highs[i] > max) max = highs[i];
    }
    return max;
}

/**
 * Calculate lowest low over a period
 */
function lowestLow(lows: number[], endIndex: number, period: number): number | null {
    if (endIndex < period - 1) return null;
    let min = lows[endIndex - period + 1];
    for (let i = endIndex - period + 2; i <= endIndex; i++) {
        if (lows[i] < min) min = lows[i];
    }
    return min;
}

/**
 * Calculate Ichimoku Cloud
 * 
 * @param highs - Array of high prices
 * @param lows - Array of low prices
 * @param closes - Array of closing prices
 * @param tenkanPeriod - Tenkan-sen period (default: 9)
 * @param kijunPeriod - Kijun-sen period (default: 26)
 * @param senkouBPeriod - Senkou Span B period (default: 52)
 * @param displacement - Cloud displacement/shift (default: 26)
 * @returns Object containing all 5 Ichimoku lines
 * 
 * @example
 * const ichimoku = calculateIchimoku(highs, lows, closes, 9, 26, 52, 26);
 */
export function calculateIchimoku(
    highs: number[],
    lows: number[],
    closes: number[],
    tenkanPeriod: number = 9,
    kijunPeriod: number = 26,
    senkouBPeriod: number = 52,
    displacement: number = 26
): IchimokuResult {
    if (!highs || !lows || !closes || highs.length === 0) {
        return {
            tenkanSen: [],
            kijunSen: [],
            senkouSpanA: [],
            senkouSpanB: [],
            chikouSpan: [],
        };
    }

    const length = closes.length;
    const tenkanSen: (number | null)[] = [];
    const kijunSen: (number | null)[] = [];
    const senkouSpanA: (number | null)[] = [];
    const senkouSpanB: (number | null)[] = [];
    const chikouSpan: (number | null)[] = [];

    // Calculate Tenkan-sen and Kijun-sen
    for (let i = 0; i < length; i++) {
        // Tenkan-sen: (9-period high + 9-period low) / 2
        const tenkanHigh = highestHigh(highs, i, tenkanPeriod);
        const tenkanLow = lowestLow(lows, i, tenkanPeriod);
        if (tenkanHigh !== null && tenkanLow !== null) {
            tenkanSen.push((tenkanHigh + tenkanLow) / 2);
        } else {
            tenkanSen.push(null);
        }

        // Kijun-sen: (26-period high + 26-period low) / 2
        const kijunHigh = highestHigh(highs, i, kijunPeriod);
        const kijunLow = lowestLow(lows, i, kijunPeriod);
        if (kijunHigh !== null && kijunLow !== null) {
            kijunSen.push((kijunHigh + kijunLow) / 2);
        } else {
            kijunSen.push(null);
        }
    }

    // Calculate Senkou Span A and B (with forward displacement)
    // These are plotted 26 periods AHEAD, so we need extra slots
    const futureLength = length + displacement;
    
    for (let i = 0; i < futureLength; i++) {
        // For Senkou Spans, we calculate based on data from 'displacement' periods ago
        const dataIndex = i - displacement;
        
        if (dataIndex < 0) {
            senkouSpanA.push(null);
            senkouSpanB.push(null);
        } else if (dataIndex < length) {
            // Senkou Span A: (Tenkan + Kijun) / 2
            if (tenkanSen[dataIndex] !== null && kijunSen[dataIndex] !== null) {
                senkouSpanA.push((tenkanSen[dataIndex]! + kijunSen[dataIndex]!) / 2);
            } else {
                senkouSpanA.push(null);
            }

            // Senkou Span B: (52-period high + 52-period low) / 2
            const spanBHigh = highestHigh(highs, dataIndex, senkouBPeriod);
            const spanBLow = lowestLow(lows, dataIndex, senkouBPeriod);
            if (spanBHigh !== null && spanBLow !== null) {
                senkouSpanB.push((spanBHigh + spanBLow) / 2);
            } else {
                senkouSpanB.push(null);
            }
        } else {
            senkouSpanA.push(null);
            senkouSpanB.push(null);
        }
    }

    // Calculate Chikou Span (close price shifted backward by displacement)
    // This is current close plotted 26 periods BACK
    for (let i = 0; i < length; i++) {
        if (i + displacement < length) {
            // At position i, we show the close from position i + displacement
            chikouSpan.push(closes[i + displacement]);
        } else {
            chikouSpan.push(null);
        }
    }

    return { tenkanSen, kijunSen, senkouSpanA, senkouSpanB, chikouSpan };
}

/**
 * Get cloud color at a specific index
 * 
 * @param senkouA - Senkou Span A value
 * @param senkouB - Senkou Span B value
 * @returns "bullish" | "bearish" | null
 */

/**
 * Ichimoku color scheme
 */
export const ICHIMOKU_COLORS = {
    tenkanSen: "#0094FF",     // Blue - Conversion Line
    kijunSen: "#FF0000",      // Red - Base Line
    chikouSpan: "#4CAF50",    // Green - Lagging Span
    senkouSpanA: "#26a69a",   // Light Green - Leading Span A
    senkouSpanB: "#ef5350",   // Light Red - Leading Span B
    cloudBullish: "rgba(38, 166, 154, 0.2)",  // Green cloud fill
    cloudBearish: "rgba(239, 83, 80, 0.2)",   // Red cloud fill
} as const;
