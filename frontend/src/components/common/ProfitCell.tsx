"use client";

import React from "react";
import { formatVND } from "@/utils";

// ============================================
// Types
// ============================================

export interface ProfitCellProps {
    /** Profit value in VND */
    value: number;
    /** Whether this is profitable (positive) or loss (negative) */
    isProfit: boolean;
    /** Optional custom className */
    className?: string;
}

// ============================================
// Component
// ============================================

/**
 * ProfitCell - Reusable profit/loss cell for tables
 * Displays formatted VND amount with consistent styling
 */
export const ProfitCell = React.memo(function ProfitCell({
    value,
    isProfit,
    className = "",
}: ProfitCellProps) {
    const bgClass = isProfit
        ? "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700"
        : "bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-700";

    return (
        <div
            className={`px-2 py-1 rounded font-bold text-right inline-block min-w-[90px] border ${bgClass} ${className}`}
        >
            {value >= 0 ? "+" : ""}
            {formatVND(value)}
        </div>
    );
});
