/**
 * 3-Layer Funnel Trading Signal System
 *
 * Pipeline: Layer 1 (Market Regime) -> Layer 2 (Setup) -> Layer 3 (Volume Confirmation)
 *
 * LAYER 1: MARKET REGIME
 *   Uses EMA50, MA200, ADX to classify: UPTREND_STRONG | UPTREND_WEAK | DOWNTREND | SIDEWAY | FLOOR_PRICE
 *   Golden Rules:
 *     - UPTREND: only BUY
 *     - DOWNTREND: only SELL (or extreme mean reversion)
 *     - SIDEWAY / FLOOR_PRICE: both strategies possible
 *
 * LAYER 2: SETUP
 *   A. Trend Following (Uptrend only): RSI pullback 35-55 + MACD support
 *   B. Mean Reversion (Downtrend / Sideway / Floor): BB lower + RSI < 25
 *
 * LAYER 3: VOLUME CONFIRMATION
 *   RVOL (Relative Volume) confirms smart money participation.
 *   Signal without volume = noise.
 *
 * Decision: overall signal is determined by (strategy + direction + volumeConfirmed).
 * No intermediate "score" -- the 3-layer pipeline IS the decision.
 *
 * @module funnel-signals
 */

import { calculateRSI } from "./rsi";
import { calculateMACD, detectMACDCrossovers } from "./macd";
import { calculateBollingerBands } from "./bollinger";
import { calculateSMA, calculateEMA } from "./ma";
import { calculateADX, ADX_THRESHOLDS } from "./adx";
import { calculateRVOL, getVolumeConfirmation, checkVolumeDivergence, RVOL_THRESHOLDS, type VolumeConfirmation } from "./volume-confirmation";

// ===================================================================
// TYPES
// ===================================================================

export type MarketRegime =
    | "UPTREND_STRONG"
    | "UPTREND_WEAK"
    | "DOWNTREND"
    | "SIDEWAY"
    | "FLOOR_PRICE";

export type StrategyType =
    | "TREND_FOLLOWING"
    | "MEAN_REVERSION"
    | "NO_SETUP";

export type SignalStrength = "STRONG_BUY" | "BUY" | "NEUTRAL" | "SELL" | "STRONG_SELL";

/** Direction that Layer 2 suggests */
type SetupDirection = "BUY" | "SELL" | "NONE";

export interface MarketRegimeAnalysis {
    regime: MarketRegime;
    ema50: number | null;
    ma200: number | null;
    adx: number | null;
    plusDI: number | null;
    minusDI: number | null;
    priceVsMa200: number;
    ema50VsMa200: number;
    reason: string;
}

export interface SetupAnalysis {
    strategy: StrategyType;
    direction: SetupDirection;
    confidence: "strong" | "moderate" | "weak";

    // Trend Following detail
    rsiPullback?: boolean;
    macdMomentum?: "bullish" | "bearish" | "neutral";
    recentBullishCross?: boolean;

    // Mean Reversion detail
    belowBBLower?: boolean;
    aboveBBUpper?: boolean;
    rsiExtreme?: boolean;
    rsiOverbought?: boolean;
    deviationFromMA20?: number;

    reason: string;
}

export interface ConfirmationAnalysis {
    rvol: number;
    volumeStrength: "strong" | "moderate" | "weak";
    isConfirmed: boolean;
    divergence: "bullish" | "bearish" | null;
    reason: string;
}

export interface IndicatorSignal {
    indicator: string;
    signal: "bullish" | "bearish" | "neutral";
    value?: string;
    reason: string;
}

export interface FunnelSignal {
    overall: SignalStrength;
    layer1: MarketRegimeAnalysis;
    layer2: SetupAnalysis;
    layer3: ConfirmationAnalysis;
    indicators: IndicatorSignal[];
    summary: string;
    actionable: boolean;
    timestamp: Date;
}

// ===================================================================
// SHARED INDICATOR CACHE
// ===================================================================

