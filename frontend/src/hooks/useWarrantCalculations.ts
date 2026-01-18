"use client";

import { useMemo } from "react";
import type { WarrantItem } from "@/types/api";
import type { FeeSettings } from "@/stores/useWarrantStore";
import { calculateBreakEven } from "@/utils/calculations";

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
    netRevenue: number;
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
 * Calculate time value decay factor based on days to maturity
 */
function getTimeValueFactor(daysToMaturity: number): number {
    if (daysToMaturity > 30) return 1.0;
    if (daysToMaturity > 14) return 0.8;
    return 0.5;
}

/**
 * Calculate warrant metrics for a single warrant
 */
function calculateWarrantMetrics(
    warrant: WarrantItem,
    underlyingPrice: number,
    targetPrice: number,
    quantity: number,
    feeSettings: FeeSettings
): WarrantTableRow {
    // Break-even calculation
    const breakEvenResult = calculateBreakEven(
        warrant.current_price,
        warrant.conversion_ratio,
        warrant.exercise_price,
        targetPrice
    );

    // Intrinsic values
    const currentIntrinsicValue = Math.max(
        0,
        (underlyingPrice - warrant.exercise_price) / warrant.conversion_ratio
    );
    const targetIntrinsicValue = Math.max(
        0,
        (targetPrice - warrant.exercise_price) / warrant.conversion_ratio
    );

    // Time value
    const currentTimeValue = Math.max(0, warrant.current_price - currentIntrinsicValue);
    const timeValueFactor = getTimeValueFactor(warrant.days_to_maturity);
    const estimatedSellPrice = Math.max(0, targetIntrinsicValue + currentTimeValue * timeValueFactor);

    // Cost calculation
    const principal = warrant.current_price * quantity;
    const buyFee = (principal * feeSettings.buyFeePercent) / 100;
    const totalCost = principal + buyFee;

    // Revenue calculation
    const grossRevenue = estimatedSellPrice * quantity;
    const sellFee = (grossRevenue * feeSettings.sellFeePercent) / 100;
    const sellTax = (grossRevenue * feeSettings.sellTaxPercent) / 100;
    const netRevenue = grossRevenue - sellFee - sellTax;

    // Profit calculation
    const estimatedProfit = netRevenue - totalCost;
    const estimatedProfitPercent = totalCost > 0 ? (estimatedProfit / totalCost) * 100 : 0;

    // Leverage calculation
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
        netRevenue,
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
