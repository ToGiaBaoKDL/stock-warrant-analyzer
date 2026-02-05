/**
 * Trading Signals Module
 * 
 * Combines multiple technical indicators to generate actionable trading signals.
 * Uses a weighted scoring system to determine signal strength.
 * 
 * Signal Types:
 * - STRONG_BUY: Multiple indicators confirm bullish trend
 * - BUY: Bullish signal with moderate confirmation
 * - NEUTRAL: No clear direction
 * - SELL: Bearish signal with moderate confirmation
 * - STRONG_SELL: Multiple indicators confirm bearish trend
 * 
 * @module signals
 */

import { calculateRSI, getRSIZone } from "./rsi";
import { calculateMACD, detectMACDCrossovers } from "./macd";
import { calculateBollingerBands } from "./bollinger";
import { calculateSMA, calculateEMA } from "./ma";

/**
 * Signal strength enum
 */
export type SignalStrength = "STRONG_BUY" | "BUY" | "NEUTRAL" | "SELL" | "STRONG_SELL";

/**
 * Individual indicator signal
 */
export interface IndicatorSignal {
    indicator: string;
    signal: "bullish" | "bearish" | "neutral";
    strength: number; // -100 to 100
    reason: string;
    value?: string; // Display value (e.g., "RSI: 32.5")
}

/**
 * Combined trading signal result
 */
export interface TradingSignal {
    overall: SignalStrength;
    score: number; // -100 to 100
    signals: IndicatorSignal[];
    summary: string;
    timestamp: Date;
}

/**
 * Calculate RSI Signal
 * 
 * RSI < 30: Oversold (bullish)
 * RSI > 70: Overbought (bearish)
 * RSI 30-50: Neutral to bearish
 * RSI 50-70: Neutral to bullish
 */
export function getRSISignal(
    closes: number[],
    period: number = 14
): IndicatorSignal {
    const rsi = calculateRSI(closes, period);
    const lastRSI = rsi.filter(v => v !== null).pop();

    if (lastRSI === undefined || lastRSI === null) {
        return {
            indicator: "RSI",
            signal: "neutral",
            strength: 0,
            reason: "Không đủ dữ liệu",
        };
    }

    const zone = getRSIZone(lastRSI);

    if (zone === "oversold") {
        // RSI < 30: Strong oversold, but more conservative scoring
        // Very low RSI (< 20) = very strong signal
        // Low RSI (20-30) = moderate signal
        let oversoldStrength: number;
        if (lastRSI < 20) {
            oversoldStrength = Math.min(100, 60 + (20 - lastRSI) * 3); // 60-90 for < 20
        } else {
            oversoldStrength = 40 + (30 - lastRSI) * 2; // 40-60 for 20-30
        }
        return {
            indicator: "RSI",
            signal: "bullish",
            strength: oversoldStrength,
            reason: `RSI = ${lastRSI.toFixed(1)} (Quá bán${lastRSI < 20 ? " mạnh" : ""} - Tín hiệu mua)`,
            value: `RSI: ${lastRSI.toFixed(1)}`,
        };
    }

    if (zone === "overbought") {
        // RSI > 70: Strong overbought, conservative scoring
        let overboughtStrength: number;
        if (lastRSI > 80) {
            overboughtStrength = -Math.min(100, 60 + (lastRSI - 80) * 3); // -60 to -90
        } else {
            overboughtStrength = -(40 + (lastRSI - 70) * 2); // -40 to -60
        }
        return {
            indicator: "RSI",
            signal: "bearish",
            strength: overboughtStrength,
            reason: `RSI = ${lastRSI.toFixed(1)} (Quá mua${lastRSI > 80 ? " mạnh" : ""} - Tín hiệu bán)`,
            value: `RSI: ${lastRSI.toFixed(1)}`,
        };
    }

    // Neutral zone (30-70) - very conservative, only slight bias
    // Most traders wait for RSI to exit neutral zone
    const strength = ((lastRSI - 50) / 30) * 20; // -20 to +20 max
    return {
        indicator: "RSI",
        signal: strength > 12 ? "bullish" : strength < -12 ? "bearish" : "neutral",
        strength,
        reason: `RSI = ${lastRSI.toFixed(1)} (Vùng trung lập - Chưa rõ xu hướng)`,
        value: `RSI: ${lastRSI.toFixed(1)}`,
    };
}

