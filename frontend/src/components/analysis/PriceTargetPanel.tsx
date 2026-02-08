/**
 * PriceTargetPanel -  Support/Resistance Levels Display
 *
 * Shows Pivot Points, Fibonacci Retracement levels, nearest S/R, and
 * a qualitative price-position classification.
 *
 * Designed for the What-If / Analysis page to help set realistic
 * target prices and stop-loss levels.
 *
 * Layout: 2-column table -  Pivot Points (left) | Fibonacci (right)
 */

"use client";

import React, { useMemo } from "react";
import { Card, Tag, Tooltip, Progress, theme } from "antd";
import {
    AimOutlined,
    ArrowUpOutlined,
    ArrowDownOutlined,
    InfoCircleOutlined,
} from "@ant-design/icons";
import {
    calculatePriceTargets,
    type PriceTargetResult,
    PRICE_TARGET_COLORS,
} from "@/utils/indicators/price-targets";

const { useToken } = theme;

// ===================================================================
// TYPES
// ===================================================================

export interface PriceTargetPanelProps {
    /** Array of high prices (oldest → newest) */
    highs: number[];
    /** Array of low prices (oldest → newest) */
    lows: number[];
    /** Array of close prices (oldest → newest) */
    closes: number[];
    /** Current price for context display */
    currentPrice?: number;
    /** Fibonacci lookback window (default: 60) */
    lookback?: number;
}

// ===================================================================
// HELPERS
// ===================================================================

const POSITION_LABELS: Record<PriceTargetResult["pricePosition"], { label: string; color: string }> = {
    near_support: { label: "Gần hỗ trợ", color: "green" },
    near_resistance: { label: "Gần kháng cự", color: "red" },
    mid_range: { label: "Giữa biên", color: "blue" },
    above_all: { label: "Trên tất cả", color: "orange" },
    below_all: { label: "Dưới tất cả", color: "magenta" },
};

