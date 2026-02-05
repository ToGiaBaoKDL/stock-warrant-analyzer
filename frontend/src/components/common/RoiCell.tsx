"use client";

import React from "react";
import { ProfitBadge } from "./ProfitBadge";

// ============================================
// Types
// ============================================

export interface RoiCellProps {
    /** ROI percentage value */
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
 * RoiCell - Reusable ROI indicator with progress bar
 * Shows percentage and visual bar representation
 */
export const RoiCell = React.memo(function RoiCell({
    value,
    isProfit,
    className = "",
}: RoiCellProps) {
    const absValue = Math.abs(value);
    const barWidth = Math.min(absValue, 100);
    const barClass = isProfit ? "bg-emerald-500" : "bg-rose-500";

    return (
        <div className={`space-y-1 ${className}`}>
            <div className="flex items-center justify-end gap-2">
                <ProfitBadge value={value} isProfit={isProfit} />
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                <div
                    className={`h-1.5 rounded-full transition-all ${barClass}`}
                    style={{ width: `${barWidth}%` }}
                />
            </div>
        </div>
    );
});
