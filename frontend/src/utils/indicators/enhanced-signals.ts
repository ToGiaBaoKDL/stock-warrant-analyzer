/**
 * Enhanced Signal Features
 *
 * Six professional-grade signal enrichments that layer on top of the
 * existing 3-Layer Funnel System:
 *
 * 1. **Multi-Timeframe Confirmation** — Aggregate daily data into weekly,
 *    check if both timeframes agree on the trend direction.
 *
 * 2. **Divergence Detection** — Detect RSI & MACD divergences vs price
 *    (higher highs / lower lows comparison).
 *
 * 3. **Support/Resistance Proximity** — How close the current price is to
 *    nearest S/R levels (Pivot + Fibonacci), and which zone it sits in.
 *
 * 4. **Signal Aging / Freshness Score** — How many bars since the current
 *    signal first appeared, with a freshness decay score (1.0 → 0.0).
 *
 * 5. **Risk-Adjusted Ranking** — Expected value per trade combining
 *    indicator consensus, volume, volatility, and trend alignment.
 *
 * 6. **Trailing Stop Optimizer** — ATR-based trailing stop levels
 *    calculated at 1.5×, 2× and 3× ATR for different risk appetites.
 *
 * @module enhanced-signals
 */

import { calculateRSI } from "./rsi";
import { calculateMACD } from "./macd";
import { calculateEMA, calculateSMA } from "./ma";
import { calculateATR } from "./atr";
import { calculateADX, ADX_THRESHOLDS } from "./adx";
import { calculatePriceTargets, type PriceTargetResult } from "./price-targets";
import type { SignalStrength, FunnelSignal, IndicatorSignal } from "./funnel-signals";

// ===================================================================
// TYPES
// ===================================================================

/** Multi-Timeframe Confirmation result */
export interface MultiTimeframeResult {
    /** Whether weekly trend agrees with daily signal direction */
    isAligned: boolean;
    /** Weekly trend classification */
    weeklyTrend: "bullish" | "bearish" | "neutral";
    /** Daily trend classification */
    dailyTrend: "bullish" | "bearish" | "neutral";
    /** Confidence boost: +1 if aligned, -1 if conflicting, 0 if neutral */
    confidenceAdjust: -1 | 0 | 1;
    reason: string;
}

/** Divergence Detection result */
export interface DivergenceResult {
    /** RSI divergence */
    rsiDivergence: "bullish" | "bearish" | null;
    /** MACD divergence */
    macdDivergence: "bullish" | "bearish" | null;
    /** Whether any actionable divergence was found */
    hasDivergence: boolean;
    /** Strongest divergence signal */
    strongest: "bullish" | "bearish" | null;
    reason: string;
}

/** Support/Resistance Proximity result */
export interface SRProximityResult {
    /** Distance to nearest support (% of current price) */
    supportDistance: number;
    /** Distance to nearest resistance (% of current price) */
    resistanceDistance: number;
    /** Absolute nearest support price */
    nearestSupport: number;
    /** Absolute nearest resistance price */
    nearestResistance: number;
    /** Risk:Reward ratio (distance to resistance / distance to support) */
    riskReward: number;
    /** Qualitative position */
    zone: "near_support" | "near_resistance" | "mid_range" | "above_all" | "below_all";
    reason: string;
}

/** Signal Aging / Freshness Score */
export interface SignalAgingResult {
    /** Number of bars the current signal type has persisted */
    ageBars: number;
    /** Freshness score 0-100 (100 = brand new, decays over time) */
    freshness: number;
    /** Qualitative label */
    label: "fresh" | "recent" | "aging" | "stale";
    reason: string;
}

/** Risk-Adjusted Ranking score */
export interface RiskRankingResult {
    /** Composite score 0-100 (higher = better risk/reward) */
    score: number;
    /** Grade letter */
    grade: "A" | "B" | "C" | "D" | "F";
    /** Breakdown of contributing factors */
    factors: {
        /** Indicator consensus (% of indicators agreeing with signal) */
        consensus: number;
        /** Volume factor (RVOL normalized 0-100) */
        volumeScore: number;
        /** Volatility factor (moderate ATR is best) */
        volatilityScore: number;
        /** Trend alignment factor (multi-TF + regime) */
        trendScore: number;
        /** S/R proximity factor (near support for buy = good) */
        srScore: number;
    };
    reason: string;
}

