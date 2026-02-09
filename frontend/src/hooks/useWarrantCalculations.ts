"use client";

import { useMemo } from "react";
import type { WarrantItem } from "@/types/api";
import type { FeeSettings } from "@/stores/useWarrantStore";
import { calculateBreakEven, calculateCost } from "@/utils/calculations";

// ============================================
// Types
// ============================================

export interface WarrantTableRow extends WarrantItem {
    breakEven: number;
    isProfitable: boolean;
    profitMargin: number;
    profitMarginPercent: number;
    estimatedProfit: number;
    estimatedProfitPercent: number;
    totalCost: number;
    exerciseRevenue: number;
    leverage: number;
}

export interface WarrantCalculationsResult {
    tableData: WarrantTableRow[];
    bestBreakEvenWarrant: WarrantTableRow | null;
    isCalculating: boolean;
}

export type ProfitFilter = "all" | "profitable" | "unprofitable";
export type SortOption = "symbol" | "breakEven" | "margin" | "expiry" | "volume";

// ============================================
// Calculation Functions (Pure)
// ============================================

/**
 * Calculate warrant metrics using exercise-based (cash settlement) model
 *
 * Vietnam CW cash settlement formula:
 *   Settlement/CW = max(0, (TargetPrice − ExercisePrice) / ConversionRatio)
 *   Profit = Settlement/CW × Quantity − TotalBuyCost
 *
 * Equivalent to: (TargetPrice − BreakEven) × Quantity / Ratio
 *   where BreakEven = CW_Price × Ratio + ExercisePrice
 */
function calculateWarrantMetrics(
    warrant: WarrantItem,
    underlyingPrice: number,
    targetPrice: number,
    quantity: number,
    feeSettings: FeeSettings
): WarrantTableRow {
    // Break-even = CW_Price × Ratio + ExercisePrice
    const breakEvenResult = calculateBreakEven(
        warrant.current_price,
        warrant.conversion_ratio,
        warrant.exercise_price,
        targetPrice
    );

    // Exercise-based profit (Vietnam CW cash settlement)
    // If target ≤ exercise price → CW expires worthless, exercise value = 0
    const exerciseValuePerCW = Math.max(
        0,
        (targetPrice - warrant.exercise_price) / warrant.conversion_ratio
    );
    const exerciseRevenue = exerciseValuePerCW * quantity;

    // Total buy cost = CW_Price × Quantity + buy fees
    const cost = calculateCost(warrant.current_price, quantity, feeSettings.buyFeePercent);
    const totalCost = cost.totalCost;

    // Profit = Exercise revenue − Total buy cost
    const estimatedProfit = exerciseRevenue - totalCost;
    const estimatedProfitPercent = totalCost > 0 ? (estimatedProfit / totalCost) * 100 : 0;

    // Leverage = UnderlyingPrice / (CW_Price × Ratio)
    const leverage =
        warrant.current_price > 0 && warrant.conversion_ratio > 0
            ? underlyingPrice / (warrant.current_price * warrant.conversion_ratio)
            : 0;

    return {
        ...warrant,
        breakEven: breakEvenResult.breakEvenPrice,
        isProfitable: breakEvenResult.isProfitable,
        profitMargin: breakEvenResult.profitMargin,
        profitMarginPercent: breakEvenResult.profitMarginPercent,
        estimatedProfit,
        estimatedProfitPercent,
        totalCost,
        exerciseRevenue,
        leverage,
    };
}

/**
 * Filter warrants by profitability
 */
function filterWarrantsByProfitability(
    data: WarrantTableRow[],
    filter: ProfitFilter
): WarrantTableRow[] {
    switch (filter) {
        case "profitable":
            return data.filter((w) => w.estimatedProfit > 0);
        case "unprofitable":
            return data.filter((w) => w.estimatedProfit <= 0);
        default:
            return data;
    }
}

/**
 * Sort warrants by specified field
 */
function sortWarrants(data: WarrantTableRow[], sortBy: SortOption): WarrantTableRow[] {
    const sorted = [...data];

    switch (sortBy) {
        case "breakEven":
            sorted.sort((a, b) => a.breakEven - b.breakEven);
            break;
        case "margin":
            sorted.sort((a, b) => b.profitMarginPercent - a.profitMarginPercent);
            break;
        case "expiry":
            sorted.sort((a, b) => {
                if (a.days_to_maturity < 0 && b.days_to_maturity >= 0) return 1;
                if (b.days_to_maturity < 0 && a.days_to_maturity >= 0) return -1;
                return a.days_to_maturity - b.days_to_maturity;
            });
            break;
        case "volume":
            sorted.sort((a, b) => b.volume - a.volume);
            break;
        case "symbol":
        default:
            sorted.sort((a, b) => a.symbol.localeCompare(b.symbol));
            break;
    }

    return sorted;
}

// ============================================
// Hook
// ============================================

interface UseWarrantCalculationsParams {
    warrants: WarrantItem[] | undefined;
    underlyingPrice: number;
    targetUnderlyingPrice: number | null;
    feeSettings: FeeSettings;
    quantity: number;
    filterProfitable: ProfitFilter;
    sortBy: SortOption;
}

/**
 * Custom hook for warrant screener calculations
 * Encapsulates all calculation logic for the warrants page
 */
export function useWarrantCalculations({
    warrants,
    underlyingPrice,
    targetUnderlyingPrice,
    feeSettings,
    quantity,
    filterProfitable,
    sortBy,
}: UseWarrantCalculationsParams): WarrantCalculationsResult {
    const tableData = useMemo(() => {
        if (!warrants || warrants.length === 0) return [];

        const targetPrice = targetUnderlyingPrice ?? underlyingPrice;

        // Calculate metrics for all warrants
        let data = warrants.map((warrant) =>
            calculateWarrantMetrics(warrant, underlyingPrice, targetPrice, quantity, feeSettings)
        );

        // Apply filter
        data = filterWarrantsByProfitability(data, filterProfitable);

        // Apply sort
        data = sortWarrants(data, sortBy);

        return data;
    }, [warrants, underlyingPrice, targetUnderlyingPrice, feeSettings, quantity, filterProfitable, sortBy]);

    const bestBreakEvenWarrant = useMemo(() => {
        if (tableData.length === 0) return null;
        return tableData.reduce((best, current) =>
            current.breakEven < best.breakEven ? current : best
        );
    }, [tableData]);

    return {
        tableData,
        bestBreakEvenWarrant,
        isCalculating: false,
    };
}
