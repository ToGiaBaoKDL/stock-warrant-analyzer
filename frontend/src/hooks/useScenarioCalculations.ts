"use client";

import { useMemo } from "react";
import type { FeeSettings } from "@/stores/useWarrantStore";
import { calculateProfitLoss, calculateBreakEven } from "@/utils/calculations";
import type {
    ScenarioRow,
    StockPosition,
    StockScenario,
    ScenarioSummary,
    ScenarioCalculationsResult,
} from "@/types";

// Re-export types for convenience
export type {
    ScenarioRow,
    StockPosition,
    StockScenario,
    ScenarioSummary,
    ScenarioCalculationsResult,
};

// ============================================
// Calculation Functions (Pure)
// ============================================

function calculateScenarioRow(
    scenario: StockScenario,
    position: StockPosition,
    feeSettings: FeeSettings,
    isWarrant: boolean
): ScenarioRow {
    const result = calculateProfitLoss(
        position.buyPrice,
        scenario.sellPrice,
        position.quantity,
        feeSettings.buyFeePercent,
        feeSettings.sellFeePercent,
        feeSettings.sellTaxPercent
    );

    // Break-even for stocks (not warrants)
    let breakEvenPrice: number | undefined;
    if (!isWarrant) {
        const principal = position.buyPrice * position.quantity;
        const buyFee = (principal * feeSettings.buyFeePercent) / 100;
        const sellFee = (scenario.sellPrice * position.quantity * feeSettings.sellFeePercent) / 100;
        const sellTax = (scenario.sellPrice * position.quantity * feeSettings.sellTaxPercent) / 100;
        const totalCosts = buyFee + sellFee + sellTax;
        breakEvenPrice = position.quantity > 0 ? (principal + totalCosts) / position.quantity : 0;
    }

    return {
        id: scenario.id,
        sellPrice: scenario.sellPrice,
        grossRevenue: result.revenue.grossRevenue,
        sellFee: result.revenue.sellFee,
        sellTax: result.revenue.sellTax,
        netRevenue: result.revenue.netRevenue,
        profit: result.profit,
        profitPercent: result.profitPercent,
        isProfit: result.isProfit,
        breakEvenPrice,
    };
}

function calculateSummary(scenarios: ScenarioRow[]): ScenarioSummary | null {
    if (scenarios.length === 0) return null;

    const profits = scenarios.map((s) => s.profit);
    const percents = scenarios.map((s) => s.profitPercent);

    return {
        bestProfit: Math.max(...profits),
        bestProfitPercent: Math.max(...percents),
        worstProfit: Math.min(...profits),
        worstProfitPercent: Math.min(...percents),
        avgProfit: profits.reduce((a, b) => a + b, 0) / profits.length,
        avgProfitPercent: percents.reduce((a, b) => a + b, 0) / percents.length,
    };
}

// ============================================
// Hook
// ============================================

interface UseScenarioCalculationsParams {
    position: StockPosition | null;
    scenarios: StockScenario[];
    feeSettings: FeeSettings;
    isWarrant: boolean;
}

/**
 * Custom hook for What-if scenario calculations
 * Encapsulates all calculation logic for the analysis page
 */
export function useScenarioCalculations({
    position,
    scenarios,
    feeSettings,
    isWarrant,
}: UseScenarioCalculationsParams): ScenarioCalculationsResult {
    const scenarioResults = useMemo<ScenarioRow[]>(() => {
        if (!position) return [];
        return scenarios.map((scenario) =>
            calculateScenarioRow(scenario, position, feeSettings, isWarrant)
        );
    }, [position, scenarios, feeSettings, isWarrant]);

    const totalCost = useMemo(() => {
        if (!position) return 0;
        const principal = position.buyPrice * position.quantity;
        const buyFee = (principal * feeSettings.buyFeePercent) / 100;
        return principal + buyFee;
    }, [position, feeSettings]);

    const principal = useMemo(() => {
        if (!position) return 0;
        return position.buyPrice * position.quantity;
    }, [position]);

    const buyFee = useMemo(() => {
        if (!position) return 0;
        return (principal * feeSettings.buyFeePercent) / 100;
    }, [principal, feeSettings]);

    const summary = useMemo(() => {
        return calculateSummary(scenarioResults);
    }, [scenarioResults]);

    return {
        scenarioResults,
        totalCost,
        principal,
        buyFee,
        summary,
    };
}

// ============================================
// Warrant Break-Even Hook
// ============================================

interface UseWarrantBreakEvenParams {
    isWarrant: boolean;
    currentPrice: number;
    conversionRatio: number;
    exercisePrice: number;
}

export function useWarrantBreakEven({
    isWarrant,
    currentPrice,
    conversionRatio,
    exercisePrice,
}: UseWarrantBreakEvenParams) {
    return useMemo(() => {
        if (!isWarrant) return null;
        return calculateBreakEven(currentPrice, conversionRatio, exercisePrice);
    }, [isWarrant, currentPrice, conversionRatio, exercisePrice]);
}