/** Trailing Stop Optimizer result */
export interface TrailingStopResult {
    /** Current ATR value */
    atr: number;
    /** ATR as % of price */
    atrPercent: number;
    /** Conservative stop (3× ATR from price) */
    conservative: { price: number; distance: number };
    /** Standard stop (2× ATR from price) */
    standard: { price: number; distance: number };
    /** Aggressive stop (1.5× ATR from price) */
    aggressive: { price: number; distance: number };
    /** Recommended multiplier based on volatility */
    recommended: "conservative" | "standard" | "aggressive";
    reason: string;
}

/** Combined enrichment for a single stock */
export interface EnhancedSignalData {
    multiTimeframe: MultiTimeframeResult;
    divergence: DivergenceResult;
    srProximity: SRProximityResult;
    signalAging: SignalAgingResult;
    riskRanking: RiskRankingResult;
    trailingStop: TrailingStopResult;
}

// ===================================================================
// 1. MULTI-TIMEFRAME CONFIRMATION
// ===================================================================

/**
 * Aggregate daily OHLCV into weekly bars.
 * Each week is Mon–Fri; partial last week is included.
 */
function aggregateToWeekly(
    closes: number[],
    highs: number[],
    lows: number[],
    volumes: number[],
): { c: number[]; h: number[]; l: number[]; v: number[] } {
    const wc: number[] = [];
    const wh: number[] = [];
    const wl: number[] = [];
    const wv: number[] = [];

    // Group every 5 bars as one "week"
    for (let i = 0; i < closes.length; i += 5) {
        const end = Math.min(i + 5, closes.length);
        let weekHigh = -Infinity;
        let weekLow = Infinity;
        let weekVol = 0;
        for (let j = i; j < end; j++) {
            weekHigh = Math.max(weekHigh, highs[j]);
            weekLow = Math.min(weekLow, lows[j]);
            weekVol += volumes[j];
        }
        wc.push(closes[end - 1]); // Week close = last day's close
        wh.push(weekHigh);
        wl.push(weekLow);
        wv.push(weekVol);
    }
    return { c: wc, h: wh, l: wl, v: wv };
}

/**
 * Classify trend using EMA crossover system:
 * - EMA10 > EMA20 > EMA50 = bullish
 * - EMA10 < EMA20 < EMA50 = bearish
 * - otherwise = neutral
 */
function classifyTrend(closes: number[]): "bullish" | "bearish" | "neutral" {
    if (closes.length < 50) return "neutral";

    const ema10 = calculateEMA(closes, 10);
    const ema20 = calculateEMA(closes, 20);
    const ema50 = calculateEMA(closes, 50);

    const last10 = ema10.filter((v): v is number => v !== null).pop();
    const last20 = ema20.filter((v): v is number => v !== null).pop();
    const last50 = ema50.filter((v): v is number => v !== null).pop();

    if (!last10 || !last20 || !last50) return "neutral";

    if (last10 > last20 && last20 > last50) return "bullish";
    if (last10 < last20 && last20 < last50) return "bearish";
    return "neutral";
}

export function analyzeMultiTimeframe(
    closes: number[],
    highs: number[],
    lows: number[],
    volumes: number[],
    signalDirection: SignalStrength,
): MultiTimeframeResult {
    const dailyTrend = classifyTrend(closes);

    const weekly = aggregateToWeekly(closes, highs, lows, volumes);
    const weeklyTrend = weekly.c.length >= 50
        ? classifyTrend(weekly.c)
        : "neutral";

    // Determine alignment
    const signalIsBullish = signalDirection === "STRONG_BUY" || signalDirection === "BUY";
    const signalIsBearish = signalDirection === "STRONG_SELL" || signalDirection === "SELL";

    let isAligned = false;
    let confidenceAdjust: -1 | 0 | 1 = 0;

    if (signalIsBullish) {
        if (dailyTrend === "bullish" && weeklyTrend === "bullish") {
            isAligned = true;
            confidenceAdjust = 1;
        } else if (weeklyTrend === "bearish") {
            confidenceAdjust = -1;
        }
    } else if (signalIsBearish) {
        if (dailyTrend === "bearish" && weeklyTrend === "bearish") {
            isAligned = true;
            confidenceAdjust = 1;
        } else if (weeklyTrend === "bullish") {
            confidenceAdjust = -1;
        }
    }

    const trendLabel = (t: string) =>
        t === "bullish" ? "Tăng" : t === "bearish" ? "Giảm" : "Trung lập";

    return {
        isAligned,
        weeklyTrend,
        dailyTrend,
        confidenceAdjust,
        reason: `Ngày: ${trendLabel(dailyTrend)}, Tuần: ${trendLabel(weeklyTrend)}${isAligned ? " ✓ Đồng thuận" : ""}`,
    };
}

