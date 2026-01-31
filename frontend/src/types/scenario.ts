/**
 * Shared scenario-related types used across hooks and components
 */

/**
 * Result row for what-if scenario analysis
 */
export interface ScenarioRow {
    id: string;
    sellPrice: number;
    grossRevenue: number;
    sellFee: number;
    sellTax: number;
    netRevenue: number;
    profit: number;
    profitPercent: number;
    isProfit: boolean;
    /** Only for stocks - break-even price accounting for fees */
    breakEvenPrice?: number;
}

/**
 * Summary statistics for scenarios
 */
export interface ScenarioSummary {
    bestProfit: number;
    bestProfitPercent: number;
    worstProfit: number;
    worstProfitPercent: number;
    avgProfit: number;
    avgProfitPercent: number;
}

/**
 * Full result from scenario calculations hook
 */
export interface ScenarioCalculationsResult {
    scenarioResults: ScenarioRow[];
    totalCost: number;
    principal: number;
    buyFee: number;
    summary: ScenarioSummary | null;
}
