/**
 * ADX (Average Directional Index) Module
 * 
 * ADX measures trend STRENGTH, not direction.
 * Used in Layer 1 of the 3-Layer Funnel to determine Market Regime.
 * 
 * Key Levels:
 * - ADX > 25: Strong trend (good for trend following)
 * - ADX 20-25: Weak trend (transitional)
 * - ADX < 20: Sideway/No trend (good for mean reversion)
 * 
 * Components:
 * - +DI (Positive Directional Indicator): Bullish movement
 * - -DI (Negative Directional Indicator): Bearish movement
 * - ADX: Smoothed average of directional movement strength
 * 
 * @module adx
 */

export interface ADXResult {
    adx: (number | null)[];
    plusDI: (number | null)[];
    minusDI: (number | null)[];
}

/**
 * Calculate True Range (TR)
 * TR = max(High - Low, |High - PrevClose|, |Low - PrevClose|)
 */
function calculateTrueRange(
    highs: number[],
    lows: number[],
    closes: number[]
): number[] {
    const tr: number[] = [];
    
    for (let i = 0; i < highs.length; i++) {
        if (i === 0) {
            tr.push(highs[i] - lows[i]);
        } else {
            const highLow = highs[i] - lows[i];
            const highPrevClose = Math.abs(highs[i] - closes[i - 1]);
            const lowPrevClose = Math.abs(lows[i] - closes[i - 1]);
            tr.push(Math.max(highLow, highPrevClose, lowPrevClose));
        }
    }
    
    return tr;
}

/**
 * Calculate Directional Movement (+DM and -DM)
 * +DM = High - PrevHigh (if positive and > |Low - PrevLow|, else 0)
 * -DM = PrevLow - Low (if positive and > High - PrevHigh, else 0)
 */
function calculateDirectionalMovement(
    highs: number[],
    lows: number[]
): { plusDM: number[]; minusDM: number[] } {
    const plusDM: number[] = [0]; // First value is 0
    const minusDM: number[] = [0];
    
    for (let i = 1; i < highs.length; i++) {
        const upMove = highs[i] - highs[i - 1];
        const downMove = lows[i - 1] - lows[i];
        
        if (upMove > downMove && upMove > 0) {
            plusDM.push(upMove);
        } else {
            plusDM.push(0);
        }
        
        if (downMove > upMove && downMove > 0) {
            minusDM.push(downMove);
        } else {
            minusDM.push(0);
        }
    }
    
    return { plusDM, minusDM };
}

/**
 * Wilder's Smoothing Method
 * First value: SUM of first `period` values
 * After: Previous - (Previous / period) + Current
 */
function wilderSmooth(data: number[], period: number): (number | null)[] {
    const result: (number | null)[] = [];
    
    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
            result.push(null);
        } else if (i === period - 1) {
            // First smoothed value = SUM of first `period` values
            let sum = 0;
            for (let j = 0; j < period; j++) {
                sum += data[i - j];
            }
            result.push(sum);
        } else {
            // Wilder's smoothing: prev - (prev / period) + current
            const prev = result[i - 1] as number;
            result.push(prev - (prev / period) + data[i]);
        }
    }
    
    return result;
}

/**
 * Calculate ADX (Average Directional Index)
 * 
 * Standard period is 14 (Wilder's recommendation)
 * 
 * Formula:
 * 1. Calculate TR, +DM, -DM
 * 2. Smooth with Wilder's method (14 periods)
 * 3. +DI = 100 * Smoothed(+DM) / Smoothed(TR)
 * 4. -DI = 100 * Smoothed(-DM) / Smoothed(TR)
 * 5. DX = 100 * |+DI - -DI| / (+DI + -DI)
 * 6. ADX = Wilder's smoothing of DX (another 14 periods)
 * 
 * @param highs - Array of high prices
 * @param lows - Array of low prices
 * @param closes - Array of closing prices
 * @param period - ADX period (default: 14)
 * @returns ADX result with ADX, +DI, -DI arrays
 */
export function calculateADX(
    highs: number[],
    lows: number[],
    closes: number[],
    period: number = 14
): ADXResult {
    if (!highs || highs.length < period * 2) {
        return {
            adx: [],
            plusDI: [],
            minusDI: [],
        };
    }
    
    // Step 1: Calculate True Range and Directional Movement
    const tr = calculateTrueRange(highs, lows, closes);
    const { plusDM, minusDM } = calculateDirectionalMovement(highs, lows);
    
    // Step 2: Smooth TR, +DM, -DM with Wilder's method
    const smoothedTR = wilderSmooth(tr, period);
    const smoothedPlusDM = wilderSmooth(plusDM, period);
    const smoothedMinusDM = wilderSmooth(minusDM, period);
    
    // Step 3: Calculate +DI and -DI
    const plusDI: (number | null)[] = [];
    const minusDI: (number | null)[] = [];
    const dx: number[] = [];
    
    for (let i = 0; i < highs.length; i++) {
        const sTR = smoothedTR[i];
        const sPlusDM = smoothedPlusDM[i];
        const sMinusDM = smoothedMinusDM[i];
        
        if (sTR === null || sPlusDM === null || sMinusDM === null || sTR === 0) {
            plusDI.push(null);
            minusDI.push(null);
            dx.push(0);
        } else {
            const pdi = 100 * sPlusDM / sTR;
            const mdi = 100 * sMinusDM / sTR;
            plusDI.push(pdi);
            minusDI.push(mdi);
            
            // Calculate DX
            const diSum = pdi + mdi;
            if (diSum === 0) {
                dx.push(0);
            } else {
                dx.push(100 * Math.abs(pdi - mdi) / diSum);
            }
        }
    }
    
    // Step 4: Smooth DX to get ADX (another Wilder's smoothing)
    // Start ADX calculation from where we have valid DX values
    const adx: (number | null)[] = [];
    let adxSum = 0;
    let adxCount = 0;
    let firstADX: number | null = null;
    
    for (let i = 0; i < highs.length; i++) {
        if (plusDI[i] === null) {
            adx.push(null);
        } else {
            adxCount++;
            
            if (adxCount < period) {
                adxSum += dx[i];
                adx.push(null);
            } else if (adxCount === period) {
                adxSum += dx[i];
                firstADX = adxSum / period;
                adx.push(firstADX);
            } else {
                // Wilder's smoothing for ADX
                const prevADX = adx[i - 1] as number;
                const currentADX = (prevADX * (period - 1) + dx[i]) / period;
                adx.push(currentADX);
            }
        }
    }
    
    return {
        adx,
        plusDI,
        minusDI,
    };
}

/**
 * ADX Thresholds for Market Regime Detection
 */
export const ADX_THRESHOLDS = {
    STRONG_TREND: 25,    // Strong trend - good for trend following
    WEAK_TREND: 20,      // Weak/developing trend
    NO_TREND: 15,        // Sideway - good for mean reversion
} as const;

/**
 * Get ADX interpretation
 */
export function getADXStrength(adx: number): "strong" | "moderate" | "weak" | "no_trend" {
    if (adx >= ADX_THRESHOLDS.STRONG_TREND) return "strong";
    if (adx >= ADX_THRESHOLDS.WEAK_TREND) return "moderate";
    if (adx >= ADX_THRESHOLDS.NO_TREND) return "weak";
    return "no_trend";
}

/**
 * ADX Colors for visualization
 */
export const ADX_COLORS = {
    line: "#9333ea",      // Purple for ADX line
    plusDI: "#22c55e",    // Green for +DI
    minusDI: "#ef4444",   // Red for -DI
} as const;