/**
 * Calculate MACD Signal
 * 
 * Bullish: MACD > Signal, positive histogram
 * Bearish: MACD < Signal, negative histogram
 * Crossover bonus: Recent crossover adds to signal strength
 */
export function getMACDSignal(
    closes: number[],
    fastPeriod: number = 12,
    slowPeriod: number = 26,
    signalPeriod: number = 9
): IndicatorSignal {
    const { macd, signal, histogram } = calculateMACD(closes, fastPeriod, slowPeriod, signalPeriod);

    const lastMACD = macd.filter(v => v !== null).pop();
    const lastSignal = signal.filter(v => v !== null).pop();
    const lastHist = histogram.filter(v => v !== null).pop();

    if (lastMACD === undefined || lastSignal === undefined || lastHist === undefined) {
        return {
            indicator: "MACD",
            signal: "neutral",
            strength: 0,
            reason: "Không đủ dữ liệu",
            value: "N/A",
        };
    }

    // Check for recent crossovers (last 5 bars)
    const crossovers = detectMACDCrossovers(macd, signal);
    const recentCrossover = crossovers.length > 0 
        ? crossovers[crossovers.length - 1]
        : null;
    const isRecentCrossover = recentCrossover && 
        recentCrossover.index >= macd.length - 5;

    let strength = 0;
    let signalType: "bullish" | "bearish" | "neutral" = "neutral";
    let reason = "";

    // Calculate histogram magnitude relative to recent history
    const recentHist = histogram.slice(-10).filter(h => h !== null) as number[];
    const avgHistMag = recentHist.reduce((sum, h) => sum + Math.abs(h), 0) / recentHist.length;
    const histStrength = Math.abs(lastHist) / Math.max(avgHistMag, 0.001); // Normalize

    if (lastMACD > lastSignal && lastHist > 0) {
        signalType = "bullish";
        // Base strength depends on histogram magnitude
        // Weak signal if histogram too small
        if (histStrength < 0.3) {
            strength = 15; // Very weak signal
            reason = "MACD trên Signal nhẹ";
        } else {
            strength = Math.min(75, 35 + histStrength * 40);
            reason = "MACD trên Signal, Histogram dương";
        }
        
        if (isRecentCrossover && recentCrossover.type === "bullish") {
            strength = Math.min(100, strength + 25);
            reason += " (Golden Cross!)";
        }
    } else if (lastMACD < lastSignal && lastHist < 0) {
        signalType = "bearish";
        if (histStrength < 0.3) {
            strength = -15; // Very weak signal
            reason = "MACD dưới Signal nhẹ";
        } else {
            strength = -Math.min(75, 35 + histStrength * 40);
            reason = "MACD dưới Signal, Histogram âm";
        }
        
        if (isRecentCrossover && recentCrossover.type === "bearish") {
            strength = -Math.min(100, Math.abs(strength) + 25);
            reason += " (Death Cross!)";
        }
    } else {
        reason = "MACD đang chuyển đổi";
        strength = lastHist > 0 ? 8 : lastHist < 0 ? -8 : 0;
    }

    return {
        indicator: "MACD",
        signal: signalType,
        strength,
        reason,
        value: `H: ${lastHist.toFixed(2)}`,
    };
}

/**
 * Calculate Bollinger Bands Signal
 * 
 * Price near lower band: Bullish (oversold)
 * Price near upper band: Bearish (overbought)
 * Price in middle: Neutral
 */
