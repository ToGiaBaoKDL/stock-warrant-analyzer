/**
 * Volume Indicators Module
 * 
 * Contains volume-related calculations:
 * - Volume MA (Moving Average of Volume)
 * - OBV (On-Balance Volume) - future
 * - VWAP (Volume Weighted Average Price) - future
 */

import { calculateSMA } from "./ma";

/**
 * Calculate Volume Moving Average
 * 
 * Simple moving average applied to volume data.
 * Used to identify unusual volume spikes.
 * 
 * @param volumes - Array of volume data
 * @param period - Number of periods (default: 20)
 * @returns Array of volume MA values
 */
export function calculateVolumeMA(
    volumes: number[],
    period: number = 20
): (number | null)[] {
    return calculateSMA(volumes, period);
}

/**
 * Detect volume spikes
 * 
 * Returns multiplier of current volume vs MA.
 * Useful for identifying breakouts and reversals.
 * 
 * @param volumes - Array of volume data
 * @param volumeMA - Pre-calculated volume MA
 * @returns Array of volume spike multipliers
 */

/**
 * Volume bar colors based on price action
 */
export const VOLUME_COLORS = {
    up: "#26a69a",      // Green - price closed higher
    down: "#ef5350",    // Red - price closed lower
    neutral: "#9e9e9e", // Gray - unchanged
    ma: "#FFA726",      // Orange - volume MA line
} as const;
