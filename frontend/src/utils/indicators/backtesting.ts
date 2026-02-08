/**
 * Walk-Forward Backtesting Engine for Funnel Signal System
 *
 * Methodology:
 * This engine performs a **walk-forward backtest** -  at each bar `i` starting from
 * `minDataPoints`, it feeds only data[0..i] to `generateFunnelSignal`, simulating
 * what the signal would have been in real time (no future data leakage).
 *
 * For each actionable signal:
 * - BUY / STRONG_BUY  → checks if close price rises within `holdingPeriod` days
 * - SELL / STRONG_SELL → checks if close price falls within `holdingPeriod` days
 *
 * A "win" is when price moves in the signal's predicted direction.
 *
 * Caveats & Limitations:
 * - **No slippage** -  entry/exit are assumed at exact close prices.
 * - **No transaction fees** -  real trading costs are ignored.
 * - **No position sizing** -  each trade is treated as an equal-weight unit.
 * - **Look-ahead bias free** -  signal generation only sees past data.
 * - **Historical performance does NOT guarantee future results.**
 * - Signal generation is sampled every `signalStep` days for performance;
 *   intermediate days are skipped, which may miss some signals.
 *
 * @module backtesting
 */

import { generateFunnelSignal } from "./funnel-signals";
import type { SignalStrength } from "./funnel-signals";

// ===================================================================
// INTERFACES
// ===================================================================

/** A single simulated trade produced by the backtester. */
export interface BacktestTrade {
  /** Timestamp (index into the source array, usable as a proxy date). */
  date: number;
  /** The signal type that triggered the trade (e.g. "STRONG_BUY"). */
  signal: string;
  /** Close price at the time of signal generation. */
  entryPrice: number;
  /** Close price `holdingPeriod` bars after entry. */
  exitPrice: number;
  /** Percentage return of the trade: (exit − entry) / entry × 100. */
  returnPct: number;
  /** Whether the trade moved in the signal's predicted direction. */
  isWin: boolean;
}

/** Aggregated statistics from a backtest run. */
export interface BacktestResult {
  /** Total number of actionable signals generated. */
  totalSignals: number;
  /** Count of STRONG_BUY + BUY signals. */
  buySignals: number;
  /** Count of STRONG_SELL + SELL signals. */
  sellSignals: number;
  /** Percentage of buy signals where price went up within holdingPeriod. */
  winRate: number;
  /** Average percentage return across all trades. */
  avgReturn: number;
  /** Best single-trade return (%). */
  maxReturn: number;
  /** Worst single-trade return (%). */
  maxDrawdown: number;
  /**
   * Profit factor = (sum of positive returns) / |sum of negative returns|.
   * Infinity when there are no losing trades; 0 when there are no winning trades.
   */
  profitFactor: number;
  /** Per-signal-type breakdown of count, win-rate, and average return. */
  signalBreakdown: Record<
    string,
    { count: number; winRate: number; avgReturn: number }
  >;
  /** Individual trade results, capped at the 50 most recent. */
  trades: BacktestTrade[];
}

/** Options accepted by {@link runBacktest}. */
export interface BacktestOptions {
  /**
   * Only the last `lookbackDays` of trades are included in summary stats.
   * @default 120
   */
  lookbackDays?: number;
  /**
   * Number of bars to hold a position before measuring the exit price.
   * @default 5
   */
  holdingPeriod?: number;
  /**
   * Minimum number of data points before the engine starts generating signals.
   * @default 100
   */
  minDataPoints?: number;
  /**
   * Evaluate signals every N bars to reduce computation cost.
   * Lower = more accurate but slower. Set to 1 to evaluate every bar.
   * @default 3
   */
  signalStep?: number;
}

// ===================================================================
// CONSTANTS
// ===================================================================

const MAX_TRADES_IN_RESULT = 50;

const BUY_SIGNALS: ReadonlySet<SignalStrength> = new Set([
  "STRONG_BUY",
  "BUY",
]);
const SELL_SIGNALS: ReadonlySet<SignalStrength> = new Set([
  "STRONG_SELL",
  "SELL",
]);

// ===================================================================
// HELPERS
// ===================================================================

/**
 * Determine whether a trade is a "win" based on the signal direction.
 * - BUY  signals win when exit > entry.
 * - SELL signals win when exit < entry.
 */