// ===================================================================
// 2. DIVERGENCE DETECTION
// ===================================================================

/**
 * Detect divergence between price and an indicator.
 *
 * - **Bullish divergence**: Price makes lower low, indicator makes higher low
 * - **Bearish divergence**: Price makes higher high, indicator makes lower high
 *
 * Uses a lookback of `window` bars and compares the two most recent
 * local extrema.
 */
function detectDivergence(
    prices: number[],
    indicator: (number | null)[],
    window: number = 20,
): "bullish" | "bearish" | null {
    if (prices.length < window || indicator.length < window) return null;

    const n = prices.length;
    const start = n - window;

    // Find two most recent local lows and highs in price
    const priceLows: { idx: number; val: number }[] = [];
    const priceHighs: { idx: number; val: number }[] = [];

    for (let i = start + 1; i < n - 1; i++) {
        if (prices[i] <= prices[i - 1] && prices[i] <= prices[i + 1]) {
            priceLows.push({ idx: i, val: prices[i] });
        }
        if (prices[i] >= prices[i - 1] && prices[i] >= prices[i + 1]) {
            priceHighs.push({ idx: i, val: prices[i] });
        }
    }

    // Check bullish divergence (price lower low, indicator higher low)
    if (priceLows.length >= 2) {
        const [prev, curr] = priceLows.slice(-2);
        const indPrev = indicator[prev.idx];
        const indCurr = indicator[curr.idx];

        if (
            indPrev !== null &&
            indCurr !== null &&
            curr.val < prev.val && // Price lower low
            indCurr > indPrev      // Indicator higher low
        ) {
            return "bullish";
        }
    }

    // Check bearish divergence (price higher high, indicator lower high)
    if (priceHighs.length >= 2) {
        const [prev, curr] = priceHighs.slice(-2);
        const indPrev = indicator[prev.idx];
        const indCurr = indicator[curr.idx];

        if (
            indPrev !== null &&
            indCurr !== null &&
            curr.val > prev.val && // Price higher high
            indCurr < indPrev      // Indicator lower high
        ) {
            return "bearish";
        }
    }

    return null;
}

export function analyzeDivergence(
    closes: number[],
): DivergenceResult {
    const rsi = calculateRSI(closes, 14);
    const macd = calculateMACD(closes, 12, 26, 9);

    const rsiDivergence = detectDivergence(closes, rsi, 30);
    const macdDivergence = detectDivergence(closes, macd.histogram, 30);

    const hasDivergence = rsiDivergence !== null || macdDivergence !== null;

    // Strongest = if both agree, use that; else RSI takes priority (more reliable)
    let strongest: "bullish" | "bearish" | null = null;
    if (rsiDivergence && macdDivergence && rsiDivergence === macdDivergence) {
        strongest = rsiDivergence;
    } else if (rsiDivergence) {
        strongest = rsiDivergence;
    } else if (macdDivergence) {
        strongest = macdDivergence;
    }

    const parts: string[] = [];
    if (rsiDivergence) parts.push(`RSI PK ${rsiDivergence === "bullish" ? "tăng" : "giảm"}`);
    if (macdDivergence) parts.push(`MACD PK ${macdDivergence === "bullish" ? "tăng" : "giảm"}`);

    return {
        rsiDivergence,
        macdDivergence,
        hasDivergence,
        strongest,
        reason: parts.length > 0 ? parts.join(", ") : "Không có phân kỳ",
    };
}

// ===================================================================
// 3. SUPPORT/RESISTANCE PROXIMITY
// ===================================================================

