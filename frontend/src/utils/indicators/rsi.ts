/**
 * RSI (Relative Strength Index) Indicator Module
 * 
 * RSI is a momentum oscillator that measures the speed and magnitude of
 * recent price changes to evaluate overbought or oversold conditions.
 * 
 * Developed by J. Welles Wilder Jr. in 1978.
 * 
 * Formula:
 * RSI = 100 - (100 / (1 + RS))
 * RS = Average Gain / Average Loss
 * 
 * Interpretation:
 * - RSI > 70: Overbought (potential sell signal)
 * - RSI < 30: Oversold (potential buy signal)
 * - RSI = 50: Neutral
 * 
 * Divergence:
 * - Bullish divergence: Price makes lower low, RSI makes higher low
 * - Bearish divergence: Price makes higher high, RSI makes lower high
 * 
 * Default period: 14 (as recommended by Wilder)
 */

/**
 * Calculate RSI (Relative Strength Index)
 * 
 * Uses Wilder's smoothing method (exponential smoothing)
 * 
 * @param data - Array of closing prices
 * @param period - RSI period (default: 14)
 * @returns Array of RSI values (0-100 scale)
 * 
 * @example
 * const rsi = calculateRSI(closes, 14);
 */
export function calculateRSI(data: number[], period: number = 14): (number | null)[] {
    if (!data || data.length < period + 1 || period <= 0) {
        return new Array(data?.length || 0).fill(null);
    }

    const result: (number | null)[] = [];
    const gains: number[] = [];
    const losses: number[] = [];

    // Calculate price changes
    for (let i = 1; i < data.length; i++) {
        const change = data[i] - data[i - 1];
        gains.push(change > 0 ? change : 0);
        losses.push(change < 0 ? Math.abs(change) : 0);
    }

    // First RSI value: use simple average for initial calculation
    let avgGain = 0;
    let avgLoss = 0;

    // Fill nulls before we have enough data
    for (let i = 0; i < period; i++) {
        result.push(null);
        if (i < gains.length) {
            avgGain += gains[i];
            avgLoss += losses[i];
        }
    }

    avgGain /= period;
    avgLoss /= period;

    // Calculate first RSI
    if (avgLoss === 0) {
        result.push(100); // No losses = RSI is 100
    } else {
        const rs = avgGain / avgLoss;
        result.push(100 - (100 / (1 + rs)));
    }

    // Calculate remaining RSI values using Wilder's smoothing
    // Wilder's smoothing: Avg = (PrevAvg * (period - 1) + Current) / period
    for (let i = period; i < gains.length; i++) {
        avgGain = (avgGain * (period - 1) + gains[i]) / period;
        avgLoss = (avgLoss * (period - 1) + losses[i]) / period;

        if (avgLoss === 0) {
            result.push(100);
        } else {
            const rs = avgGain / avgLoss;
            result.push(100 - (100 / (1 + rs)));
        }
    }

    return result;
}

/**
 * Get RSI zone/status
 * 
 * @param rsi - RSI value
 * @returns Zone description
 */
export function getRSIZone(rsi: number | null): "overbought" | "oversold" | "neutral" | null {
    if (rsi === null) return null;
    if (rsi >= 70) return "overbought";
    if (rsi <= 30) return "oversold";
    return "neutral";
}

/**
 * Detect RSI divergences (simplified version)
 * 
 * @param prices - Array of closing prices
 * @param rsi - Array of RSI values
 * @param lookback - Number of bars to look back for divergence
 * @returns Array of divergence signals
 */

/**
 * RSI color scheme
 */
export const RSI_COLORS = {
    line: "#9C27B0",          // Purple - RSI line
    overbought: "#ef5350",    // Red - Overbought zone
    oversold: "#26a69a",      // Green - Oversold zone
    neutral: "#9e9e9e",       // Gray - Neutral zone
    upperBand: "#ef5350",     // Red dashed line at 70
    lowerBand: "#26a69a",     // Green dashed line at 30
    middleBand: "#9e9e9e",    // Gray dashed line at 50
} as const;

/**
 * RSI reference levels for chart rendering
 */
export const RSI_LEVELS = {
    overbought: 70,
    middle: 50,
    oversold: 30,
} as const;