function isTradeFavorable(
  signal: SignalStrength,
  entryPrice: number,
  exitPrice: number
): boolean {
  if (BUY_SIGNALS.has(signal)) return exitPrice > entryPrice;
  if (SELL_SIGNALS.has(signal)) return exitPrice < entryPrice;
  return false;
}

/**
 * Compute the percentage return, with direction awareness.
 * BUY  → (exit − entry) / entry × 100
 * SELL → (entry − exit) / entry × 100  (profit when price drops)
 */
function computeReturn(
  signal: SignalStrength,
  entryPrice: number,
  exitPrice: number
): number {
  if (entryPrice === 0) return 0;
  if (SELL_SIGNALS.has(signal)) {
    return ((entryPrice - exitPrice) / entryPrice) * 100;
  }
  return ((exitPrice - entryPrice) / entryPrice) * 100;
}

/** Build a zero-value `BacktestResult` (used when no signals are found). */
function emptyResult(): BacktestResult {
  return {
    totalSignals: 0,
    buySignals: 0,
    sellSignals: 0,
    winRate: 0,
    avgReturn: 0,
    maxReturn: 0,
    maxDrawdown: 0,
    profitFactor: 0,
    signalBreakdown: {},
    trades: [],
  };
}

// ===================================================================
// MAIN BACKTEST ENGINE
// ===================================================================

/**
 * Run a walk-forward backtest over the provided OHLCV data.
 *
 * The engine iterates from `minDataPoints` to the end of the dataset,
 * invoking `generateFunnelSignal` with an expanding window of historical data.
 * Signals are sampled every `signalStep` bars for performance.
 *
 * @param closes  Array of closing prices (oldest → newest).
 * @param highs   Array of high prices.
 * @param lows    Array of low prices.
 * @param volumes Array of volumes.
 * @param options Backtest configuration.
 * @returns Aggregated backtest statistics, or `null` if data is insufficient.
 */