interface IndicatorCache {
    lastRsi: number | undefined;
    lastHist: number | undefined;
    prevHist: number | undefined;
    lastMacd: number | undefined;
    lastSignalLine: number | undefined;
    macdMomentum: "bullish" | "bearish" | "neutral";
    recentBullishCross: boolean;
    lastBBLower: number | null;
    lastBBUpper: number | null;
    lastBBMiddle: number | null;
    percentB: number | null;
    deviationFromMA20: number;
    rvol: number | null;
}

/**
 * Compute all technical indicators ONCE and cache results.
 * Used by Layer 2, Layer 3, and indicator UI display.
 */
function computeIndicators(closes: number[], volumes: number[]): IndicatorCache {
    const currentPrice = closes[closes.length - 1];

    // RSI
    const rsi = calculateRSI(closes, 14);
    const lastRsi = rsi.filter(v => v !== null).pop() as number | undefined;

    // MACD
    const macd = calculateMACD(closes, 12, 26, 9);
    const lastMacd = macd.macd.filter(v => v !== null).pop();
    const lastSignalLine = macd.signal.filter(v => v !== null).pop();
    const histArr = macd.histogram;
    const lastHist = histArr.filter(v => v !== null).pop();
    const prevHist = histArr.length >= 2
        ? (histArr[histArr.length - 2] ?? undefined)
        : undefined;

    const macdMomentum: "bullish" | "bearish" | "neutral" =
        (lastMacd && lastSignalLine && lastMacd > lastSignalLine) ? "bullish" :
        (lastMacd && lastSignalLine && lastMacd < lastSignalLine) ? "bearish" : "neutral";

    const crossovers = detectMACDCrossovers(macd.macd, macd.signal);
    const recentBullishCross = crossovers.length > 0 &&
        crossovers[crossovers.length - 1].type === "bullish" &&
        crossovers[crossovers.length - 1].index >= macd.macd.length - 5;

    // Bollinger Bands
    const bb = calculateBollingerBands(closes, 20, 2);
    const lastBBLower = bb.lower[bb.lower.length - 1];
    const lastBBUpper = bb.upper[bb.upper.length - 1];
    const lastBBMiddle = bb.middle[bb.middle.length - 1];

    let percentB: number | null = null;
    if (lastBBLower && lastBBUpper && lastBBUpper !== lastBBLower) {
        percentB = (currentPrice - lastBBLower) / (lastBBUpper - lastBBLower);
    }

    // Deviation from MA20 (in units of half-band-width)
    const ma20 = calculateSMA(closes, 20);
    const lastMa20 = ma20.filter(v => v !== null).pop() as number | undefined;
    let deviationFromMA20 = 0;
    if (lastMa20 && lastBBMiddle && lastBBLower) {
        const halfBand = lastBBMiddle - lastBBLower;
        deviationFromMA20 = halfBand > 0 ? (lastMa20 - currentPrice) / halfBand : 0;
    }

    // RVOL
    const rvol = calculateRVOL(volumes, 20);

    return {
        lastRsi,
        lastHist,
        prevHist: prevHist ?? undefined,
        lastMacd,
        lastSignalLine,
        macdMomentum,
        recentBullishCross,
        lastBBLower,
        lastBBUpper,
        lastBBMiddle,
        percentB,
        deviationFromMA20,
        rvol,
    };
}

// ===================================================================
// LAYER 1: MARKET REGIME
// ===================================================================