export function analyzeSRProximity(
    closes: number[],
    highs: number[],
    lows: number[],
): SRProximityResult {
    const currentPrice = closes[closes.length - 1];

    let targets: PriceTargetResult;
    try {
        targets = calculatePriceTargets(highs, lows, closes, 60);
    } catch {
        return {
            supportDistance: 0,
            resistanceDistance: 0,
            nearestSupport: currentPrice,
            nearestResistance: currentPrice,
            riskReward: 1,
            zone: "mid_range",
            reason: "Không đủ dữ liệu S/R",
        };
    }

    const supportDist = currentPrice > 0
        ? ((currentPrice - targets.nearestSupport) / currentPrice) * 100
        : 0;
    const resistanceDist = currentPrice > 0
        ? ((targets.nearestResistance - currentPrice) / currentPrice) * 100
        : 0;

    const riskReward = supportDist > 0 ? resistanceDist / supportDist : 0;

    const zone = targets.pricePosition;

    const zoneLabel: Record<string, string> = {
        near_support: "Gần hỗ trợ",
        near_resistance: "Gần kháng cự",
        mid_range: "Giữa vùng",
        above_all: "Trên tất cả",
        below_all: "Dưới tất cả",
    };

    return {
        supportDistance: Math.round(supportDist * 100) / 100,
        resistanceDistance: Math.round(resistanceDist * 100) / 100,
        nearestSupport: Math.round(targets.nearestSupport * 100) / 100,
        nearestResistance: Math.round(targets.nearestResistance * 100) / 100,
        riskReward: Math.round(riskReward * 100) / 100,
        zone,
        reason: `${zoneLabel[zone] ?? zone} | S: -${supportDist.toFixed(1)}% | R: +${resistanceDist.toFixed(1)}% | RR: ${riskReward.toFixed(1)}`,
    };
}

// ===================================================================
// 4. SIGNAL AGING / FRESHNESS SCORE
// ===================================================================

/**
 * Check how many bars the current signal type has been active by
 * looking at historical closes and regenerating the signal at each
 * recent bar. For performance, only scans the last `maxLookback` bars.
 *
 * Freshness decays exponentially: freshness = 100 × e^(−0.2 × age)
 * - age 0 → 100 (brand new)
 * - age 3 → ~55
 * - age 5 → ~37
 * - age 10 → ~14
 * - age 15+ → ~5 (stale)
 */
export function analyzeSignalAging(
    closes: number[],
    highs: number[],
    lows: number[],
    volumes: number[],
    currentSignal: SignalStrength,
    maxLookback: number = 15,
): SignalAgingResult {
    // We'll re-classify the signal at progressively earlier end-points
    // to find when the signal first appeared.
    // For efficiency, we use a lightweight regime check (EMA crossover) instead
    // of full `generateFunnelSignal` at every bar.
    const n = closes.length;
    let ageBars = 0;

    // Quick classification using EMA + RSI for speed
    for (let offset = 1; offset <= Math.min(maxLookback, n - 50); offset++) {
        const end = n - offset;
        const subCloses = closes.slice(0, end);
        const subHighs = highs.slice(0, end);
        const subLows = lows.slice(0, end);

        if (subCloses.length < 50) break;

        // Lightweight trend check
        const trend = classifyTrend(subCloses);
        const rsi = calculateRSI(subCloses, 14);
        const lastRsi = rsi.filter((v): v is number => v !== null).pop();

        // Approximate the signal class from trend + RSI
        let approxSignal: SignalStrength = "NEUTRAL";
        if (trend === "bullish" && lastRsi !== undefined) {
            approxSignal = lastRsi < 55 ? "BUY" : "NEUTRAL";
        } else if (trend === "bearish" && lastRsi !== undefined) {
            approxSignal = lastRsi > 50 ? "SELL" : "NEUTRAL";
        }

        // Check if same broad category
        const sameBucket = isSameSignalBucket(currentSignal, approxSignal);
        if (sameBucket) {
            ageBars = offset;
        } else {
            break;
        }
    }

    // Freshness = exponential decay
    const freshness = Math.round(100 * Math.exp(-0.2 * ageBars));

    let label: SignalAgingResult["label"];
    if (ageBars <= 1) label = "fresh";
    else if (ageBars <= 3) label = "recent";
    else if (ageBars <= 7) label = "aging";
    else label = "stale";

    const labelVi: Record<string, string> = {
        fresh: "Mới",
        recent: "Gần đây",
        aging: "Đang cũ",
        stale: "Cũ",
    };

    return {
        ageBars,
        freshness,
        label,
        reason: `${labelVi[label]} (${ageBars} phiên) — Độ tươi: ${freshness}%`,
    };
}

