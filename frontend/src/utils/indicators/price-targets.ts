/**
 * Price Targets -  Support/Resistance via Pivot Points & Fibonacci Retracement
 *
 * This module provides two complementary techniques that traders use to
 * identify potential support and resistance price levels:
 *
 * **Pivot Points** are calculated from the previous period's High, Low, and
 * Close. Floor traders originally used them to define intraday levels where
 * price is likely to stall or reverse. Three resistance levels (R1‑R3) sit
 * above the pivot and three support levels (S1‑S3) sit below it.
 *
 * **Fibonacci Retracement** measures how far price has pulled back from a
 * significant swing high/low. The key ratios (23.6 %, 38.2 %, 50 %, 61.8 %,
 * 78.6 %) are derived from the Fibonacci sequence and are widely watched by
 * technical traders as potential reversal zones.
 *
 * Together they give a layered view of where buying or selling pressure may
 * emerge, helping traders set entries, stops, and profit targets.
 */

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

/** Standard floor pivot point levels derived from a single bar's H/L/C. */
export interface PivotLevels {
  /** Central pivot: (H + L + C) / 3 */
  pivot: number;
  /** First resistance: 2 × P − L */
  r1: number;
  /** Second resistance: P + (H − L) */
  r2: number;
  /** Third resistance: H + 2 × (P − L) */
  r3: number;
  /** First support: 2 × P − H */
  s1: number;
  /** Second support: P − (H − L) */
  s2: number;
  /** Third support: L − 2 × (H − P) */
  s3: number;
}

/** Fibonacci retracement levels computed from a significant price swing. */
export interface FibonacciLevels {
  /** Swing high used for the calculation */
  high: number;
  /** Swing low used for the calculation */
  low: number;
  /** Individual retracement levels */
  levels: {
    /** Human-readable label, e.g. "23.6%" */
    label: string;
    /** Absolute price at this retracement */
    price: number;
    /** Fibonacci ratio (0–1) */
    ratio: number;
  }[];
  /** Direction of the identified swing: "up" if price is trending higher */
  trend: "up" | "down";
}

