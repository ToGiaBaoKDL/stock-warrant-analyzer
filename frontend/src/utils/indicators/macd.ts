/**
 * MACD (Moving Average Convergence Divergence) Indicator Module
 * 
 * MACD is a trend-following momentum indicator that shows the relationship
 * between two exponential moving averages of a security's price.
 * 
 * Components:
 * - MACD Line: EMA(12) - EMA(26)
 * - Signal Line: EMA(9) of MACD Line
 * - Histogram: MACD Line - Signal Line
 * 
 * Signals:
 * - Bullish: MACD crosses above Signal, or histogram turns positive
 * - Bearish: MACD crosses below Signal, or histogram turns negative
 * - Zero-line crossover: Strong trend confirmation
 * 
 * Default settings: 12, 26, 9 (developed by Gerald Appel in the 1970s)
 */

import { calculateEMA } from "./ma";

export interface MACDResult {
    macd: (number | null)[];      // MACD Line
    signal: (number | null)[];     // Signal Line
    histogram: (number | null)[]; // Histogram (MACD - Signal)
}

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 * 
 * Formula:
 * - MACD Line = EMA(fast) - EMA(slow)
 * - Signal Line = EMA(signal) of MACD Line
 * - Histogram = MACD Line - Signal Line
 * 
 * @param data - Array of closing prices
 * @param fastPeriod - Fast EMA period (default: 12)
 * @param slowPeriod - Slow EMA period (default: 26)
 * @param signalPeriod - Signal EMA period (default: 9)
 * @returns Object containing macd, signal, and histogram arrays
 * 
 * @example
 * const { macd, signal, histogram } = calculateMACD(closes, 12, 26, 9);
 */
export function calculateMACD(
    data: number[],
    fastPeriod: number = 12,
    slowPeriod: number = 26,
    signalPeriod: number = 9
): MACDResult {
    if (!data || data.length === 0 || fastPeriod >= slowPeriod) {
        return { macd: [], signal: [], histogram: [] };
    }

    // Calculate fast and slow EMAs
    const fastEMA = calculateEMA(data, fastPeriod);
    const slowEMA = calculateEMA(data, slowPeriod);

    // Calculate MACD Line (fast EMA - slow EMA)
    const macdLine: (number | null)[] = [];
    for (let i = 0; i < data.length; i++) {
        if (fastEMA[i] === null || slowEMA[i] === null) {
            macdLine.push(null);
        } else {
            macdLine.push(fastEMA[i]! - slowEMA[i]!);
        }
    }

    // Calculate Signal Line (EMA of MACD Line)
    // Need to extract non-null values for EMA calculation
    const macdValues: number[] = [];
    const macdIndices: number[] = [];
    
    for (let i = 0; i < macdLine.length; i++) {
        if (macdLine[i] !== null) {
            macdValues.push(macdLine[i]!);
            macdIndices.push(i);
        }
    }

    const signalEMA = calculateEMA(macdValues, signalPeriod);
    
    // Map signal back to original indices
    const signalLine: (number | null)[] = new Array(data.length).fill(null);
    for (let i = 0; i < macdIndices.length; i++) {
        signalLine[macdIndices[i]] = signalEMA[i];
    }

    // Calculate Histogram (MACD - Signal)
    const histogram: (number | null)[] = [];
    for (let i = 0; i < data.length; i++) {
        if (macdLine[i] === null || signalLine[i] === null) {
            histogram.push(null);
        } else {
            histogram.push(macdLine[i]! - signalLine[i]!);
        }
    }

    return { macd: macdLine, signal: signalLine, histogram };
}

/**
 * Detect MACD crossovers
 * 
 * @param macd - MACD line values
 * @param signal - Signal line values
 * @returns Array of crossover points with direction
 */
export function detectMACDCrossovers(
    macd: (number | null)[],
    signal: (number | null)[]
): { index: number; type: "bullish" | "bearish" }[] {
    const crossovers: { index: number; type: "bullish" | "bearish" }[] = [];

    for (let i = 1; i < macd.length; i++) {
        if (macd[i - 1] === null || signal[i - 1] === null || 
            macd[i] === null || signal[i] === null) {
            continue;
        }

        const prevDiff = macd[i - 1]! - signal[i - 1]!;
        const currDiff = macd[i]! - signal[i]!;

        // Bullish crossover: MACD crosses above Signal
        if (prevDiff <= 0 && currDiff > 0) {
            crossovers.push({ index: i, type: "bullish" });
        }
        // Bearish crossover: MACD crosses below Signal
        else if (prevDiff >= 0 && currDiff < 0) {
            crossovers.push({ index: i, type: "bearish" });
        }
    }

    return crossovers;
}

/**
 * MACD color scheme
 */
export const MACD_COLORS = {
    macdLine: "#2196F3",      // Blue - MACD line
    signalLine: "#FF9800",    // Orange - Signal line
    histogramUp: "#26a69a",   // Green - Positive histogram
    histogramDown: "#ef5350", // Red - Negative histogram
} as const;