function isSameSignalBucket(a: SignalStrength, b: SignalStrength): boolean {
    const bullish: SignalStrength[] = ["STRONG_BUY", "BUY"];
    const bearish: SignalStrength[] = ["STRONG_SELL", "SELL"];
    if (bullish.includes(a) && bullish.includes(b)) return true;
    if (bearish.includes(a) && bearish.includes(b)) return true;
    if (a === "NEUTRAL" && b === "NEUTRAL") return true;
    return false;
}

// ===================================================================
// 5. RISK-ADJUSTED RANKING
// ===================================================================

/**
 * Compute a composite risk-adjusted score (0–100) that combines:
 *
 * - **Indicator consensus** (40%): % of IndicatorSignal[] that agree
 *   with the signal direction
 * - **Volume score** (20%): RVOL normalized (1.0 = 50, 2.0 = 100)
 * - **Volatility score** (15%): Moderate ATR% is best (inverted U)
 * - **Trend score** (15%): Multi-TF alignment bonus
 * - **S/R score** (10%): Near support for buy / near resistance for sell
 */
export function analyzeRiskRanking(
    signal: FunnelSignal,
    multiTf: MultiTimeframeResult,
    srProximity: SRProximityResult,
): RiskRankingResult {
    const direction = signal.overall;
    const isBuy = direction === "STRONG_BUY" || direction === "BUY";
    const isSell = direction === "STRONG_SELL" || direction === "SELL";

    // 1) Indicator consensus
    const indicators = signal.indicators;
    const totalInd = indicators.length;
    let agreeCount = 0;
    if (totalInd > 0) {
        for (const ind of indicators) {
            if (isBuy && ind.signal === "bullish") agreeCount++;
            else if (isSell && ind.signal === "bearish") agreeCount++;
        }
    }
    const consensus = totalInd > 0 ? (agreeCount / totalInd) * 100 : 50;

    // 2) Volume score: RVOL 0→0, 1.0→50, 2.0→100, cap at 100
    const rvol = signal.layer3.rvol ?? 0;
    const volumeScore = Math.min(100, rvol * 50);

    // 3) Volatility score: inverted U curve (moderate 1-3% ATR% is best)
    const atrInd = indicators.find(i => i.indicator === "ATR");
    let volatilityScore = 50; // default
    if (atrInd?.value) {
        const atrPct = parseFloat(atrInd.value);
        if (!isNaN(atrPct)) {
            // Peak at 2%, drop off at extremes
            volatilityScore = Math.max(0, 100 - Math.abs(atrPct - 2) * 25);
        }
    }

    // 4) Trend score: multi-TF alignment
    let trendScore = 50;
    if (multiTf.confidenceAdjust === 1) trendScore = 100;
    else if (multiTf.confidenceAdjust === -1) trendScore = 10;
    // Regime bonus
    if (isBuy && (signal.layer1.regime === "UPTREND_STRONG")) trendScore = Math.min(100, trendScore + 20);
    if (isSell && signal.layer1.regime === "DOWNTREND") trendScore = Math.min(100, trendScore + 20);

    // 5) S/R score
    let srScore = 50;
    if (isBuy) {
        // Near support = good for buy
        if (srProximity.zone === "near_support") srScore = 90;
        else if (srProximity.zone === "near_resistance") srScore = 20;
        else if (srProximity.riskReward >= 2) srScore = 80;
        else if (srProximity.riskReward >= 1) srScore = 60;
    } else if (isSell) {
        // Near resistance = good for sell
        if (srProximity.zone === "near_resistance") srScore = 90;
        else if (srProximity.zone === "near_support") srScore = 20;
    }

    // Composite weighted score
    const score = Math.round(
        consensus * 0.40 +
        volumeScore * 0.20 +
        volatilityScore * 0.15 +
        trendScore * 0.15 +
        srScore * 0.10
    );

    // Grade
    let grade: RiskRankingResult["grade"];
    if (score >= 80) grade = "A";
    else if (score >= 65) grade = "B";
    else if (score >= 50) grade = "C";
    else if (score >= 35) grade = "D";
    else grade = "F";

    return {
        score,
        grade,
        factors: {
            consensus: Math.round(consensus),
            volumeScore: Math.round(volumeScore),
            volatilityScore: Math.round(volatilityScore),
            trendScore: Math.round(trendScore),
            srScore: Math.round(srScore),
        },
        reason: `Score: ${score}/100 (${grade}) | Đồng thuận: ${Math.round(consensus)}%, RVOL: ${Math.round(volumeScore)}%, Vol: ${Math.round(volatilityScore)}%`,
    };
}

