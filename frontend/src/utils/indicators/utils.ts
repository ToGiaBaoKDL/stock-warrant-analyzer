/**
 * Technical Indicators Utilities
 * 
 * Helper functions used across indicator calculations
 */

import { Time, UTCTimestamp } from "lightweight-charts";

/**
 * Remove null values from indicator data for charting
 * 
 * Lightweight-charts requires continuous data without nulls.
 * This function filters out null values while preserving time alignment.
 * 
 * @param timestamps - Array of Unix timestamps
 * @param values - Array of values (may contain nulls)
 * @param timeOffset - Timezone offset in seconds (default: UTC+7 for Vietnam)
 * @returns Object with filtered timestamps and values
 */
export function removeNulls(
    timestamps: number[],
    values: (number | null)[],
    timeOffset: number = 7 * 60 * 60
): { timestamps: UTCTimestamp[]; values: number[] } {
    const filteredTimestamps: UTCTimestamp[] = [];
    const filteredValues: number[] = [];

    for (let i = 0; i < values.length; i++) {
        if (values[i] !== null && timestamps[i] !== undefined) {
            filteredTimestamps.push((timestamps[i] + timeOffset) as UTCTimestamp);
            filteredValues.push(values[i] as number);
        }
    }

    return { timestamps: filteredTimestamps, values: filteredValues };
}