export function getBollingerSignal(
    closes: number[],
    period: number = 20,
    stdDev: number = 2
): IndicatorSignal {
    const bb = calculateBollingerBands(closes, period, stdDev);
    
    const lastClose = closes[closes.length - 1];
    const lastUpper = bb.upper[bb.upper.length - 1];
    const lastMiddle = bb.middle[bb.middle.length - 1];
    const lastLower = bb.lower[bb.lower.length - 1];

    if (!lastUpper || !lastMiddle || !lastLower) {
        return {
            indicator: "Bollinger Bands",
            signal: "neutral",
            strength: 0,
            reason: "Không đủ dữ liệu",
            value: "N/A",
        };
    }

    // Calculate %B (position within bands)
    const percentB = (lastClose - lastLower) / (lastUpper - lastLower);
    const bandWidth = (lastUpper - lastLower) / lastMiddle;

    // Band width matters: tight bands = low volatility, wide bands = high volatility
    // In low volatility, breakouts are more significant
    const isNarrowBands = bandWidth < 0.03; // < 3% width
    const isWideBands = bandWidth > 0.08;   // > 8% width

    if (percentB < 0) {
        // Below lower band - oversold, but check band width
        const baseStrength = 65;
        const extraStrength = Math.min(35, Math.abs(percentB) * 50);
        const widthAdjust = isNarrowBands ? 10 : isWideBands ? -10 : 0;
        return {
            indicator: "Bollinger Bands",
            signal: "bullish",
            strength: Math.min(100, baseStrength + extraStrength + widthAdjust),
            reason: `Giá dưới dải dưới BB (%B = ${(percentB * 100).toFixed(1)}%)${isNarrowBands ? " - Dải hẹp, tín hiệu mạnh" : ""}`,
            value: `%B: ${(percentB * 100).toFixed(0)}%`,
        };
    }

    if (percentB > 1) {
        // Above upper band - overbought
        const baseStrength = 65;
        const extraStrength = Math.min(35, (percentB - 1) * 50);
        const widthAdjust = isNarrowBands ? 10 : isWideBands ? -10 : 0;
        return {
            indicator: "Bollinger Bands",
            signal: "bearish",
            strength: -Math.min(100, baseStrength + extraStrength + widthAdjust),
            reason: `Giá trên dải trên BB (%B = ${(percentB * 100).toFixed(1)}%)${isNarrowBands ? " - Dải hẹp, tín hiệu mạnh" : ""}`,
            value: `%B: ${(percentB * 100).toFixed(0)}%`,
        };
    }

    // Near lower band (0-20%)
    if (percentB < 0.2) {
        const strength = 25 + (0.2 - percentB) * 100; // 25-45 range
        return {
            indicator: "Bollinger Bands",
            signal: "bullish",
            strength,
            reason: `Giá gần dải dưới BB (%B = ${(percentB * 100).toFixed(1)}%) - Có thể hồi`,
            value: `%B: ${(percentB * 100).toFixed(0)}%`,
        };
    }

    // Near upper band (80-100%)
    if (percentB > 0.8) {
        const strength = -(25 + (percentB - 0.8) * 100); // -25 to -45
        return {
            indicator: "Bollinger Bands",
            signal: "bearish",
            strength,
            reason: `Giá gần dải trên BB (%B = ${(percentB * 100).toFixed(1)}%) - Có thể điều chỉnh`,
            value: `%B: ${(percentB * 100).toFixed(0)}%`,
        };
    }

    // Middle zone (20-80%) - neutral with slight bias
    return {
        indicator: "Bollinger Bands",
        signal: "neutral",
        strength: (percentB - 0.5) * 15, // -7.5 to +7.5
        reason: `Giá trong vùng trung lập BB (%B = ${(percentB * 100).toFixed(1)}%)`,
        value: `%B: ${(percentB * 100).toFixed(0)}%`,
    };
}

/**
 * Calculate Moving Average Trend Signal
 * 
 * Uses multiple MA crossovers to determine trend
 */
