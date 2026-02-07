/**
 * Volume Confirmation Module
 * 
 * Contains RVOL (Relative Volume) and other volume-based confirmations.
 * Used in Layer 3 of the 3-Layer Funnel for signal confirmation.
 * 
 * "The King" - Volume is the ultimate confirmation:
 * A technical signal is only reliable when "Smart Money" participates.
 * 
 * Key Metrics:
 * - RVOL > 1.5: Strong volume confirmation
 * - RVOL 1.0-1.5: Normal volume
 * - RVOL < 1.0: Weak volume (signal less reliable)
 * 
 * @module volume-confirmation
 */

export interface VolumeConfirmation {
    rvol: number;           // Relative Volume (current / average)
    avgVolume: number;      // 20-day average volume
    currentVolume: number;  // Today's volume
    strength: "strong" | "moderate" | "weak";
    isConfirmed: boolean;   // True if RVOL >= threshold
    reason: string;
}

/**
 * RVOL Thresholds for Signal Confirmation
 */
export const RVOL_THRESHOLDS = {
    STRONG: 2.0,      // 2x average = very strong confirmation
    MODERATE: 1.5,    // 1.5x average = solid confirmation
    NORMAL: 1.0,      // At average = acceptable
    WEAK: 0.7,        // Below average = weak/no confirmation
} as const;

/**
 * Calculate Relative Volume (RVOL)
 * 
 * RVOL = Current Volume / Average Volume (20 periods)
 * 
 * Interpretation:
 * - RVOL > 2.0: Exceptional volume, strong institutional activity
 * - RVOL 1.5-2.0: Above average, good confirmation
 * - RVOL 1.0-1.5: Normal, acceptable
 * - RVOL < 1.0: Below average, weak signal
 * 
 * @param volumes - Array of volume data
 * @param period - Lookback period for average (default: 20)
 * @returns RVOL value or null if insufficient data
 */
export function calculateRVOL(
    volumes: number[],
    period: number = 20
): number | null {
    if (!volumes || volumes.length < period) {
        return null;
    }
    
    const currentVolume = volumes[volumes.length - 1];
    
    // Calculate average of previous `period` volumes (excluding today)
    let sum = 0;
    let count = 0;
    for (let i = volumes.length - period - 1; i < volumes.length - 1; i++) {
        if (i >= 0) {
            sum += volumes[i];
            count++;
        }
    }
    
    const avgVolume = count > 0 ? sum / count : 0;
    
    if (avgVolume === 0) {
        return null;
    }
    
    return currentVolume / avgVolume;
}

/**
 * Calculate Volume Moving Average
 * 
 * @param volumes - Array of volume data
 * @param period - MA period (default: 20)
 * @returns Array of volume MA values
 */
export function calculateVolumeAverage(
    volumes: number[],
    period: number = 20
): (number | null)[] {
    if (!volumes || volumes.length === 0) {
        return [];
    }
    
    const result: (number | null)[] = [];
    
    for (let i = 0; i < volumes.length; i++) {
        if (i < period - 1) {
            result.push(null);
        } else {
            let sum = 0;
            for (let j = 0; j < period; j++) {
                sum += volumes[i - j];
            }
            result.push(sum / period);
        }
    }
    
    return result;
}

/**
 * Get comprehensive volume confirmation analysis
 * 
 * This is the "King" confirmation - determines if smart money is participating.
 * 
 * @param volumes - Array of volume data
 * @param period - Lookback period (default: 20)
 * @param threshold - Minimum RVOL for confirmation (default: 1.2)
 * @returns VolumeConfirmation object
 */