export function runBacktest(
  closes: number[],
  highs: number[],
  lows: number[],
  volumes: number[],
  options?: BacktestOptions
): BacktestResult | null {
  const {
    lookbackDays = 120,
    holdingPeriod = 5,
    minDataPoints = 100,
    signalStep = 3,
  } = options ?? {};

  const dataLen = closes.length;

  // ── Guard: insufficient data ──
  if (
    dataLen < minDataPoints ||
    highs.length < minDataPoints ||
    lows.length < minDataPoints ||
    volumes.length < minDataPoints
  ) {
    return null;
  }

  // ── Walk-forward loop ──
  const allTrades: BacktestTrade[] = [];
  const step = Math.max(1, Math.floor(signalStep));

  for (let i = minDataPoints; i < dataLen; i += step) {
    // We need at least `holdingPeriod` bars after this point to measure exit
    if (i + holdingPeriod >= dataLen) break;

    // Expanding window: data[0..i] (inclusive)
    const windowCloses = closes.slice(0, i + 1);
    const windowHighs = highs.slice(0, i + 1);
    const windowLows = lows.slice(0, i + 1);
    const windowVolumes = volumes.slice(0, i + 1);

    const signal = generateFunnelSignal(
      windowCloses,
      windowHighs,
      windowLows,
      windowVolumes
    );

    if (!signal.actionable) continue;

    const overall = signal.overall;
    const isBuyType = BUY_SIGNALS.has(overall);
    const isSellType = SELL_SIGNALS.has(overall);

    if (!isBuyType && !isSellType) continue;

    const entryPrice = closes[i];
    const exitPrice = closes[i + holdingPeriod];

    // Safety: skip if prices are invalid
    if (!entryPrice || !exitPrice || !isFinite(entryPrice) || !isFinite(exitPrice)) {
      continue;
    }

    const returnPct = computeReturn(overall, entryPrice, exitPrice);
    const isWin = isTradeFavorable(overall, entryPrice, exitPrice);

    allTrades.push({
      date: i,
      signal: overall,
      entryPrice,
      exitPrice,
      returnPct,
      isWin,
    });
  }

  // ── No actionable signals at all ──
  if (allTrades.length === 0) {
    return emptyResult();
  }

  // ── Filter to lookback window for summary stats ──
  // `lookbackDays` refers to bars from the end of the dataset
  const lookbackStart = dataLen - lookbackDays;
  const recentTrades = allTrades.filter((t) => t.date >= lookbackStart);

  // If no trades in the lookback window, still return structure with all zeros
  if (recentTrades.length === 0) {
    return {
      ...emptyResult(),
      trades: allTrades.slice(-MAX_TRADES_IN_RESULT),
    };
  }

  // ── Aggregate statistics ──
  let buySignals = 0;
  let sellSignals = 0;
  let wins = 0;
  let totalReturn = 0;
  let maxReturn = -Infinity;
  let maxDrawdown = Infinity;
  let sumWins = 0;
  let sumLosses = 0;

  const breakdownMap = new Map<
    string,
    { count: number; wins: number; totalReturn: number }
  >();

  for (const trade of recentTrades) {
    // Count by type
    if (BUY_SIGNALS.has(trade.signal as SignalStrength)) buySignals++;
    if (SELL_SIGNALS.has(trade.signal as SignalStrength)) sellSignals++;

    // Win tracking
    if (trade.isWin) {
      wins++;
      sumWins += trade.returnPct;
    } else {
      sumLosses += Math.abs(trade.returnPct);
    }

    totalReturn += trade.returnPct;
    if (trade.returnPct > maxReturn) maxReturn = trade.returnPct;
    if (trade.returnPct < maxDrawdown) maxDrawdown = trade.returnPct;

    // Per-signal breakdown
    const existing = breakdownMap.get(trade.signal);
    if (existing) {
      existing.count++;
      if (trade.isWin) existing.wins++;
      existing.totalReturn += trade.returnPct;
    } else {
      breakdownMap.set(trade.signal, {
        count: 1,
        wins: trade.isWin ? 1 : 0,
        totalReturn: trade.returnPct,
      });
    }
  }

  const totalSignals = recentTrades.length;
  const winRate = (wins / totalSignals) * 100;
  const avgReturn = totalReturn / totalSignals;
  const profitFactor = sumLosses === 0 ? (sumWins > 0 ? Infinity : 0) : sumWins / sumLosses;

  // Build breakdown record
  const signalBreakdown: BacktestResult["signalBreakdown"] = {};
  for (const [key, val] of breakdownMap) {
    signalBreakdown[key] = {
      count: val.count,
      winRate: val.count > 0 ? (val.wins / val.count) * 100 : 0,
      avgReturn: val.count > 0 ? val.totalReturn / val.count : 0,
    };
  }

  return {
    totalSignals,
    buySignals,
    sellSignals,
    winRate: Math.round(winRate * 100) / 100,
    avgReturn: Math.round(avgReturn * 100) / 100,
    maxReturn: maxReturn === -Infinity ? 0 : Math.round(maxReturn * 100) / 100,
    maxDrawdown: maxDrawdown === Infinity ? 0 : Math.round(maxDrawdown * 100) / 100,
    profitFactor: isFinite(profitFactor)
      ? Math.round(profitFactor * 100) / 100
      : profitFactor,
    signalBreakdown,
    trades: allTrades.slice(-MAX_TRADES_IN_RESULT),
  };
}

// ===================================================================
// GRADING
// ===================================================================

/** Grade thresholds for backtest performance evaluation. */
type BacktestGrade = "A+" | "A" | "B" | "C" | "D" | "F";

/**
 * Assign a letter grade to a backtest based on win-rate and profit factor.
 *
 * | Grade | Win Rate | Profit Factor |
 * |-------|----------|---------------|
 * | A+    | ≥ 70 %   | ≥ 2.0         |
 * | A     | ≥ 60 %   | ≥ 1.5         |
 * | B     | ≥ 50 %   | ≥ 1.2         |
 * | C     | ≥ 40 %   | -              |
 * | D     | ≥ 30 %   | -              |
 * | F     | < 30 %   | -              |
 *
 * @param winRate      Win rate as a percentage (0–100).
 * @param profitFactor Ratio of gross wins to gross losses.
 */
export function getBacktestGrade(
  winRate: number,
  profitFactor: number
): BacktestGrade {
  if (winRate >= 70 && profitFactor >= 2.0) return "A+";
  if (winRate >= 60 && profitFactor >= 1.5) return "A";
  if (winRate >= 50 && profitFactor >= 1.2) return "B";
  if (winRate >= 40) return "C";
  if (winRate >= 30) return "D";
  return "F";
}
