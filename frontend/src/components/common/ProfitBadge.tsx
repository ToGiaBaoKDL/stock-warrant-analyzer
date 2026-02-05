"use client";

import React from "react";
import { Tag } from "antd";
import { formatPercent } from "@/utils";

// ============================================
// Types
// ============================================

export interface ProfitBadgeProps {
    /** Profit percentage value */
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
 * ProfitBadge - Reusable profit/loss indicator badge
 * Displays formatted percentage with consistent colors for light/dark theme
 */
export const ProfitBadge = React.memo(function ProfitBadge({
    value,
    isProfit,
    className = "",
}: ProfitBadgeProps) {
    const colorClass = isProfit
        ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700"
        : "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-700";

    return (
        <Tag className={`font-semibold m-0 border ${colorClass} ${className}`}>
            {formatPercent(value)}
        </Tag>
    );
});