/** Combined price-target result that merges pivots, fibonacci, and context. */
export interface PriceTargetResult {
  /** Standard pivot point levels */
  pivots: PivotLevels;
  /** Fibonacci retracement levels */
  fibonacci: FibonacciLevels;
  /** Highest support/fib level that is still below the current price */
  nearestSupport: number;
  /** Lowest resistance/fib level that is still above the current price */
  nearestResistance: number;
  /** Qualitative description of where price sits relative to the levels */
  pricePosition:
    | "near_support"
    | "near_resistance"
    | "mid_range"
    | "above_all"
    | "below_all";
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Fibonacci ratios used for retracement calculations. */
const FIBONACCI_RATIOS: { ratio: number; label: string }[] = [
  { ratio: 0.236, label: "23.6%" },
  { ratio: 0.382, label: "38.2%" },
  { ratio: 0.5, label: "50%" },
  { ratio: 0.618, label: "61.8%" },
  { ratio: 0.786, label: "78.6%" },
];

/**
 * Suggested colours for rendering each level type on a chart.
 *
 * - Resistance levels use warm/red tones (selling pressure expected).
 * - Support levels use cool/green tones (buying pressure expected).
 * - The pivot line is neutral.
 * - Fibonacci levels are rendered in a distinct purple/indigo palette.
 */
export const PRICE_TARGET_COLORS = {
  pivot: "#94A3B8", // slate-400 – bright neutral, visible in dark mode
  r1: "#FB923C", // orange-400 – warm resistance
  r2: "#F97316", // orange-500
  r3: "#EA580C", // orange-600
  s1: "#34D399", // emerald-400 – bright support
  s2: "#10B981", // emerald-500
  s3: "#059669", // emerald-600
  fib236: "#C4B5FD", // violet-300 – bright fib, vivid in dark
  fib382: "#A78BFA", // violet-400
  fib500: "#8B5CF6", // violet-500
  fib618: "#7C3AED", // violet-600
  fib786: "#6D28D9", // violet-700
} as const;

// ---------------------------------------------------------------------------
// Calculation helpers
// ---------------------------------------------------------------------------

/**
 * Calculate standard floor **Pivot Points** from a single bar.
 *
 * Floor pivot points were originally used by pit traders to quickly gauge
 * intraday bias. If price opens above the pivot it suggests bullish sentiment;
 * below the pivot, bearish. The R and S levels act as successive
 * support/resistance zones where traders may place limit orders or stops.
 *
 * @param high  - Previous period high
 * @param low   - Previous period low
 * @param close - Previous period close
 * @returns Seven-level {@link PivotLevels} object
 *
 * @example
 * ```ts
 * const pivots = calculatePivotPoints(105, 95, 100);
 * // pivots.pivot === 100, pivots.r1 === 105, pivots.s1 === 95 …
 * ```
 */
export function calculatePivotPoints(
  high: number,
  low: number,
  close: number,
): PivotLevels {
  const pivot = (high + low + close) / 3;

  return {
    pivot,
    r1: 2 * pivot - low,
    r2: pivot + (high - low),
    r3: high + 2 * (pivot - low),
    s1: 2 * pivot - high,
    s2: pivot - (high - low),
    s3: low - 2 * (high - pivot),
  };
}

/**
 * Calculate **Fibonacci Retracement** levels from a series of OHLC data.
 *
 * The function scans the most recent `lookback` bars to identify the
 * significant swing high and swing low.  It then determines the prevailing
 * trend direction:
 *
 * - **Uptrend** (recent close above the midpoint of the swing): retracement
 *   levels are drawn *downward* from the swing high -  they represent zones
 *   where a pullback may find support.
 * - **Downtrend** (recent close below the midpoint): retracement levels are
 *   drawn *upward* from the swing low -  they represent zones where a bounce
 *   may meet resistance.
 *
 * Traders watch for price to stall or reverse at one of the key Fibonacci
 * ratios (23.6 %, 38.2 %, 50 %, 61.8 %, 78.6 %). A confluence of a
 * Fibonacci level with a pivot point or other technical signal strengthens
 * the expected reaction zone.
 *
 * @param highs    - Array of high prices (oldest → newest)
 * @param lows     - Array of low prices  (oldest → newest)
 * @param closes   - Array of close prices (oldest → newest)
 * @param lookback - Number of recent bars to consider (default 60)
 * @returns {@link FibonacciLevels} object
 *
 * @example
 * ```ts
 * const fib = calculateFibonacciLevels(highs, lows, closes);
 * fib.levels.forEach(l => console.log(`${l.label}: ${l.price.toFixed(2)}`));
 * ```
 */
export function calculateFibonacciLevels(
  highs: number[],
  lows: number[],
  closes: number[],
  lookback: number = 60,
): FibonacciLevels {
  const len = Math.min(highs.length, lows.length, closes.length);
  const start = Math.max(0, len - lookback);

  // Find significant swing high / low within the lookback window
  let swingHigh = -Infinity;
  let swingLow = Infinity;

  for (let i = start; i < len; i++) {
    if (highs[i] > swingHigh) swingHigh = highs[i];
    if (lows[i] < swingLow) swingLow = lows[i];
  }

  const range = swingHigh - swingLow;
  const recentClose = closes[len - 1];
  const midpoint = (swingHigh + swingLow) / 2;
  const trend: "up" | "down" = recentClose >= midpoint ? "up" : "down";

  // Build retracement levels
  const levels = FIBONACCI_RATIOS.map(({ ratio, label }) => {
    // Uptrend → retracement from high downward (support zones)
    // Downtrend → retracement from low upward (resistance zones)
    const price =
      trend === "up"
        ? swingHigh - range * ratio
        : swingLow + range * ratio;

    return { label, price, ratio };
  });

  return {
    high: swingHigh,
    low: swingLow,
    levels,
    trend,
  };
}

/**
 * Calculate comprehensive **Price Targets** combining Pivot Points and
 * Fibonacci Retracement.
 *
 * This is the main entry-point for consumers that want a single object
 * summarising all key support/resistance levels plus contextual information
 * about where the current price sits relative to those levels.
 *
 * ### How traders use the result
 *
 * | Field              | Usage                                                |
 * |--------------------|------------------------------------------------------|
 * | `nearestSupport`   | Potential stop-loss or buy zone                     |
 * | `nearestResistance`| Potential take-profit or sell zone                  |
 * | `pricePosition`    | Quick sentiment gauge for dashboards / alerts       |
 * | `pivots`           | Intraday / short-term trading framework             |
 * | `fibonacci`        | Swing-trade pullback / extension targets            |
 *
 * @param highs    - Array of high prices (oldest → newest)
 * @param lows     - Array of low prices  (oldest → newest)
 * @param closes   - Array of close prices (oldest → newest)
 * @param lookback - Lookback window for Fibonacci swing detection (default 60)
 * @returns {@link PriceTargetResult} with pivots, fibonacci, nearest levels,
 *          and a qualitative price-position classification
 *
 * @example
 * ```ts
 * const result = calculatePriceTargets(highs, lows, closes);
 * console.log(`Nearest support : ${result.nearestSupport}`);
 * console.log(`Nearest resistance: ${result.nearestResistance}`);
 * console.log(`Position: ${result.pricePosition}`);
 * ```
 */
export function calculatePriceTargets(
  highs: number[],
  lows: number[],
  closes: number[],
  lookback: number = 60,
): PriceTargetResult {
  const len = Math.min(highs.length, lows.length, closes.length);

  // Use the most recent bar for pivots
  const lastHigh = highs[len - 1];
  const lastLow = lows[len - 1];
  const lastClose = closes[len - 1];

  const pivots = calculatePivotPoints(lastHigh, lastLow, lastClose);
  const fibonacci = calculateFibonacciLevels(highs, lows, closes, lookback);

  // Collect every candidate level into a flat array
  const allLevels: number[] = [
    pivots.s3,
    pivots.s2,
    pivots.s1,
    pivots.pivot,
    pivots.r1,
    pivots.r2,
    pivots.r3,
    ...fibonacci.levels.map((l) => l.price),
  ];

  const currentPrice = lastClose;

  // Nearest support = highest level that is still *below* the current price
  const supports = allLevels.filter((l) => l < currentPrice);
  const nearestSupport =
    supports.length > 0 ? Math.max(...supports) : allLevels[0];

  // Nearest resistance = lowest level that is still *above* the current price
  const resistances = allLevels.filter((l) => l > currentPrice);
  const nearestResistance =
    resistances.length > 0
      ? Math.min(...resistances)
      : allLevels[allLevels.length - 1];

  // Classify price position relative to the nearest levels
  const pricePosition = classifyPricePosition(
    currentPrice,
    nearestSupport,
    nearestResistance,
    allLevels,
  );

  return {
    pivots,
    fibonacci,
    nearestSupport,
    nearestResistance,
    pricePosition,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Determine where the current price sits relative to computed levels.
 *
 * - `near_support`    – within 2 % of the nearest support
 * - `near_resistance` – within 2 % of the nearest resistance
 * - `above_all`       – above every computed level
 * - `below_all`       – below every computed level
 * - `mid_range`       – somewhere in between
 */
function classifyPricePosition(
  price: number,
  nearestSupport: number,
  nearestResistance: number,
  allLevels: number[],
): PriceTargetResult["pricePosition"] {
  const threshold = 0.02; // 2 %

  const maxLevel = Math.max(...allLevels);
  const minLevel = Math.min(...allLevels);

  if (price >= maxLevel) return "above_all";
  if (price <= minLevel) return "below_all";

  const supportDistance = Math.abs(price - nearestSupport) / price;
  const resistanceDistance = Math.abs(nearestResistance - price) / price;

  if (supportDistance <= threshold) return "near_support";
  if (resistanceDistance <= threshold) return "near_resistance";

  return "mid_range";
}