export function getMATrendSignal(
    closes: number[],
    shortPeriod: number = 20,
    longPeriod: number = 50
): IndicatorSignal {
    const shortMA = calculateSMA(closes, shortPeriod);
    const longMA = calculateSMA(closes, longPeriod);
    
    const lastShort = shortMA.filter(v => v !== null).pop();
    const lastLong = longMA.filter(v => v !== null).pop();
    const lastClose = closes[closes.length - 1];

    if (!lastShort || !lastLong) {
        return {
            indicator: "MA Trend",
            signal: "neutral",
            strength: 0,
            reason: "Không đủ dữ liệu",
            value: "N/A",
        };
    }

    // Check previous values for crossover detection
    const prevShort = shortMA.filter(v => v !== null).slice(-2)[0];
    const prevLong = longMA.filter(v => v !== null).slice(-2)[0];

    const crossedUp = prevShort && prevLong && prevShort <= prevLong && lastShort > lastLong;
    const crossedDown = prevShort && prevLong && prevShort >= prevLong && lastShort < lastLong;

    // Price above both MAs = bullish, below both = bearish
    const aboveShort = lastClose > lastShort;
    const aboveLong = lastClose > lastLong;
    const maSpread = ((lastShort - lastLong) / lastLong) * 100;

    // Check MA slope (trending or flat)
    const shortSlope = shortMA.slice(-5).filter(v => v !== null) as number[];
    const longSlope = longMA.slice(-5).filter(v => v !== null) as number[];
    const isShortRising = shortSlope.length >= 2 && shortSlope[shortSlope.length - 1] > shortSlope[0];
    const isLongRising = longSlope.length >= 2 && longSlope[longSlope.length - 1] > longSlope[0];

    let strength = 0;
    let signalType: "bullish" | "bearish" | "neutral" = "neutral";
    let reason = "";

    // Clear uptrend: price above both MAs, MAs aligned, and trending up
    if (aboveShort && aboveLong && lastShort > lastLong) {
        signalType = "bullish";
        
        // Base strength from spread
        const spreadStrength = Math.min(45, Math.abs(maSpread) * 10);
        strength = 40 + spreadStrength;
        
        // Bonus if MAs are both rising (strong trend)
        if (isShortRising && isLongRising) {
            strength = Math.min(85, strength + 15);
            reason = `Uptrend mạnh: Giá & cả 2 MA đều tăng`;
        } else {
            reason = `Uptrend: Giá trên MA${shortPeriod} & MA${longPeriod}`;
        }
        
        if (crossedUp) {
            strength = Math.min(100, strength + 15);
            reason = `Golden Cross - MA${shortPeriod} cắt lên MA${longPeriod}!`;
        }
    } 
    // Clear downtrend: price below both MAs, MAs aligned, and trending down
    else if (!aboveShort && !aboveLong && lastShort < lastLong) {
        signalType = "bearish";
        
        const spreadStrength = Math.min(45, Math.abs(maSpread) * 10);
        strength = -(40 + spreadStrength);
        
        if (!isShortRising && !isLongRising) {
            strength = -Math.min(85, Math.abs(strength) + 15);
            reason = `Downtrend mạnh: Giá & cả 2 MA đều giảm`;
        } else {
            reason = `Downtrend: Giá dưới MA${shortPeriod} & MA${longPeriod}`;
        }
        
        if (crossedDown) {
            strength = -Math.min(100, Math.abs(strength) + 15);
            reason = `Death Cross - MA${shortPeriod} cắt xuống MA${longPeriod}!`;
        }
    } 
    // Mixed signals - uncertain trend
    else {
        reason = "Xu hướng chưa rõ ràng (giá giữa các MA)";
        strength = maSpread * 4; // Reduced from 5
    }

    return {
        indicator: "MA Trend",
        signal: signalType,
        strength,
        reason,
        value: `${maSpread > 0 ? "+" : ""}${maSpread.toFixed(1)}%`,
    };
}

/**
 * Calculate Price Momentum Signal
 * 
 * Recent price change relative to average range
 */