function analyzeMarketRegime(
    closes: number[],
    highs: number[],
    lows: number[],
    floor?: number
): MarketRegimeAnalysis {
    const currentPrice = closes[closes.length - 1];

    const ema50 = calculateEMA(closes, 50);
    const ma200 = calculateSMA(closes, 200);
    const adxResult = calculateADX(highs, lows, closes, 14);

    const lastEma50 = ema50.filter(v => v !== null).pop() as number | undefined;
    const lastMa200 = ma200.filter(v => v !== null).pop() as number | undefined;
    const lastAdx = adxResult.adx.filter(v => v !== null).pop() as number | undefined;
    const lastPlusDI = adxResult.plusDI.filter(v => v !== null).pop() as number | undefined;
    const lastMinusDI = adxResult.minusDI.filter(v => v !== null).pop() as number | undefined;

    const priceVsMa200 = lastMa200 ? ((currentPrice - lastMa200) / lastMa200) * 100 : 0;
    const ema50VsMa200 = (lastEma50 && lastMa200) ? ((lastEma50 - lastMa200) / lastMa200) * 100 : 0;

    let regime: MarketRegime;
    let reason: string;

    if (floor && currentPrice <= floor) {
        regime = "FLOOR_PRICE";
        reason = `Giá nằm sàn, ADX = ${lastAdx?.toFixed(0) || "N/A"} - Chỉ xem Mean Reversion nếu đảo chiều mạnh`;
    } else if (!lastMa200) {
        regime = "SIDEWAY";
        reason = "Không đủ dữ liệu MA200 - Mặc định Sideway";
    } else if (currentPrice > lastMa200 && lastEma50 && lastEma50 > lastMa200) {
        if (lastAdx && lastAdx >= ADX_THRESHOLDS.STRONG_TREND) {
            regime = "UPTREND_STRONG";
            reason = `Uptrend mạnh: Giá > MA200 (+${priceVsMa200.toFixed(1)}%), EMA50 > MA200, ADX = ${lastAdx.toFixed(0)} > 25`;
        } else {
            regime = "UPTREND_WEAK";
            reason = `Uptrend yếu: Giá > MA200 (+${priceVsMa200.toFixed(1)}%), ADX = ${lastAdx?.toFixed(0) || "N/A"} < 25`;
        }
    } else if (currentPrice < lastMa200) {
        regime = "DOWNTREND";
        reason = `Downtrend: Giá < MA200 (${priceVsMa200.toFixed(1)}%)`;
    } else {
        regime = "SIDEWAY";
        reason = `Sideway: Giá dao động quanh MA, ADX = ${lastAdx?.toFixed(0) || "N/A"}`;
    }

    return {
        regime,
        ema50: lastEma50 ?? null,
        ma200: lastMa200 ?? null,
        adx: lastAdx ?? null,
        plusDI: lastPlusDI ?? null,
        minusDI: lastMinusDI ?? null,
        priceVsMa200,
        ema50VsMa200,
        reason,
    };
}

// ===================================================================
// LAYER 2: SETUP DETECTION
// ===================================================================

