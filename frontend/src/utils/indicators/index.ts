/**
 * Technical Indicators Module
 * 
 * Comprehensive collection of technical analysis indicators
 * for stock and warrant chart analysis.
 * 
 * @module indicators
 * 
 * Structure:
 * - ma.ts: Moving Averages (SMA, EMA, WMA)
 * - bollinger.ts: Bollinger Bands and related metrics
 * - volume.ts: Volume indicators (OBV, VWAP, Volume MA)
 * - macd.ts: MACD (Moving Average Convergence Divergence)
 * - rsi.ts: RSI (Relative Strength Index)
 * - ichimoku.ts: Ichimoku Cloud (Ichimoku Kinko Hyo)
 * - adx.ts: ADX (Average Directional Index) - Trend Strength
 * - volume-confirmation.ts: RVOL and volume confirmation
 * - funnel-signals.ts: 3-Layer Funnel Signal System
 * - utils.ts: Helper functions for data processing
 * 
 * Usage:
 * ```typescript
 * import { calculateSMA, calculateMACD, calculateRSI, generateFunnelSignal } from "@/utils/indicators";
 * ```
 */

// Moving Averages
export {
    calculateSMA,
    calculateEMA,
    type MAType,
} from "./ma";

// Bollinger Bands
export {
    calculateBollingerBands,
    BB_COLORS,
    type BollingerBands,
} from "./bollinger";

// Volume Indicators
export {
    calculateVolumeMA,
    VOLUME_COLORS,
} from "./volume";

// MACD
export {
    calculateMACD,
    detectMACDCrossovers,
    MACD_COLORS,
    type MACDResult,
} from "./macd";

// RSI
export {
    calculateRSI,
    getRSIZone,
    RSI_COLORS,
    RSI_LEVELS,
} from "./rsi";

// Ichimoku Cloud
export {
    calculateIchimoku,
    ICHIMOKU_COLORS,
    type IchimokuResult,
} from "./ichimoku";

// ADX (Average Directional Index) - NEW
export {
    calculateADX,
    getADXStrength,
    ADX_THRESHOLDS,
    ADX_COLORS,
    type ADXResult,
} from "./adx";

// Volume Confirmation (RVOL) - NEW
export {
    calculateRVOL,
    calculateVolumeAverage,
    getVolumeConfirmation,
    checkVolumeDivergence,
    getVolumeStrength,
    RVOL_THRESHOLDS,
    type VolumeConfirmation,
} from "./volume-confirmation";

// Stochastic RSI
export {
    calculateStochasticRSI,
    getStochRSIZone,
    STOCH_RSI_COLORS,
    STOCH_RSI_LEVELS,
    type StochasticRSIResult,
} from "./stochastic-rsi";

// On-Balance Volume (OBV)
export {
    calculateOBV,
    detectOBVDivergence,
    getOBVTrend,
    OBV_COLORS,
    type OBVResult,
} from "./obv";

// Average True Range (ATR)
export {
    calculateATR,
    getVolatilityLevel,
    calculateStopLoss,
    ATR_COLORS,
    type ATRResult,
} from "./atr";

// Backtesting
export {
    runBacktest,
    getBacktestGrade,
    type BacktestResult,
    type BacktestTrade,
    type BacktestOptions,
} from "./backtesting";

// Price Targets (Support/Resistance)
export {
    calculatePivotPoints,
    calculateFibonacciLevels,
    calculatePriceTargets,
    PRICE_TARGET_COLORS,
    type PivotLevels,
    type FibonacciLevels,
    type PriceTargetResult,
} from "./price-targets";

// Enhanced Signal Features
export {
    computeEnhancedSignals,
    analyzeMultiTimeframe,
    analyzeDivergence,
    analyzeSRProximity,
    analyzeSignalAging,
    analyzeRiskRanking,
    analyzeTrailingStop,
    type EnhancedSignalData,
    type MultiTimeframeResult,
    type DivergenceResult,
    type SRProximityResult,
    type SignalAgingResult,
    type RiskRankingResult,
    type TrailingStopResult,
} from "./enhanced-signals";

// Utilities
export {
    removeNulls,
} from "./utils";

// Trading Signals - 3-Layer Funnel System
export {
    // Main function
    generateFunnelSignal,
    
    // Types
    type SignalStrength,
    type MarketRegime,
    type StrategyType,
    type MarketRegimeAnalysis,
    type SetupAnalysis,
    type ConfirmationAnalysis,
    type IndicatorSignal,
    type FunnelSignal,
    
    // Constants
    SIGNAL_COLORS,
} from "./funnel-signals";