export function getVolumeConfirmation(
    volumes: number[],
    period: number = 20,
    threshold: number = 1.2
): VolumeConfirmation {
    if (!volumes || volumes.length < period) {
        return {
            rvol: 0,
            avgVolume: 0,
            currentVolume: 0,
            strength: "weak",
            isConfirmed: false,
            reason: "Không đủ dữ liệu volume",
        };
    }
    
    const currentVolume = volumes[volumes.length - 1];
    
    // Calculate average volume (excluding today)
    let sum = 0;
    let count = 0;
    for (let i = volumes.length - period - 1; i < volumes.length - 1; i++) {
        if (i >= 0) {
            sum += volumes[i];
            count++;
        }
    }
    
    const avgVolume = count > 0 ? sum / count : 0;
    const rvol = avgVolume > 0 ? currentVolume / avgVolume : 0;
    
    // Determine strength
    let strength: "strong" | "moderate" | "weak";
    let reason: string;
    
    if (rvol >= RVOL_THRESHOLDS.STRONG) {
        strength = "strong";
        reason = `RVOL = ${rvol.toFixed(2)}x (>2x) - Dòng tiền mạnh, Smart Money vào cuộc`;
    } else if (rvol >= RVOL_THRESHOLDS.MODERATE) {
        strength = "strong";
        reason = `RVOL = ${rvol.toFixed(2)}x (1.5-2x) - Khối lượng tốt, xác nhận tín hiệu`;
    } else if (rvol >= RVOL_THRESHOLDS.NORMAL) {
        strength = "moderate";
        reason = `RVOL = ${rvol.toFixed(2)}x (1-1.5x) - Khối lượng bình thường`;
    } else if (rvol >= RVOL_THRESHOLDS.WEAK) {
        strength = "weak";
        reason = `RVOL = ${rvol.toFixed(2)}x (0.7-1x) - Khối lượng thấp, tín hiệu yếu`;
    } else {
        strength = "weak";
        reason = `RVOL = ${rvol.toFixed(2)}x (<0.7x) - Khối lượng rất thấp, không xác nhận`;
    }
    
    return {
        rvol,
        avgVolume,
        currentVolume,
        strength,
        isConfirmed: rvol >= threshold,
        reason,
    };
}

/**
 * Check for volume divergence
 * 
 * Price making new high but volume declining = bearish divergence
 * Price making new low but volume declining = bullish divergence (selling exhaustion)
 * 
 * @param closes - Array of closing prices
 * @param volumes - Array of volumes
 * @param lookback - Lookback period for comparison (default: 5)
 * @returns Divergence type or null
 */
export function checkVolumeDivergence(
    closes: number[],
    volumes: number[],
    lookback: number = 5
): "bullish" | "bearish" | null {
    if (closes.length < lookback + 1 || volumes.length < lookback + 1) {
        return null;
    }
    
    const recentCloses = closes.slice(-lookback);
    const recentVolumes = volumes.slice(-lookback);
    const prevCloses = closes.slice(-lookback * 2, -lookback);
    const prevVolumes = volumes.slice(-lookback * 2, -lookback);
    
    const currentHigh = Math.max(...recentCloses);
    const prevHigh = Math.max(...prevCloses);
    const currentLow = Math.min(...recentCloses);
    const prevLow = Math.min(...prevCloses);
    
    const currentAvgVol = recentVolumes.reduce((a, b) => a + b, 0) / lookback;
    const prevAvgVol = prevVolumes.reduce((a, b) => a + b, 0) / lookback;
    
    // Bearish divergence: new high but lower volume
    if (currentHigh > prevHigh && currentAvgVol < prevAvgVol * 0.8) {
        return "bearish";
    }
    
    // Bullish divergence: new low but lower volume (selling exhaustion)
    if (currentLow < prevLow && currentAvgVol < prevAvgVol * 0.8) {
        return "bullish";
    }
    
    return null;
}

/**
 * Volume strength classification
 */
export function getVolumeStrength(rvol: number): string {
    if (rvol >= RVOL_THRESHOLDS.STRONG) return "Rất mạnh";
    if (rvol >= RVOL_THRESHOLDS.MODERATE) return "Mạnh";
    if (rvol >= RVOL_THRESHOLDS.NORMAL) return "Bình thường";
    if (rvol >= RVOL_THRESHOLDS.WEAK) return "Yếu";
    return "Rất yếu";
}
