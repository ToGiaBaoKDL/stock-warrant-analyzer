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
 * - utils.ts: Helper functions for data processing
 * 
 * Usage:
 * ```typescript
 * import { calculateSMA, calculateMACD, calculateRSI, calculateIchimoku } from "@/utils/indicators";
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

// Utilities
export {
    removeNulls,
} from "./utils";

// Trading Signals
export {
    generateTradingSignal,
    getRSISignal,
    getMACDSignal,
    getBollingerSignal,
    getMATrendSignal,
    getMomentumSignal,
    SIGNAL_COLORS,
    type SignalStrength,
    type IndicatorSignal,
    type TradingSignal,
} from "./signals";
