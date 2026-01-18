export { useStockPrice, useStockList } from "./useMarketData";
export { useWarrantInfo, useWarrantsByUnderlying, useWarrantList } from "./useWarrants";
export {
  useBreakEven,
  useProfitLoss,
  useExerciseValue,
  useWarrantAnalysis,
} from "./useCalculations";

// New hooks
export { useLocalStorage, useLocalStorageBoolean } from "./useLocalStorage";
export {
  useWarrantCalculations,
  type WarrantTableRow,
  type WarrantCalculationsResult,
  type ProfitFilter,
  type SortOption,
} from "./useWarrantCalculations";
export {
  useScenarioCalculations,
  useWarrantBreakEven,
  type ScenarioRow,
  type ScenarioSummary,
  type ScenarioCalculationsResult,
  type StockPosition,
  type StockScenario,
} from "./useScenarioCalculations";
