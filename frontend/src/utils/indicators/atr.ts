/**
 * ATR (Average True Range) Indicator Module
 *
 * ATR measures market VOLATILITY by decomposing the entire range of a price
 * for a given period. Developed by J. Welles Wilder Jr. in 1978.
 *
 * Formula:
 * TR = max(High - Low, |High - PrevClose|, |Low - PrevClose|)
 * ATR = Wilder's Smoothing of TR over period
 *   ATR[0] = SMA of first `period` TR values
 *   ATR[i] = ((period - 1) * ATR[i-1] + TR[i]) / period
 *
 * Interpretation:
 * - Higher ATR → higher volatility
 * - Lower ATR → lower volatility
 * - ATR does NOT indicate direction, only volatility
 *
 * Common Uses:
 * - Stop-loss placement (e.g. 2× ATR trailing stop)
 * - Position sizing (risk per trade / ATR = share count)
 * - Volatility filtering for entry signals
 *
 * Default period: 14 (as recommended by Wilder)
 *
 * @module atr
 */

export interface ATRResult {
    tr: (number | null)[];
    atr: (number | null)[];
    atrPercent: (number | null)[];
}

/**
 * Calculate Average True Range (ATR)
 *
 * Uses Wilder's smoothing method:
 *   ATR[first] = SMA of first `period` TR values
 *   ATR[i] = ((period - 1) * ATR[i-1] + TR[i]) / period
 *
 * @param highs - Array of high prices
 * @param lows - Array of low prices
 * @param closes - Array of closing prices
 * @param period - ATR period (default: 14)
 * @returns ATRResult with tr, atr, and atrPercent arrays
 *
 * @example
 * // Basic ATR calculation
 * const { tr, atr, atrPercent } = calculateATR(highs, lows, closes, 14);
 *
 * @example
 * // Stop-loss placement using ATR
 * const lastATR = atr[atr.length - 1];
 * const lastClose = closes[closes.length - 1];
 * if (lastATR !== null) {
 *     const { longStop, shortStop } = calculateStopLoss(lastClose, lastATR, 2);
 *     // longStop = entry - 2×ATR, shortStop = entry + 2×ATR
 * }
 *
 * @example
 * // Position sizing based on ATR
 * const riskPerTrade = 100_000; // 100k risk budget
 * const lastATR = atr[atr.length - 1];
 * if (lastATR !== null) {
 *     const shares = Math.floor(riskPerTrade / lastATR);
 * }
 */
export function calculateATR(
    highs: number[],
    lows: number[],
    closes: number[],
    period: number = 14
): ATRResult {
    if (
        !highs ||
        !lows ||
        !closes ||
        highs.length < period + 1 ||
        highs.length !== lows.length ||
        highs.length !== closes.length ||
        period <= 0
    ) {
        const len = highs?.length || 0;
        return {
            tr: new Array(len).fill(null),
            atr: new Array(len).fill(null),
            atrPercent: new Array(len).fill(null),
        };
    }

    // Step 1: Calculate True Range
    const tr: (number | null)[] = [];

    for (let i = 0; i < highs.length; i++) {
        if (i === 0) {
            // First bar: TR = High - Low (no previous close)
            tr.push(highs[i] - lows[i]);
        } else {
            const highLow = highs[i] - lows[i];
            const highPrevClose = Math.abs(highs[i] - closes[i - 1]);
            const lowPrevClose = Math.abs(lows[i] - closes[i - 1]);
            tr.push(Math.max(highLow, highPrevClose, lowPrevClose));
        }
    }

    // Step 2: Calculate ATR using Wilder's smoothing
    const atr: (number | null)[] = [];
    const atrPercent: (number | null)[] = [];

    for (let i = 0; i < highs.length; i++) {
        if (i < period) {
            // Not enough data yet
            atr.push(null);
            atrPercent.push(null);
        } else if (i === period) {
            // First ATR value: SMA of first `period` TR values (indices 1..period)
            let sum = 0;
            for (let j = 1; j <= period; j++) {
                sum += tr[j] as number;
            }
            const firstATR = sum / period;
            atr.push(firstATR);
            atrPercent.push(closes[i] !== 0 ? (firstATR / closes[i]) * 100 : null);
        } else {
            // Wilder's smoothing: ATR[i] = ((period-1) * ATR[i-1] + TR[i]) / period
            const prevATR = atr[i - 1] as number;
            const currentATR = ((period - 1) * prevATR + (tr[i] as number)) / period;
            atr.push(currentATR);
            atrPercent.push(closes[i] !== 0 ? (currentATR / closes[i]) * 100 : null);
        }
    }

    return { tr, atr, atrPercent };
}

/**
 * Get volatility level based on ATR as a percentage of price
 *
 * @param atrPercent - ATR / Close × 100
 * @returns Volatility classification
 *
 * Thresholds:
 * - very_high: > 5%
 * - high: 3% – 5%
 * - moderate: 1.5% – 3%
 * - low: < 1.5%
 */
export function getVolatilityLevel(
    atrPercent: number
): "very_high" | "high" | "moderate" | "low" {
    if (atrPercent > 5) return "very_high";
    if (atrPercent >= 3) return "high";
    if (atrPercent >= 1.5) return "moderate";
    return "low";
}

/**
 * Calculate ATR-based stop-loss levels
 *
 * A common risk management technique: place stops at a multiple of ATR
 * away from the current price.
 *
 * @param close - Current closing price
 * @param atr - Current ATR value
 * @param multiplier - ATR multiplier (default: 2)
 * @returns Object with longStop and shortStop prices
 *
 * @example
 * // Trailing stop for a long position
 * const { longStop } = calculateStopLoss(150, 3.5, 2);
 * // longStop = 150 - (3.5 × 2) = 143
 *
 * @example
 * // Trailing stop for a short position
 * const { shortStop } = calculateStopLoss(150, 3.5, 3);
 * // shortStop = 150 + (3.5 × 3) = 160.5
 */
export function calculateStopLoss(
    close: number,
    atr: number,
    multiplier: number = 2
): { longStop: number; shortStop: number } {
    return {
        longStop: close - atr * multiplier,
        shortStop: close + atr * multiplier,
    };
}

/**
 * ATR color scheme for visualization
 */
export const ATR_COLORS = {
    line: "#FF9800",          // Orange - ATR line
    high: "#ef5350",          // Red - High volatility
    moderate: "#FFC107",      // Amber - Moderate volatility
    low: "#26a69a",           // Green - Low volatility
    stopLong: "#26a69a",      // Green - Long stop-loss level
    stopShort: "#ef5350",     // Red - Short stop-loss level
} as const;