// ===================================================================
// 6. TRAILING STOP OPTIMIZER
// ===================================================================

export function analyzeTrailingStop(
    closes: number[],
    highs: number[],
    lows: number[],
    signalDirection: SignalStrength,
): TrailingStopResult {
    const currentPrice = closes[closes.length - 1];
    const atrResult = calculateATR(highs, lows, closes, 14);
    const lastAtr = atrResult.atr.filter((v): v is number => v !== null).pop() ?? 0;
    const atrPercent = currentPrice > 0 ? (lastAtr / currentPrice) * 100 : 0;

    const isBuy = signalDirection === "STRONG_BUY" || signalDirection === "BUY";

    // For BUY signals: stop is below price
    // For SELL signals: stop is above price
    const sign = isBuy ? -1 : 1;

    const conservative = {
        price: Math.round((currentPrice + sign * 3 * lastAtr) * 100) / 100,
        distance: Math.round(3 * atrPercent * 100) / 100,
    };
    const standard = {
        price: Math.round((currentPrice + sign * 2 * lastAtr) * 100) / 100,
        distance: Math.round(2 * atrPercent * 100) / 100,
    };
    const aggressive = {
        price: Math.round((currentPrice + sign * 1.5 * lastAtr) * 100) / 100,
        distance: Math.round(1.5 * atrPercent * 100) / 100,
    };

    // Recommended based on volatility
    let recommended: TrailingStopResult["recommended"] = "standard";
    if (atrPercent > 4) recommended = "conservative"; // High vol → wider stop
    else if (atrPercent < 1.5) recommended = "aggressive"; // Low vol → tighter

    return {
        atr: Math.round(lastAtr * 100) / 100,
        atrPercent: Math.round(atrPercent * 100) / 100,
        conservative,
        standard,
        aggressive,
        recommended,
        reason: `ATR: ${lastAtr.toFixed(2)} (${atrPercent.toFixed(1)}%) | Stop đề xuất: ${recommended === "conservative" ? "Bảo thủ" : recommended === "aggressive" ? "Năng động" : "Tiêu chuẩn"} (${standard.distance.toFixed(1)}%)`,
    };
}

// ===================================================================
// MAIN ENTRY: COMPUTE ALL ENHANCEMENTS
// ===================================================================

/**
 * Compute all 6 enhanced signal features for a given stock.
 * Designed to run AFTER the main `generateFunnelSignal()` call.
 *
 * @param closes  - Daily close prices (oldest → newest)
 * @param highs   - Daily high prices
 * @param lows    - Daily low prices
 * @param volumes - Daily volumes
 * @param signal  - The existing FunnelSignal from generateFunnelSignal()
 * @returns Enhanced signal data with all 6 features
 */
export function computeEnhancedSignals(
    closes: number[],
    highs: number[],
    lows: number[],
    volumes: number[],
    signal: FunnelSignal,
): EnhancedSignalData {
    // 1. Multi-Timeframe
    const multiTimeframe = analyzeMultiTimeframe(
        closes, highs, lows, volumes,
        signal.overall,
    );

    // 2. Divergence
    const divergence = analyzeDivergence(closes);

    // 3. S/R Proximity
    const srProximity = analyzeSRProximity(closes, highs, lows);

    // 4. Signal Aging
    const signalAging = analyzeSignalAging(
        closes, highs, lows, volumes,
        signal.overall,
    );

    // 5. Risk Ranking
    const riskRanking = analyzeRiskRanking(signal, multiTimeframe, srProximity);

    // 6. Trailing Stop
    const trailingStop = analyzeTrailingStop(closes, highs, lows, signal.overall);

    return {
        multiTimeframe,
        divergence,
        srProximity,
        signalAging,
        riskRanking,
        trailingStop,
    };
}