function analyzeSetup(
    closes: number[],
    regime: MarketRegime,
    ic: IndicatorCache
): SetupAnalysis {
    const { lastRsi, lastHist, prevHist, macdMomentum, recentBullishCross, lastBBLower, lastBBUpper, deviationFromMA20 } = ic;
    const currentPrice = closes[closes.length - 1];

    // --- STRATEGY A: TREND FOLLOWING (Uptrend only) ---
    if (regime === "UPTREND_STRONG" || regime === "UPTREND_WEAK") {
        const isRsiPullback = lastRsi !== undefined && lastRsi >= 35 && lastRsi <= 55;
        const hasMAcdSupport = macdMomentum === "bullish" || (lastHist !== undefined && lastHist > 0);

        if (isRsiPullback && hasMAcdSupport) {
            const isStrong = regime === "UPTREND_STRONG" && recentBullishCross;
            return {
                strategy: "TREND_FOLLOWING",
                direction: "BUY",
                confidence: isStrong ? "strong" : "moderate",
                rsiPullback: true,
                macdMomentum,
                recentBullishCross,
                reason: `TREND FOLLOWING: RSI = ${lastRsi?.toFixed(0)} (pullback zone), MACD ${macdMomentum}${recentBullishCross ? " + Golden Cross" : ""}`,
            };
        }

        if (lastRsi !== undefined && lastRsi < 35) {
            return {
                strategy: "NO_SETUP",
                direction: "NONE",
                confidence: "weak",
                rsiPullback: false,
                macdMomentum,
                reason: `RSI = ${lastRsi.toFixed(0)} quá thấp trong uptrend - Trend có thể gãy, chờ xác nhận`,
            };
        }

        if (lastRsi !== undefined && lastRsi > 70) {
            return {
                strategy: "NO_SETUP",
                direction: "NONE",
                confidence: "weak",
                rsiPullback: false,
                macdMomentum,
                reason: `RSI = ${lastRsi.toFixed(0)} quá cao - Chờ pullback để mua`,
            };
        }

        return {
            strategy: "NO_SETUP",
            direction: "NONE",
            confidence: "weak",
            rsiPullback: false,
            macdMomentum,
            reason: `Uptrend nhưng chưa có setup - RSI = ${lastRsi?.toFixed(0) || "N/A"}, MACD ${macdMomentum}`,
        };
    }

    // --- STRATEGY B: MEAN REVERSION (Downtrend / Sideway / Floor) ---
    if (regime === "DOWNTREND" || regime === "SIDEWAY" || regime === "FLOOR_PRICE") {
        const isBelowBBLower = lastBBLower !== null && currentPrice < lastBBLower;
        const isRsiExtreme = lastRsi !== undefined && lastRsi < 25;
        const isExtremeDeviation = deviationFromMA20 > 2;

        // Mean Reversion BUY: need BOTH BB below + RSI extreme
        if (isBelowBBLower && isRsiExtreme) {
            const histImproving = lastHist !== undefined && prevHist !== undefined && lastHist > prevHist;
            const isStrong = isExtremeDeviation || (lastRsi !== undefined && lastRsi < 20);
            return {
                strategy: "MEAN_REVERSION",
                direction: "BUY",
                confidence: isStrong ? "strong" : "moderate",
                belowBBLower: true,
                rsiExtreme: true,
                deviationFromMA20,
                reason: `Mean Reversion (Mua): Giá dưới BB Lower, RSI = ${lastRsi?.toFixed(0)}, Độ lệch = ${deviationFromMA20.toFixed(1)}σ${histImproving ? ", MACD cải thiện" : ""}`,
            };
        }

        // Mean Reversion SELL: only in DOWNTREND/SIDEWAY, need BOTH conditions
        if (regime !== "FLOOR_PRICE") {
            const isAboveBBUpper = lastBBUpper !== null && currentPrice > lastBBUpper;
            const isRsiOverbought = lastRsi !== undefined && lastRsi > 70;

            if (isAboveBBUpper && isRsiOverbought) {
                return {
                    strategy: "MEAN_REVERSION",
                    direction: "SELL",
                    confidence: "strong",
                    aboveBBUpper: true,
                    rsiOverbought: true,
                    deviationFromMA20: -deviationFromMA20,
                    reason: `Mean Reversion (Bán): RSI = ${lastRsi?.toFixed(0)}, Giá trên BB Upper`,
                };
            }
        }
    }

    return {
        strategy: "NO_SETUP",
        direction: "NONE",
        confidence: "weak",
        reason: `Chưa có setup rõ ràng - RSI = ${lastRsi?.toFixed(0) || "N/A"}, MACD ${macdMomentum}`,
    };
}

// ===================================================================
// LAYER 3: VOLUME CONFIRMATION
// ===================================================================

function analyzeConfirmation(
    closes: number[],
    volumes: number[],
    setupConfidence: "strong" | "moderate" | "weak"
): ConfirmationAnalysis {
    const volConfirm = getVolumeConfirmation(volumes, 20, 1.2);
    const divergence = checkVolumeDivergence(closes, volumes, 5);

    // Strong setups need only normal volume; weak setups need strong volume
    const needsStrongVolume = setupConfidence !== "strong";
    const isConfirmed = needsStrongVolume
        ? volConfirm.rvol >= RVOL_THRESHOLDS.MODERATE
        : volConfirm.rvol >= RVOL_THRESHOLDS.NORMAL;

    let reason = volConfirm.reason;
    if (divergence) {
        reason += divergence === "bullish"
            ? " | Phân kỳ tăng (cẩn bán)"
            : " | Phân kỳ giảm (cẩn mua)";
    }

    return {
        rvol: volConfirm.rvol,
        volumeStrength: volConfirm.strength,
        isConfirmed,
        divergence,
        reason,
    };
}