function formatPrice(v: number): string {
    // Prices are in kVND (e.g. 25.5 = 25,500 VND)
    return v.toLocaleString("vi-VN", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

// ===================================================================
// SUB-COMPONENTS
// ===================================================================

function LevelRow({
    label,
    price,
    color,
    currentPrice,
    isHighlighted,
}: {
    label: string;
    price: number;
    color: string;
    currentPrice: number;
    isHighlighted?: boolean;
}) {
    const { token } = useToken();
    const diff = ((price - currentPrice) / currentPrice) * 100;
    const isAbove = price > currentPrice;

    // Use explicit bright colors for % diff that work in both light and dark mode
    const diffColor = isAbove ? "#F97316" : "#10B981"; // orange-500 / emerald-500

    return (
        <div
            className="flex items-center justify-between py-1.5 px-2 rounded transition-colors"
            style={{
                backgroundColor: isHighlighted
                    ? `${color}20`
                    : undefined,
                borderLeft: isHighlighted ? `3px solid ${color}` : "3px solid transparent",
            }}
        >
            <div className="flex items-center gap-2 min-w-0">
                <span
                    className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                    style={{ backgroundColor: color }}
                />
                <span
                    className="text-xs font-semibold"
                    style={{ color, minWidth: 36 }}
                >
                    {label}
                </span>
            </div>
            <div className="flex items-center gap-3">
                <span
                    className="text-sm font-mono font-semibold"
                    style={{ color: token.colorText }}
                >
                    {formatPrice(price)}
                </span>
                <span
                    className="text-xs font-medium"
                    style={{ color: diffColor, minWidth: 60, textAlign: "right" }}
                >
                    {isAbove ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                    {" "}{Math.abs(diff).toFixed(1)}%
                </span>
            </div>
        </div>
    );
}

// ===================================================================
// MAIN COMPONENT
// ===================================================================

export function PriceTargetPanel({
    highs,
    lows,
    closes,
    currentPrice: currentPriceOverride,
    lookback = 60,
}: PriceTargetPanelProps) {
    const { token } = useToken();

    const targets = useMemo<PriceTargetResult | null>(() => {
        if (!highs?.length || !lows?.length || !closes?.length || closes.length < 10) {
            return null;
        }
        try {
            return calculatePriceTargets(highs, lows, closes, lookback);
        } catch {
            return null;
        }
    }, [highs, lows, closes, lookback]);

    if (!targets) return null;

    const price = currentPriceOverride ?? closes[closes.length - 1];
    const position = POSITION_LABELS[targets.pricePosition];

    // Progress bar: where price sits between nearest support and resistance
    const range = targets.nearestResistance - targets.nearestSupport;
    const progressPct = range > 0
        ? Math.max(0, Math.min(100, ((price - targets.nearestSupport) / range) * 100))
        : 50;

    return (
        <Card
            title={
                <span className="flex items-center gap-2">
                    <AimOutlined />
                    Mục tiêu giá (S/R)
                    <Tag color={position.color}>{position.label}</Tag>
                </span>
            }
            extra={
                <Tooltip
                    title="Pivot Points tính từ H/L/C phiên gần nhất. Fibonacci Retracement tính từ swing High/Low trong 60 phiên."
                    styles={{ root: { maxWidth: 360 } }}
                >
                    <InfoCircleOutlined style={{ color: token.colorTextSecondary, cursor: "pointer" }} />
                </Tooltip>
            }
            size="small"
            className="mt-4"
        >
            {/* Price Position Bar */}
            <div className="mb-4">
                <div
                    className="flex justify-between text-xs mb-1"
                    style={{ color: token.colorTextSecondary }}
                >
                    <span>Hỗ trợ: {formatPrice(targets.nearestSupport)}</span>
                    <span style={{ color: token.colorText, fontWeight: 600 }}>
                        Giá: {formatPrice(price)}
                    </span>
                    <span>Kháng cự: {formatPrice(targets.nearestResistance)}</span>
                </div>
                <Progress
                    percent={progressPct}
                    showInfo={false}
                    strokeColor={{
                        "0%": "#10B981",
                        "50%": "#F59E0B",
                        "100%": "#F97316",
                    }}
                    size="small"
                />
            </div>

            {/* 2-Column Layout: Pivot Points | Fibonacci */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* LEFT: Pivot Points */}
                <div>
                    <h4
                        className="text-xs font-semibold mb-2 uppercase tracking-wide"
                        style={{ color: token.colorTextSecondary }}
                    >
                        Pivot Points
                    </h4>
                    <div
                        className="rounded-lg overflow-hidden"
                        style={{
                            border: `1px solid ${token.colorBorderSecondary}`,
                        }}
                    >
                        <div className="space-y-0">
                            <LevelRow label="R3" price={targets.pivots.r3} color={PRICE_TARGET_COLORS.r3} currentPrice={price} />
                            <LevelRow label="R2" price={targets.pivots.r2} color={PRICE_TARGET_COLORS.r2} currentPrice={price} />
                            <LevelRow label="R1" price={targets.pivots.r1} color={PRICE_TARGET_COLORS.r1} currentPrice={price}
                                isHighlighted={targets.nearestResistance === targets.pivots.r1} />
                            <LevelRow label="PP" price={targets.pivots.pivot} color={PRICE_TARGET_COLORS.pivot} currentPrice={price} />
                            <LevelRow label="S1" price={targets.pivots.s1} color={PRICE_TARGET_COLORS.s1} currentPrice={price}
                                isHighlighted={targets.nearestSupport === targets.pivots.s1} />
                            <LevelRow label="S2" price={targets.pivots.s2} color={PRICE_TARGET_COLORS.s2} currentPrice={price} />
                            <LevelRow label="S3" price={targets.pivots.s3} color={PRICE_TARGET_COLORS.s3} currentPrice={price} />
                        </div>
                    </div>
                </div>

                {/* RIGHT: Fibonacci Retracement */}
                <div>
                    <h4
                        className="text-xs font-semibold mb-2 uppercase tracking-wide flex items-center gap-2"
                        style={{ color: token.colorTextSecondary }}
                    >
                        Fibonacci Retracement
                        <Tag
                            className="!text-[10px] !leading-tight !px-1.5 !py-0"
                            color={targets.fibonacci.trend === "up" ? "green" : "red"}
                        >
                            {targets.fibonacci.trend === "up" ? "▲ Up" : "▼ Down"}
                        </Tag>
                    </h4>
                    <div
                        className="rounded-lg overflow-hidden"
                        style={{
                            border: `1px solid ${token.colorBorderSecondary}`,
                        }}
                    >
                        <div className="space-y-0">
                            {targets.fibonacci.levels.map((level) => {
                                const fibColorKey = `fib${level.label.replace("%", "").replace(".", "")}` as keyof typeof PRICE_TARGET_COLORS;
                                return (
                                    <LevelRow
                                        key={level.label}
                                        label={level.label}
                                        price={level.price}
                                        color={PRICE_TARGET_COLORS[fibColorKey] ?? "#A78BFA"}
                                        currentPrice={price}
                                        isHighlighted={
                                            Math.abs(level.price - targets.nearestSupport) < 0.01 ||
                                            Math.abs(level.price - targets.nearestResistance) < 0.01
                                        }
                                    />
                                );
                            })}
                        </div>
                    </div>
                    <div
                        className="text-xs mt-2 flex gap-4"
                        style={{ color: token.colorTextSecondary }}
                    >
                        <span>Swing High: {formatPrice(targets.fibonacci.high)}</span>
                        <span>Swing Low: {formatPrice(targets.fibonacci.low)}</span>
                    </div>
                </div>
            </div>
        </Card>
    );
}
