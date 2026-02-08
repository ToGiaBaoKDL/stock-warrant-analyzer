/**
 * Analysis Components - Tab components for stock/warrant analysis page
 */

// Regular exports for components that need SSR
export { PositionForm, QuickPresets, ScenarioInput } from "./PositionForm";

// Trading Signal Panel
export { TradingSignalPanel } from "./TradingSignalPanel";

// Signal Summary Row (compact inline version for what-if page)
export { SignalSummaryRow } from "./SignalSummaryRow";

// IndicatorPanel
export { IndicatorPanel, DEFAULT_INDICATORS, type IndicatorSettings } from "./IndicatorPanel";

// Price Target Panel (Support/Resistance)
export { PriceTargetPanel } from "./PriceTargetPanel";

// Lazy-loaded tab components for better performance
export * from "./LazyTabs";
