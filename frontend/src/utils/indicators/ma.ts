/**
 * Moving Average Indicators Module
 * 
 * Contains various moving average calculations:
 * - SMA (Simple Moving Average)
 * - EMA (Exponential Moving Average)
 * - WMA (Weighted Moving Average) - future
 * - VWMA (Volume Weighted Moving Average) - future
 */

export type MAType = "SMA" | "EMA";

/**
 * Calculate Simple Moving Average (SMA)
 * 
 * Formula: SUM(close, period) / period
 * 
 * @param data - Array of closing prices
 * @param period - Number of periods to average
 * @returns Array of SMA values (null for insufficient data points)
 */
export function calculateSMA(data: number[], period: number): (number | null)[] {
    if (!data || data.length === 0 || period <= 0) {
        return [];
    }

    const result: (number | null)[] = [];

    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
            // Not enough data points yet
            result.push(null);
        } else {
            // Calculate average of last `period` values
            let sum = 0;
            for (let j = 0; j < period; j++) {
                sum += data[i - j];
            }
            result.push(sum / period);
        }
    }

    return result;
}

/**
 * Calculate Exponential Moving Average (EMA)
 * 
 * Formula: EMA = Price(t) × k + EMA(y) × (1 − k)
 * Where k = 2 / (period + 1)
 * 
 * EMA gives more weight to recent prices, making it more responsive
 * to new information compared to SMA.
 * 
 * @param data - Array of closing prices
 * @param period - Number of periods for EMA smoothing
 * @returns Array of EMA values (null for insufficient data points)
 */
export function calculateEMA(data: number[], period: number): (number | null)[] {
    if (!data || data.length === 0 || period <= 0) {
        return [];
    }

    const result: (number | null)[] = [];
    const multiplier = 2 / (period + 1);

    // First value is SMA
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
            sum += data[i];
            result.push(null);
        } else if (i === period - 1) {
            sum += data[i];
            const sma = sum / period;
            result.push(sma);
        } else {
            // EMA = Price(t) × k + EMA(y) × (1 − k)
            const prevEMA = result[i - 1] as number;
            const ema = data[i] * multiplier + prevEMA * (1 - multiplier);
            result.push(ema);
        }
    }

    return result;
}

/**
 * Calculate Weighted Moving Average (WMA)
 * 
 * Formula: WMA = SUM(weight * price) / SUM(weights)
 * Weights: Most recent = period, oldest = 1
 * 
 * @param data - Array of closing prices
 * @param period - Number of periods
 * @returns Array of WMA values
 */