// ===================================================================
// DECISION LOGIC
// ===================================================================

/**
 * Determine overall signal purely from the 3-layer pipeline.
 * No intermediate score -- the layers ARE the decision.
 */
function determineOverall(
    regime: MarketRegime,
    setup: SetupAnalysis,
    confirmation: ConfirmationAnalysis
): { overall: SignalStrength; actionable: boolean } {
    const { strategy, direction, confidence } = setup;
    const { isConfirmed, volumeStrength, divergence } = confirmation;

    // No setup = NEUTRAL always
    if (strategy === "NO_SETUP" || direction === "NONE") {
        return { overall: "NEUTRAL", actionable: false };
    }

    // --- BUY direction ---
    if (direction === "BUY") {
        // Golden Rule: no BUY in downtrend unless extreme mean reversion + confirmed
        if (regime === "DOWNTREND" && strategy === "MEAN_REVERSION") {
            if (confidence === "strong" && isConfirmed) {
                return { overall: "BUY", actionable: true };
            }
            return { overall: "NEUTRAL", actionable: false };
        }

        // Floor price: only buy if mean reversion + confirmed + strong
        if (regime === "FLOOR_PRICE") {
            if (strategy === "MEAN_REVERSION" && isConfirmed && confidence === "strong") {
                return { overall: "BUY", actionable: true };
            }
            return { overall: "NEUTRAL", actionable: false };
        }

        // Uptrend / Sideway BUY
        if (confidence === "strong" && isConfirmed) {
            return { overall: "STRONG_BUY", actionable: true };
        }
        if (confidence === "strong" || (confidence === "moderate" && isConfirmed)) {
            return { overall: "BUY", actionable: true };
        }
        if (confidence === "moderate" && volumeStrength !== "weak") {
            return { overall: "BUY", actionable: true };
        }
        // Bearish divergence downgrades any remaining buy
        if (divergence === "bearish") {
            return { overall: "NEUTRAL", actionable: false };
        }
        return { overall: "NEUTRAL", actionable: false };
    }

    // --- SELL direction ---
    if (direction === "SELL") {
        // Golden Rule: no SELL in uptrend
        if (regime === "UPTREND_STRONG" || regime === "UPTREND_WEAK") {
            return { overall: "NEUTRAL", actionable: false };
        }

        // No SELL at floor
        if (regime === "FLOOR_PRICE") {
            return { overall: "NEUTRAL", actionable: false };
        }

        // Downtrend / Sideway SELL
        if (confidence === "strong" && isConfirmed) {
            return { overall: "STRONG_SELL", actionable: true };
        }
        if (confidence === "strong" || (confidence === "moderate" && isConfirmed)) {
            return { overall: "SELL", actionable: true };
        }
        // Bullish divergence downgrades sell
        if (divergence === "bullish") {
            return { overall: "NEUTRAL", actionable: false };
        }
        // Fallback: moderate/weak confidence without confirmation → not actionable
        return { overall: "NEUTRAL", actionable: false };
    }

    return { overall: "NEUTRAL", actionable: false };
}

// ===================================================================
// BUILD INDICATOR SIGNALS FOR UI (reuses IndicatorCache)
// ===================================================================

