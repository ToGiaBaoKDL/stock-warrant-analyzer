/**
 * Stock Warrant Analyzer - Core Calculation Functions
 *
 * SINGLE SOURCE OF TRUTH for all financial calculations
 * All calculations happen on the frontend using market data from the backend
 *
 * Vietnam Stock Market Constants:
 * - Trading Fee: 0.15% (typical broker fee)
 * - Sell Tax: 0.1% (personal income tax on securities)
 */

import type {
  CostBreakdown,
  RevenueBreakdown,
  ProfitLossResult,
  BreakEvenResult,
  ExerciseResult,
  FeeCalculation,
  TaxCalculation,
  ScenarioResult,
  WarrantAnalysisResult,
} from "@/types/calculation";

import type { WarrantPosition, WarrantScenario } from "@/types/warrant";

// ============================================
// Constants
// ============================================

export const DEFAULT_BUY_FEE_PERCENT = 0.15; // 0.15%
export const DEFAULT_SELL_FEE_PERCENT = 0.15; // 0.15%
export const DEFAULT_SELL_TAX_PERCENT = 0.1; // 0.1%

// Days to maturity warning threshold
export const MATURITY_WARNING_DAYS = 14;

// ============================================
// Fee Calculations
// ============================================

/**
 * Calculate trading fees (buy and sell)
 *
 * @param buyValue - Total buy value (price * quantity)
 * @param sellValue - Total sell value (price * quantity)
 * @param buyFeePercent - Buy fee percentage (default 0.15%)
 * @param sellFeePercent - Sell fee percentage (default 0.15%)
 */
export function calculateFees(
  buyValue: number,
  sellValue: number,
  buyFeePercent: number = DEFAULT_BUY_FEE_PERCENT,
  sellFeePercent: number = DEFAULT_SELL_FEE_PERCENT
): FeeCalculation {
  const buyFee = (buyValue * buyFeePercent) / 100;
  const sellFee = (sellValue * sellFeePercent) / 100;

  return {
    buyFee,
    sellFee,
    totalFee: buyFee + sellFee,
  };
}

/**
 * Calculate sell tax (0.1% of sell value)
 *
 * @param sellValue - Total sell value (price * quantity)
 * @param taxPercent - Tax percentage (default 0.1%)
 */
export function calculateTax(
  sellValue: number,
  taxPercent: number = DEFAULT_SELL_TAX_PERCENT
): TaxCalculation {
  return {
    sellTax: (sellValue * taxPercent) / 100,
  };
}

// ============================================
// Cost & Revenue Calculations
// ============================================

/**
 * Calculate total cost including buy fee
 *
 * @param buyPrice - Price per unit
 * @param quantity - Number of units
 * @param buyFeePercent - Buy fee percentage
 */
export function calculateCost(
  buyPrice: number,
  quantity: number,
  buyFeePercent: number = DEFAULT_BUY_FEE_PERCENT
): CostBreakdown {
  const principal = buyPrice * quantity;
  const buyFee = (principal * buyFeePercent) / 100;

  return {
    principal,
    buyFee,
    totalCost: principal + buyFee,
  };
}

/**
 * Calculate net revenue after fees and tax
 *
 * @param sellPrice - Sell price per unit
 * @param quantity - Number of units
 * @param sellFeePercent - Sell fee percentage
 * @param taxPercent - Tax percentage
 */
export function calculateRevenue(
  sellPrice: number,
  quantity: number,
  sellFeePercent: number = DEFAULT_SELL_FEE_PERCENT,
  taxPercent: number = DEFAULT_SELL_TAX_PERCENT
): RevenueBreakdown {
  const grossRevenue = sellPrice * quantity;
  const sellFee = (grossRevenue * sellFeePercent) / 100;
  const sellTax = (grossRevenue * taxPercent) / 100;
  const netRevenue = grossRevenue - sellFee - sellTax;

  return {
    grossRevenue,
    sellFee,
    sellTax,
    netRevenue,
  };
}

// ============================================
// Profit/Loss Calculations
// ============================================

/**
 * Calculate complete profit/loss for a trade
 *
 * Formula:
 * - TotalCost = (BuyPrice * Qty) + (BuyPrice * Qty * BuyFee%)
 * - NetRevenue = (SellPrice * Qty) - (SellPrice * Qty * SellFee%) - (SellPrice * Qty * Tax%)
 * - Profit = NetRevenue - TotalCost
 *
 * @param buyPrice - Buy price per unit
 * @param sellPrice - Sell price per unit
 * @param quantity - Number of units
 * @param buyFeePercent - Buy fee percentage
 * @param sellFeePercent - Sell fee percentage
 * @param taxPercent - Tax percentage
 */
export function calculateProfitLoss(
  buyPrice: number,
  sellPrice: number,
  quantity: number,
  buyFeePercent: number = DEFAULT_BUY_FEE_PERCENT,
  sellFeePercent: number = DEFAULT_SELL_FEE_PERCENT,
  taxPercent: number = DEFAULT_SELL_TAX_PERCENT
): ProfitLossResult {
  const cost = calculateCost(buyPrice, quantity, buyFeePercent);
  const revenue = calculateRevenue(sellPrice, quantity, sellFeePercent, taxPercent);

  const profit = revenue.netRevenue - cost.totalCost;
  const profitPercent = cost.totalCost > 0 ? (profit / cost.totalCost) * 100 : 0;

  return {
    cost,
    revenue,
    profit,
    profitPercent,
    isProfit: profit > 0,
  };
}

// ============================================
// Warrant-Specific Calculations
// ============================================

