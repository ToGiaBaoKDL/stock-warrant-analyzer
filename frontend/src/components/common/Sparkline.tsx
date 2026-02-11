"use client";

import React, { useMemo } from "react";
import { AppColors } from "@/utils/theme";

export interface SparklineProps {
    /** Close prices array */
    data: number[];
    /** Width of the SVG */
    width?: number;
    /** Height of the SVG */
    height?: number;
    /** Optional override color (uses trend color if not provided) */
    color?: string;
    /** Optional class name */
    className?: string;
}

/**
 * Sparkline - A lightweight SVG mini chart for tables
 * 
 * Renders a simple line graph showing price trend.
 * Default color is green if uptrend (last > first), red if downtrend.
 * Can be overridden with `color` prop to match stock/CW price change color.
 */
export const Sparkline = React.memo(function Sparkline({
    data,
    width = 100,
    height = 32,
    color: colorOverride,
    className = "",
}: SparklineProps) {
    // Generate SVG path from data
    const { path, color } = useMemo(() => {
        if (!data || data.length < 2) {
            return { path: "", color: AppColors.textSecondary };
        }

        const min = Math.min(...data);
        const max = Math.max(...data);
        const range = max - min || 1; // Avoid division by zero

        // Normalize values to SVG coordinates
        const points = data.map((value, index) => {
            const x = (index / (data.length - 1)) * width;
            const y = height - ((value - min) / range) * (height - 4) - 2; // 2px padding
            return `${x},${y}`;
        });

        // Use override color or determine from trend
        let trendColor = colorOverride;
        if (!trendColor) {
            const isUptrend = data[data.length - 1] > data[0];
            const isFlat = data[data.length - 1] === data[0];
            trendColor = isFlat ? "var(--color-ref)" : (isUptrend ? "var(--color-up)" : "var(--color-down)");
        }

        return {
            path: `M ${points.join(" L ")}`,
            color: trendColor,
        };
    }, [data, width, height, colorOverride]);

    if (!data || data.length < 2) {
        return (
            <div
                className={`flex items-center justify-center text-gray-400 text-xs ${className}`}
                style={{ width, height }}
            >
                -
            </div>
        );
    }

    return (
        <svg
            width={width}
            height={height}
            className={className}
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
        >
            <path
                d={path}
                fill="none"
                stroke={color}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
});

export default Sparkline;
