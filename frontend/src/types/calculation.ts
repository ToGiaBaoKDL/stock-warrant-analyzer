// Calculation Result Types

export interface FeeCalculation {
  buyFee: number;
  sellFee: number;
  totalFee: number;
}

export interface TaxCalculation {
  sellTax: number; // 0.1% of sell value
}

export interface CostBreakdown {
  principal: number; // buyPrice * quantity
  buyFee: number;
  totalCost: number; // principal + buyFee
}

export interface RevenueBreakdown {
  grossRevenue: number; // sellPrice * quantity
  sellFee: number;
  sellTax: number;
  netRevenue: number; // grossRevenue - sellFee - sellTax
}

export interface ProfitLossResult {
  cost: CostBreakdown;
  revenue: RevenueBreakdown;
  profit: number; // netRevenue - totalCost
  profitPercent: number; // (profit / totalCost) * 100
  isProfit: boolean;
}

export interface BreakEvenResult {
  breakEvenPrice: number;
  isProfitable: boolean;
  profitMargin: number; // targetPrice - breakEvenPrice
  profitMarginPercent: number;
}

export interface ExerciseResult {
  exerciseValue: number; // (underlyingPrice - exercisePrice) / conversionRatio
  isInTheMoney: boolean;
  intrinsicValue: number;
  timeValue: number; // currentPrice - intrinsicValue
  exerciseProfit: number; // If held to maturity
}

export interface ScenarioResult {
  scenarioId: string;
  sellPrice: number;
  profitLoss: ProfitLossResult;
}

export interface WarrantAnalysisResult {
  breakEven: BreakEvenResult;
  exercise: ExerciseResult;
  scenarios: ScenarioResult[];
}