function buildIndicatorSignals(ic: IndicatorCache): IndicatorSignal[] {
    const signals: IndicatorSignal[] = [];

    // RSI
    if (ic.lastRsi !== undefined) {
        let rsiSignal: "bullish" | "bearish" | "neutral" = "neutral";
        if (ic.lastRsi < 30) rsiSignal = "bullish";
        else if (ic.lastRsi > 70) rsiSignal = "bearish";
        else if (ic.lastRsi >= 35 && ic.lastRsi <= 55) rsiSignal = "bullish";

        signals.push({
            indicator: "RSI",
            signal: rsiSignal,
            reason: `RSI = ${ic.lastRsi.toFixed(1)}`,
            value: ic.lastRsi.toFixed(0),
        });
    }

    // MACD
    if (ic.lastHist !== undefined) {
        signals.push({
            indicator: "MACD",
            signal: ic.lastHist > 0 ? "bullish" : ic.lastHist < 0 ? "bearish" : "neutral",
            reason: `Histogram = ${ic.lastHist.toFixed(2)}`,
            value: ic.lastHist > 0 ? `+${ic.lastHist.toFixed(2)}` : ic.lastHist.toFixed(2),
        });
    }

    // Bollinger Bands
    if (ic.percentB !== null) {
        let bbSignal: "bullish" | "bearish" | "neutral" = "neutral";
        if (ic.percentB < 0) bbSignal = "bullish";
        else if (ic.percentB > 1) bbSignal = "bearish";
        else if (ic.percentB < 0.2) bbSignal = "bullish";
        else if (ic.percentB > 0.8) bbSignal = "bearish";

        signals.push({
            indicator: "BB",
            signal: bbSignal,
            reason: `%B = ${(ic.percentB * 100).toFixed(0)}%`,
            value: `${(ic.percentB * 100).toFixed(0)}%`,
        });
    }

    // RVOL
    if (ic.rvol !== null) {
        signals.push({
            indicator: "RVOL",
            signal: ic.rvol >= 1.5 ? "bullish" : ic.rvol < 0.7 ? "bearish" : "neutral",
            reason: `RVOL = ${ic.rvol.toFixed(2)}x`,
            value: `${ic.rvol.toFixed(1)}x`,
        });
    }

    return signals;
}

// ===================================================================
// SUMMARY
// ===================================================================

function generateSummary(
    overall: SignalStrength,
    layer1: MarketRegimeAnalysis,
    layer2: SetupAnalysis,
    layer3: ConfirmationAnalysis,
): string {
    const label: Record<SignalStrength, string> = {
        STRONG_BUY: "MUA MẠNH",
        BUY: "MUA",
        NEUTRAL: "TRUNG LẬP",
        SELL: "BÁN",
        STRONG_SELL: "BÁN MẠNH",
    };

    const header = label[overall];

    if (layer2.strategy === "NO_SETUP") {
        return `${header}\n` +
            `Regime: ${layer1.reason}\n` +
            `Chưa có setup - Tiếp tục quan sát`;
    }
    if (!layer3.isConfirmed && overall === "NEUTRAL") {
        return `${header}\n` +
            `Setup có nhưng volume không xác nhận\n` +
            `${layer3.reason}`;
    }
    return `${header}\n` +
        `Regime: ${layer1.reason}\n` +
        `Setup: ${layer2.reason}\n` +
        `Volume: ${layer3.reason}`;
}

// ===================================================================
// MAIN ENTRY POINT
// ===================================================================

export function generateFunnelSignal(
    closes: number[],
    highs: number[],
    lows: number[],
    volumes: number[],
    floor?: number,
    _ceiling?: number
): FunnelSignal {
    // Layer 1: Market Regime
    const layer1 = analyzeMarketRegime(closes, highs, lows, floor);

    // Compute all technical indicators ONCE
    const ic = computeIndicators(closes, volumes);

    // Layer 2: Setup Detection
    const layer2 = analyzeSetup(closes, layer1.regime, ic);

    // Layer 3: Volume Confirmation
    const layer3 = analyzeConfirmation(closes, volumes, layer2.confidence);

    // Final Decision
    const { overall, actionable } = determineOverall(layer1.regime, layer2, layer3);

    // Indicator detail for UI (reuses precomputed cache)
    const indicators = buildIndicatorSignals(ic);

    const summary = generateSummary(overall, layer1, layer2, layer3);

    return {
        overall,
        layer1,
        layer2,
        layer3,
        indicators,
        summary,
        actionable,
        timestamp: new Date(),
    };
}

// ===================================================================
// EXPORTS
// ===================================================================

export type { VolumeConfirmation };

export const SIGNAL_COLORS = {
    STRONG_BUY: "#00C853",
    BUY: "#7CB342",
    NEUTRAL: "#9E9E9E",
    SELL: "#FF7043",
    STRONG_SELL: "#D32F2F",
} as const;
