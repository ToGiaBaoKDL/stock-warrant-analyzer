export { useStockPrice, useStockList } from "./useMarketData";
export {
  useStockHistory,
  type ChartHistoryResponse,
  type ChartResolution,
  type UseStockHistoryOptions
} from "./useStockHistory";
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

// Company data hooks
export {
  useCompanyProfile,
  useSubCompanies,
  useLeadership,
  useShareholders,
  useShareholderSummary,
  useCapDividend,
} from "./useCompanyData";

export { useChartColors } from "./useChartColors";