/**
 * Calculate break-even price for a covered warrant
 *
 * Formula: BreakEven = (CW_Price * ConversionRatio) + ExercisePrice
 *
 * The break-even price is the underlying stock price at which
 * holding the warrant to maturity would result in zero profit/loss.
 *
 * @param cwPrice - Current warrant price
 * @param conversionRatio - Conversion ratio (e.g., 4.0 means 4 CW = 1 stock)
 * @param exercisePrice - Strike price of the warrant
 * @param targetUnderlyingPrice - User's expected underlying stock price (optional)
 */
export function calculateBreakEven(
  cwPrice: number,
  conversionRatio: number,
  exercisePrice: number,
  targetUnderlyingPrice?: number
): BreakEvenResult {
  const breakEvenPrice = cwPrice * conversionRatio + exercisePrice;

  // If target price is provided, calculate profitability
  const isProfitable = targetUnderlyingPrice
    ? targetUnderlyingPrice > breakEvenPrice
    : false;

  const profitMargin = targetUnderlyingPrice
    ? targetUnderlyingPrice - breakEvenPrice
    : 0;

  const profitMarginPercent = breakEvenPrice > 0
    ? (profitMargin / breakEvenPrice) * 100
    : 0;

  return {
    breakEvenPrice,
    isProfitable,
    profitMargin,
    profitMarginPercent,
  };
}

/**
 * Calculate exercise value and related metrics for a warrant
 *
 * Used to determine the value if warrant is held to maturity.
 *
 * @param underlyingPrice - Current or expected underlying stock price
 * @param exercisePrice - Strike price of the warrant
 * @param conversionRatio - Conversion ratio
 * @param currentCwPrice - Current warrant price
 * @param quantity - Number of warrants held
 * @param buyPrice - Original buy price
 * @param buyFeePercent - Buy fee percentage
 */
export function calculateExerciseValue(
  underlyingPrice: number,
  exercisePrice: number,
  conversionRatio: number,
  currentCwPrice: number,
  quantity: number = 1,
  buyPrice?: number,
  buyFeePercent: number = DEFAULT_BUY_FEE_PERCENT
): ExerciseResult {
  // Intrinsic value = max(0, (underlyingPrice - exercisePrice) / conversionRatio)
  const rawIntrinsicValue = (underlyingPrice - exercisePrice) / conversionRatio;
  const intrinsicValue = Math.max(0, rawIntrinsicValue);

  // Is the warrant "in the money"?
  const isInTheMoney = underlyingPrice > exercisePrice;

  // Time value = current price - intrinsic value
  const timeValue = Math.max(0, currentCwPrice - intrinsicValue);

  // Calculate exercise profit if held to maturity
  let exerciseProfit = 0;
  if (buyPrice !== undefined && quantity > 0) {
    // Exercise value per warrant at maturity
    const exerciseValuePerUnit = intrinsicValue;

    // Total value at exercise
    const totalExerciseValue = exerciseValuePerUnit * quantity;

    // Cost of holding
    const cost = calculateCost(buyPrice, quantity, buyFeePercent);

    // Profit from exercise (no sell fee/tax on exercise settlement)
    exerciseProfit = totalExerciseValue - cost.totalCost;
  }

  return {
    exerciseValue: intrinsicValue,
    isInTheMoney,
    intrinsicValue,
    timeValue,
    exerciseProfit,
  };
}

// ============================================
// Scenario Analysis
// ============================================

/**
 * Calculate profit/loss for a single scenario
 */
export function calculateScenario(
  position: WarrantPosition,
  scenario: WarrantScenario
): ScenarioResult {
  const profitLoss = calculateProfitLoss(
    position.buyPrice,
    scenario.sellPrice,
    position.quantity,
    position.buyFeePercent,
    scenario.sellFeePercent,
    scenario.taxPercent
  );

  return {
    scenarioId: scenario.id,
    sellPrice: scenario.sellPrice,
    profitLoss,
  };
}

/**
 * Calculate complete warrant analysis with multiple scenarios
 */
export function analyzeWarrant(
  position: WarrantPosition,
  scenarios: WarrantScenario[],
  warrantInfo: {
    conversionRatio: number;
    exercisePrice: number;
    underlyingPrice: number;
    currentCwPrice: number;
  },
  targetUnderlyingPrice?: number
): WarrantAnalysisResult {
  // Break-even analysis
  const breakEven = calculateBreakEven(
    warrantInfo.currentCwPrice,
    warrantInfo.conversionRatio,
    warrantInfo.exercisePrice,
    targetUnderlyingPrice
  );

  // Exercise value analysis
  const exercise = calculateExerciseValue(
    targetUnderlyingPrice || warrantInfo.underlyingPrice,
    warrantInfo.exercisePrice,
    warrantInfo.conversionRatio,
    warrantInfo.currentCwPrice,
    position.quantity,
    position.buyPrice,
    position.buyFeePercent
  );

  // Scenario analysis
  const scenarioResults = scenarios.map((scenario) =>
    calculateScenario(position, scenario)
  );

  return {
    breakEven,
    exercise,
    scenarios: scenarioResults,
  };
}

// ============================================
// Utility Functions
// ============================================

/**
 * Check if a warrant is near expiration (warning threshold)
 * Returns false for unknown days (negative values)
 */
export function isNearExpiration(
  daysToMaturity: number,
  warningDays: number = MATURITY_WARNING_DAYS
): boolean {
  if (daysToMaturity < 0) return false; // Unknown days
  return daysToMaturity <= warningDays;
}

/**
 * Calculate days until expiration from a date string
 */
export function calculateDaysToMaturity(expirationDate: string): number {
  const expiry = new Date(expirationDate);
  const today = new Date();
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

// Note: formatVND and formatPercent are exported from formatters.ts
