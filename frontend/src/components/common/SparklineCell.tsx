"use client";

import React from "react";
import { Spin } from "antd";
import { useStockHistory, type ChartResolution } from "@/hooks";
import { Sparkline } from "@/components/common/Sparkline";
import { getFullPriceColorHex, getPriceColorHex } from "@/utils";

export interface SparklineCellProps {
    /** Stock or warrant symbol */
    symbol: string;
    /** Current price (for 5-color mode with ceiling/floor) */
    currentPrice?: number;
    /** Reference price (for 5-color mode with ceiling/floor) */
    refPrice?: number;
    /** Ceiling price (for 5-color mode) */
    ceiling?: number;
    /** Floor price (for 5-color mode) */
    floor?: number;
    /** Price change percentage (fallback for 3-color mode) */
    priceChange?: number;
    /** Width of sparkline */
    width?: number;
    /** Height of sparkline */
    height?: number;
    /** Primary resolution (default: "1" = 1-minute) */
    resolution?: ChartResolution;
    /** Fallback resolution if primary has <2 points (default: "1D") */
    fallbackResolution?: ChartResolution;
}

/**
 * SparklineCell - Table cell component that fetches and renders a sparkline
 * 
 * Uses 1-minute resolution with 3-day window (backend smart default).
 * Falls back to 1D resolution if 1-minute has insufficient data (low-volume stocks).
 * 
 * Color modes:
 * - 5-color mode: Pass currentPrice, refPrice, ceiling, floor for ceiling (purple), up (green),
 *   ref (yellow), down (red), floor (cyan) colors
 * - 3-color mode: Pass priceChange for up (green), ref (yellow), down (red) colors
 */
export const SparklineCell = React.memo(function SparklineCell({
    symbol,
    currentPrice,
    refPrice,
    ceiling,
    floor,
    priceChange,
    width = 80,
    height = 28,
    resolution = "1",
    fallbackResolution = "1D",
}: SparklineCellProps) {
    // Fetch primary resolution data
    const primaryQuery = useStockHistory(symbol, { resolution });

    // Check if primary has insufficient data
    const primaryHasData = !primaryQuery.isLoading && primaryQuery.data?.c && primaryQuery.data.c.length >= 2;

    // Fetch fallback resolution only if primary has insufficient data
    const fallbackQuery = useStockHistory(symbol, {
        resolution: fallbackResolution,
        enabled: !primaryQuery.isLoading && !primaryHasData
    });

    // Use primary if it has data, otherwise use fallback
    const data = primaryHasData ? primaryQuery.data : fallbackQuery.data;
    const isLoading = primaryQuery.isLoading || (!primaryHasData && fallbackQuery.isLoading);
    const error = primaryHasData ? primaryQuery.error : fallbackQuery.error;

    // Determine color: prefer 5-color mode if full price info provided, else 3-color mode
    let color: string | undefined;
    if (currentPrice !== undefined && refPrice !== undefined) {
        // 5-color mode with ceiling/floor support
        color = getFullPriceColorHex(currentPrice, refPrice, ceiling, floor);
    } else if (priceChange !== undefined) {
        // 3-color mode fallback
        color = getPriceColorHex(priceChange);
    }

    if (isLoading) {
        return (
            <div style={{ width, height }} className="flex items-center justify-center">
                <Spin size="small" />
            </div>
        );
    }

    if (error || !data?.c || data.c.length < 2) {
        return (
            <div
                style={{ width, height }}
                className="flex items-center justify-center text-gray-400 text-xs"
            >
                -
            </div>
        );
    }

    return <Sparkline data={data.c} width={width} height={height} color={color} />;
});

export default SparklineCell;