export function getMomentumSignal(
    closes: number[],
    highs: number[],
    lows: number[],
    period: number = 10
): IndicatorSignal {
    if (closes.length < period + 1) {
        return {
            indicator: "Momentum",
            signal: "neutral",
            strength: 0,
            reason: "Không đủ dữ liệu",
            value: "N/A",
        };
    }

    // Rate of change
    const roc = ((closes[closes.length - 1] - closes[closes.length - period - 1]) / 
                 closes[closes.length - period - 1]) * 100;

    // Average true range for normalization
    let atrSum = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
        const tr = Math.max(
            highs[i] - lows[i],
            Math.abs(highs[i] - closes[i - 1]),
            Math.abs(lows[i] - closes[i - 1])
        );
        atrSum += tr;
    }
    const atr = atrSum / period;
    const atrPercent = (atr / closes[closes.length - 1]) * 100;

    // Normalize ROC by volatility
    const normalizedMomentum = roc / Math.max(atrPercent, 0.8);

    // Check if momentum is consistent (check last 3 periods)
    const roc3 = closes.length > 3 ? 
        ((closes[closes.length - 1] - closes[closes.length - 4]) / closes[closes.length - 4]) * 100 : roc;
    const isConsistent = Math.sign(roc) === Math.sign(roc3);

    let strength = Math.max(-85, Math.min(85, normalizedMomentum * 18));
    
    // Bonus for consistent momentum
    if (isConsistent && Math.abs(strength) > 15) {
        strength = strength > 0 ? 
            Math.min(100, strength + 10) : 
            Math.max(-100, strength - 10);
    }

    let signalType: "bullish" | "bearish" | "neutral" = "neutral";
    
    if (strength > 18) {
        signalType = "bullish";
    } else if (strength < -18) {
        signalType = "bearish";
    }

    return {
        indicator: "Momentum",
        signal: signalType,
        strength,
        reason: `ROC ${period}D = ${roc.toFixed(2)}%, ATR = ${atrPercent.toFixed(2)}%`,
        value: `ROC: ${roc > 0 ? "+" : ""}${roc.toFixed(1)}%`,
    };
}

/**
 * Generate combined trading signal from all indicators
 * 
 * Improved scoring system (production-ready, strict and transparent):
 * 
 * Weights (based on trading priority):
 * - MACD: 25% (primary trend + momentum, most reliable)
 * - MA Trend: 25% (primary trend confirmation)
 * - RSI: 20% (momentum, overbought/oversold)
 * - Bollinger: 15% (volatility + mean reversion)
 * - Momentum: 15% (short-term strength)
 * 
 * Each indicator produces a score from -100 to +100
 * Weighted average is calculated
 * 
 * Confirmation rules (STRICT):
 * - STRONG signals require strong score + majority agreement (≥3 indicators)
 * - Conflicting signals (≥2 bullish AND ≥2 bearish) → NEUTRAL (avoid false breakouts)
 * - Weak signals or indecision → NEUTRAL
 * 
 * Thresholds (aligned with industry standards):
 * - STRONG_BUY:  score ≥ 45 AND ≥3 bullish indicators (high confidence)
 * - BUY:         score ≥ 25 AND ≥2 bullish indicators (moderate confidence)
 * - NEUTRAL:     -25 < score < 25 OR conflicting signals (wait for clarity)
 * - SELL:        score ≤ -25 AND ≥2 bearish indicators (moderate confidence)
 * - STRONG_SELL: score ≤ -45 AND ≥3 bearish indicators (high confidence)
 */
