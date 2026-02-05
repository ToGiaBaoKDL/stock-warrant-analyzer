"use client";

import React from "react";

// ============================================
// Types
// ============================================

export interface DaysRemainingBadgeProps {
    /** Number of days remaining until maturity */
    days: number;
    /** Optional custom className */
    className?: string;
    /** Show label "ngày" suffix */
    showLabel?: boolean;
}

// ============================================
// Component
// ============================================

/**
 * DaysRemainingBadge - Reusable days-to-maturity indicator
 * Color logic: red ≤30, amber 31-60, green >60
 */
export const DaysRemainingBadge = React.memo(function DaysRemainingBadge({
    days,
    className = "",
    showLabel = true,
}: DaysRemainingBadgeProps) {
    const colorClass =
        days <= 30
            ? "bg-red-50 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"
            : days <= 60
                ? "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800"
                : "bg-green-50 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800";

    return (
        <span
            className={`px-2 py-0.5 rounded border text-xs font-medium inline-block ${colorClass} ${className}`}
        >
            {days} {showLabel && "ngày"}
        </span>
    );
});

/**
 * Get color class for days remaining
 * Useful when you need the classes but not the component
 */
export function getDaysRemainingColorClass(days: number): string {
    return days <= 30
        ? "bg-red-50 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"
        : days <= 60
            ? "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800"
            : "bg-green-50 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800";
}
