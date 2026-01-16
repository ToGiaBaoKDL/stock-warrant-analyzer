// Warrant Types for Frontend State

export interface WarrantPosition {
  symbol: string;
  buyPrice: number;
  quantity: number;
  buyFeePercent: number; // Default 0.15%
}

export interface WarrantScenario {
  id: string;
  sellPrice: number;
  sellFeePercent: number; // Default 0.15%
  taxPercent: number; // Default 0.1%
}

export interface WarrantCalculationInput {
  warrant: WarrantPosition;
  scenarios: WarrantScenario[];
  warrantInfo: {
    conversionRatio: number;
    exercisePrice: number;
    underlyingPrice: number;
    daysToMaturity: number;
  };
}

export interface WarrantScreenerFilter {
  underlyingSymbol: string;
  targetUnderlyingPrice: number;
  minDaysToMaturity?: number;
  maxBreakEven?: number;
}