export function generateTradingSignal(
    closes: number[],
    highs: number[],
    lows: number[],
    volumes: number[]
): TradingSignal {
    const signals: IndicatorSignal[] = [];

    // Collect all signals
    signals.push(getRSISignal(closes));
    signals.push(getMACDSignal(closes));
    signals.push(getBollingerSignal(closes));
    signals.push(getMATrendSignal(closes));
    signals.push(getMomentumSignal(closes, highs, lows));

    // Weights for each indicator (total = 1.0)
    // MACD and MA Trend are most important for trend following
    const weights: Record<string, number> = {
        "RSI": 0.20,           // Momentum oscillator
        "MACD": 0.25,          // Trend + momentum
        "Bollinger Bands": 0.15, // Mean reversion
        "MA Trend": 0.25,      // Primary trend
        "Momentum": 0.15,      // Short-term momentum
    };

    // Calculate weighted average
    let totalWeight = 0;
    let weightedScore = 0;

    for (const signal of signals) {
        const weight = weights[signal.indicator] || 0.2;
        weightedScore += signal.strength * weight;
        totalWeight += weight;
    }

    const score = Math.round(weightedScore / totalWeight);

    // Count signal types for confirmation
    const bullishCount = signals.filter(s => s.signal === "bullish").length;
    const bearishCount = signals.filter(s => s.signal === "bearish").length;
    const neutralCount = signals.filter(s => s.signal === "neutral").length;

    // Determine overall signal with strict confirmation rules
    let overall: SignalStrength;
    
    // Check for conflicting signals (both bullish and bearish present with similar counts)
    const hasConflict = bullishCount >= 2 && bearishCount >= 2;
    
    // Very weak score = wait for better opportunity
    const isVeryWeak = Math.abs(score) < 15;
    
    if (hasConflict || isVeryWeak) {
        // Conflicting signals or too weak - be conservative
        overall = "NEUTRAL";
    } else if (score >= 45 && bullishCount >= 3) {
        overall = "STRONG_BUY";
    } else if (score >= 25 && bullishCount >= 2) {
        overall = "BUY";
    } else if (score <= -45 && bearishCount >= 3) {
        overall = "STRONG_SELL";
    } else if (score <= -25 && bearishCount >= 2) {
        overall = "SELL";
    } else {
        overall = "NEUTRAL";
    }

    // Generate summary with indicator breakdown
    let summary = "";
    const scoreText = `(Điểm: ${score > 0 ? "+" : ""}${score})`;
    
    switch (overall) {
        case "STRONG_BUY":
            summary = `🟢 MUA MẠNH ${scoreText}: ${bullishCount}/5 chỉ báo tích cực. Cơ hội tốt để mở vị thế mua.`;
            break;
        case "BUY":
            summary = `🟡 MUA ${scoreText}: ${bullishCount}/5 chỉ báo tích cực. Có thể cân nhắc mua.`;
            break;
        case "NEUTRAL":
            if (hasConflict) {
                summary = `⚪ TRUNG LẬP ${scoreText}: Tín hiệu trái chiều (${bullishCount} tăng, ${bearishCount} giảm). Nên chờ tín hiệu rõ ràng hơn.`;
            } else if (isVeryWeak) {
                summary = `⚪ TRUNG LẬP ${scoreText}: Tín hiệu yếu, chưa có xu hướng. Nên chờ đợi.`;
            } else {
                summary = `⚪ TRUNG LẬP ${scoreText}: Chưa có xu hướng rõ ràng. Nên quan sát thêm.`;
            }
            break;
        case "SELL":
            summary = `🟠 BÁN ${scoreText}: ${bearishCount}/5 chỉ báo tiêu cực. Cân nhắc chốt lời hoặc cắt lỗ.`;
            break;
        case "STRONG_SELL":
            summary = `🔴 BÁN MẠNH ${scoreText}: ${bearishCount}/5 chỉ báo tiêu cực. Nên thoát vị thế.`;
            break;
    }

    return {
        overall,
        score,
        signals,
        summary,
        timestamp: new Date(),
    };
}

/**
 * Signal colors
 */
export const SIGNAL_COLORS = {
    STRONG_BUY: "#00C853",   // Green
    BUY: "#7CB342",          // Light green
    NEUTRAL: "#9E9E9E",      // Gray
    SELL: "#FF7043",         // Light red
    STRONG_SELL: "#D32F2F",  // Red
} as const;
