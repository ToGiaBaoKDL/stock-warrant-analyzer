/**
 * Bollinger Bands Indicator Module
 * 
 * Bollinger Bands are a volatility indicator that consists of:
 * - Middle Band: SMA of closing prices
 * - Upper Band: Middle Band + (Standard Deviation × multiplier)
 * - Lower Band: Middle Band - (Standard Deviation × multiplier)
 * 
 * Default settings: 20 periods, 2 standard deviations
 */

import { calculateSMA } from "./ma";

export interface BollingerBands {
    upper: (number | null)[];
    middle: (number | null)[];
    lower: (number | null)[];
}

/**
 * Calculate standard deviation for a subset of data
 * 
 * @param data - Array of values
 * @param startIndex - Starting index (inclusive)
 * @param period - Number of values to include
 * @param mean - Pre-calculated mean
 * @returns Standard deviation
 */
function calculateStandardDeviation(
    data: number[],
    startIndex: number,
    period: number,
    mean: number
): number {
    let sumSquaredDiff = 0;
    for (let i = 0; i < period; i++) {
        const diff = data[startIndex - i] - mean;
        sumSquaredDiff += diff * diff;
    }
    return Math.sqrt(sumSquaredDiff / period);
}

/**
 * Calculate Bollinger Bands
 * 
 * @param data - Array of closing prices
 * @param period - SMA period (default: 20)
 * @param stdDevMultiplier - Standard deviation multiplier (default: 2)
 * @returns Object containing upper, middle, and lower band arrays
 * 
 * @example
 * const { upper, middle, lower } = calculateBollingerBands(closes, 20, 2);
 */
export function calculateBollingerBands(
    data: number[],
    period: number = 20,
    stdDevMultiplier: number = 2
): BollingerBands {
    if (!data || data.length === 0 || period <= 0) {
        return { upper: [], middle: [], lower: [] };
    }

    // Middle band is SMA
    const middle = calculateSMA(data, period);
    const upper: (number | null)[] = [];
    const lower: (number | null)[] = [];

    for (let i = 0; i < data.length; i++) {
        const sma = middle[i];
        if (sma === null) {
            upper.push(null);
            lower.push(null);
        } else {
            const stdDev = calculateStandardDeviation(data, i, period, sma);
            upper.push(sma + stdDev * stdDevMultiplier);
            lower.push(sma - stdDev * stdDevMultiplier);
        }
    }

    return { upper, middle, lower };
}

/**
 * Calculate Bollinger Band Width
 * 
 * Formula: (Upper Band - Lower Band) / Middle Band × 100
 * 
 * Useful for identifying low volatility periods (squeeze)
 * 
 * @param bands - Bollinger Bands object
 * @returns Array of bandwidth percentages
 */

/**
 * Bollinger Bands color scheme
 */
export const BB_COLORS = {
    upper: "#9C27B0",   // Purple - upper band
    middle: "#673AB7",  // Deep Purple - middle (SMA)
    lower: "#9C27B0",   // Purple - lower band
    fill: "rgba(156, 39, 176, 0.1)", // Light purple fill between bands
} as const;
