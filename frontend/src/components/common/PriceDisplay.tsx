"use client";

import React from "react";
import { getPriceColorHex } from "@/utils/priceColor";
import { formatVND } from "@/utils/formatters";

// ============================================
// Types
// ============================================

export interface PriceDisplayProps {
    /** The price value to display */
    value: number;
    /** The change value (positive/negative/zero) to determine color */
    change: number;
    /** Optional: use inline style instead of class (for table cells) */
    useInlineStyle?: boolean;
    /** Optional: additional CSS classes */
    className?: string;
    /** Optional: show as bold */
    bold?: boolean;
}

export interface PercentChangeProps {
    /** The percentage change value */
    value: number;
    /** Decimal places to show (default: 2) */
    decimals?: number;
    /** Optional: use inline style instead of class */
    useInlineStyle?: boolean;
    /** Optional: additional CSS classes */
    className?: string;
    /** Optional: show as bold */
    bold?: boolean;
    /** Optional: show the + sign for positive values (default: true) */
    showSign?: boolean;
}

// ============================================
// Components
// ============================================

/**
 * Displays a price value with color based on change direction
 */
export const PriceDisplay = React.memo(function PriceDisplay({
    value,
    change,
    useInlineStyle = false,
    className = "",
    bold = false,
}: PriceDisplayProps) {
    const colorStyle = { color: getPriceColorHex(change) };
    // const colorStyle = useInlineStyle ? { color: getPriceColorHex(change) } : undefined;

    return (
        <span
            className={`${bold ? "font-semibold" : ""} ${className}`}
            style={colorStyle}
        >
            {formatVND(value)}
        </span>
    );
});

/**
 * Displays a percentage change value with color and optional sign
 */
export const PercentChange = React.memo(function PercentChange({
    value,
    decimals = 2,
    useInlineStyle = false,
    className = "",
    bold = false,
    showSign = true,
}: PercentChangeProps) {
    const colorStyle = { color: getPriceColorHex(value) };

    const formattedValue = value.toFixed(decimals);
    const displayValue = showSign && value > 0 ? `+${formattedValue}%` : `${formattedValue}%`;

    return (
        <span
            className={`${bold ? "font-semibold" : ""} ${className}`}
            style={colorStyle}
        >
            {displayValue}
        </span>
    );
});

/**
 * Displays profit/loss value with appropriate styling
 */
export interface ProfitDisplayProps {
    value: number;
    showCurrency?: boolean;
    className?: string;
}

export const ProfitDisplay = React.memo(function ProfitDisplay({
    value,
    showCurrency = true,
    className = "",
}: ProfitDisplayProps) {
    const isProfit = value > 0;

    return (
        <span
            className={`font-medium ${className}`}
            style={{ color: isProfit ? "var(--color-up)" : value < 0 ? "var(--color-down)" : "var(--color-ref)" }}
        >
            {value > 0 ? "+" : ""}
            {showCurrency ? formatVND(value) : value.toLocaleString("vi-VN")}
        </span>
    );
});
