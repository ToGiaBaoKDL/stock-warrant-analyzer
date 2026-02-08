/**
 * Stochastic RSI (StochRSI) Indicator Module
 *
 * StochRSI applies the Stochastic oscillator formula to RSI values
 * instead of raw price data, producing a more sensitive momentum indicator.
 *
 * Developed by Tushar Chande and Stanley Kroll in 1994.
 *
 * Formula:
 * StochRSI = (RSI - RSI_low) / (RSI_high - RSI_low)
 * Where RSI_low and RSI_high are the lowest/highest RSI values over the lookback period.
 *
 * Components:
 * - Raw StochRSI: Unsmoothed oscillator (0–1 scale, mapped to 0–100)
 * - %K Line: SMA smoothing of StochRSI (default period 3)
 * - %D Line: SMA smoothing of %K, acts as the signal line (default period 3)
 *
 * Signals:
 * - Bullish: %K crosses above %D below the 20 level (oversold crossover)
 * - Bearish: %K crosses below %D above the 80 level (overbought crossover)
 * - Overbought (>80): Momentum is strong but may reverse; wait for crossover
 * - Oversold (<20): Momentum is weak but may bounce; wait for crossover
 *
 * Divergence hints:
 * - Bullish divergence: Price makes lower low while StochRSI makes higher low
 * - Bearish divergence: Price makes higher high while StochRSI makes lower high
 *
 * Default settings: RSI period 14, StochRSI period 14, %K smoothing 3, %D smoothing 3
 */

import { calculateRSI } from "./rsi";
import { calculateSMA } from "./ma";

export interface StochasticRSIResult {
    k: (number | null)[];     // %K Line (smoothed StochRSI)
    d: (number | null)[];     // %D Line (signal line, SMA of %K)
    raw: (number | null)[];   // Raw StochRSI (unsmoothed)
}

/**
 * Calculate Stochastic RSI
 *
 * Formula:
 * 1. Compute RSI over `rsiPeriod`
 * 2. For each point, find the highest and lowest RSI in the last `stochPeriod` bars
 * 3. StochRSI = (RSI - RSI_low) / (RSI_high - RSI_low) × 100
 * 4. %K = SMA(StochRSI, kSmoothing)
 * 5. %D = SMA(%K, dSmoothing)
 *
 * @param closes - Array of closing prices
 * @param rsiPeriod - RSI calculation period (default: 14)
 * @param stochPeriod - Stochastic lookback period applied to RSI (default: 14)
 * @param kSmoothing - %K smoothing SMA period (default: 3)
 * @param dSmoothing - %D smoothing SMA period (default: 3)
 * @returns Object containing k, d, and raw arrays (0–100 scale)
 *
 * @example
 * const { k, d, raw } = calculateStochasticRSI(closes);
 * const { k, d } = calculateStochasticRSI(closes, 14, 14, 3, 3);
 */
export function calculateStochasticRSI(
    closes: number[],
    rsiPeriod: number = 14,
    stochPeriod: number = 14,
    kSmoothing: number = 3,
    dSmoothing: number = 3
): StochasticRSIResult {
    const empty: StochasticRSIResult = {
        k: new Array(closes?.length || 0).fill(null),
        d: new Array(closes?.length || 0).fill(null),
        raw: new Array(closes?.length || 0).fill(null),
    };

    if (!closes || closes.length === 0 || rsiPeriod <= 0 || stochPeriod <= 0) {
        return empty;
    }

    // Step 1: Calculate RSI
    const rsiValues = calculateRSI(closes, rsiPeriod);

    // Step 2: Calculate raw StochRSI from RSI values
    // Extract non-null RSI values for the stochastic calculation
    const rawStochRSI: (number | null)[] = new Array(closes.length).fill(null);

    for (let i = 0; i < rsiValues.length; i++) {
        if (rsiValues[i] === null) continue;

        // Gather the last `stochPeriod` non-null RSI values ending at i
        const window: number[] = [];
        for (let j = i; j >= 0 && window.length < stochPeriod; j--) {
            if (rsiValues[j] !== null) {
                window.push(rsiValues[j]!);
            }
        }

        if (window.length < stochPeriod) continue;

        const rsiHigh = Math.max(...window);
        const rsiLow = Math.min(...window);
        const range = rsiHigh - rsiLow;

        // Avoid division by zero when RSI is flat
        rawStochRSI[i] = range === 0 ? 50 : ((rsiValues[i]! - rsiLow) / range) * 100;
    }

    // Step 3: Smooth raw StochRSI with SMA to get %K
    // Extract non-null raw values for SMA calculation
    const rawValues: number[] = [];
    const rawIndices: number[] = [];

    for (let i = 0; i < rawStochRSI.length; i++) {
        if (rawStochRSI[i] !== null) {
            rawValues.push(rawStochRSI[i]!);
            rawIndices.push(i);
        }
    }

    const kSMA = calculateSMA(rawValues, kSmoothing);

    // Map %K back to original indices
    const kLine: (number | null)[] = new Array(closes.length).fill(null);
    for (let i = 0; i < rawIndices.length; i++) {
        kLine[rawIndices[i]] = kSMA[i];
    }

    // Step 4: Smooth %K with SMA to get %D (signal line)
    const kValues: number[] = [];
    const kIndices: number[] = [];

    for (let i = 0; i < kLine.length; i++) {
        if (kLine[i] !== null) {
            kValues.push(kLine[i]!);
            kIndices.push(i);
        }
    }

    const dSMA = calculateSMA(kValues, dSmoothing);

    // Map %D back to original indices
    const dLine: (number | null)[] = new Array(closes.length).fill(null);
    for (let i = 0; i < kIndices.length; i++) {
        dLine[kIndices[i]] = dSMA[i];
    }

    return { k: kLine, d: dLine, raw: rawStochRSI };
}

/**
 * Get Stochastic RSI zone/status based on %K value
 *
 * @param value - StochRSI %K value (0–100)
 * @returns Zone description: "overbought", "oversold", "neutral", or null
 */
export function getStochRSIZone(value: number | null): "overbought" | "oversold" | "neutral" | null {
    if (value === null) return null;
    if (value > 80) return "overbought";
    if (value < 20) return "oversold";
    return "neutral";
}

/**
 * Stochastic RSI color scheme
 */
export const STOCH_RSI_COLORS = {
    kLine: "#2196F3",         // Blue - %K line
    dLine: "#FF9800",         // Orange - %D signal line
    overbought: "#ef5350",    // Red - Overbought zone
    oversold: "#26a69a",      // Green - Oversold zone
    neutral: "#9e9e9e",       // Gray - Neutral zone
    upperBand: "#ef5350",     // Red dashed line at 80
    lowerBand: "#26a69a",     // Green dashed line at 20
    middleBand: "#9e9e9e",    // Gray dashed line at 50
} as const;

/**
 * Stochastic RSI reference levels for chart rendering
 */
export const STOCH_RSI_LEVELS = {
    overbought: 80,
    middle: 50,
    oversold: 20,
} as const;
