"use client";

import React, { useMemo } from "react";
import { Tag, Tooltip, Typography, Spin } from "antd";
import {
    ArrowUpOutlined,
    ArrowDownOutlined,
    MinusOutlined,
    DashboardOutlined,
    LoadingOutlined,
    RiseOutlined,
    FallOutlined,
    ThunderboltOutlined,
    SwapOutlined,
    PauseCircleOutlined,
    StopOutlined,
} from "@ant-design/icons";
import {
    generateFunnelSignal,
    SIGNAL_COLORS,
    type FunnelSignal,
    type SignalStrength,
    type MarketRegime,
    type StrategyType,
} from "@/utils/indicators";

const { Text } = Typography;

interface SignalSummaryRowProps {
    closes: number[];
    highs: number[];
    lows: number[];
    volumes: number[];
    floor?: number;
    ceiling?: number;
    isLoading?: boolean;
}

// Unified badge configs – mirrors SignalTable.tsx exactly
const SIGNAL_BADGE_CONFIG: Record<SignalStrength, { color: string; text: string; icon: React.ReactNode }> = {
    STRONG_BUY: { color: "green", text: "MUA MẠNH", icon: <RiseOutlined /> },
    BUY: { color: "lime", text: "MUA", icon: <ArrowUpOutlined /> },
    NEUTRAL: { color: "default", text: "TRUNG LẬP", icon: <MinusOutlined /> },
    SELL: { color: "orange", text: "BÁN", icon: <ArrowDownOutlined /> },
    STRONG_SELL: { color: "red", text: "BÁN MẠNH", icon: <FallOutlined /> },
};

const REGIME_BADGE_CONFIG: Record<MarketRegime, { color: string; shortText: string; icon: React.ReactNode }> = {
    UPTREND_STRONG: { color: "green", shortText: "Up Mạnh", icon: <RiseOutlined /> },
    UPTREND_WEAK: { color: "lime", shortText: "Up Yếu", icon: <ArrowUpOutlined /> },
    DOWNTREND: { color: "red", shortText: "Down", icon: <FallOutlined /> },
    SIDEWAY: { color: "default", shortText: "Sideway", icon: <SwapOutlined /> },
    FLOOR_PRICE: { color: "cyan", shortText: "Sàn", icon: <StopOutlined /> },
};

const STRATEGY_BADGE_CONFIG: Record<StrategyType, { color: string; text: string; icon: React.ReactNode }> = {
    TREND_FOLLOWING: { color: "blue", text: "Trend", icon: <ThunderboltOutlined /> },
    MEAN_REVERSION: { color: "purple", text: "Mean Rev", icon: <SwapOutlined /> },
    NO_SETUP: { color: "default", text: "Chờ", icon: <PauseCircleOutlined /> },
};

function signalIcon(s: "bullish" | "bearish" | "neutral") {
    if (s === "bullish") return <ArrowUpOutlined style={{ color: "var(--color-up)", fontSize: 10 }} />;
    if (s === "bearish") return <ArrowDownOutlined style={{ color: "var(--color-down)", fontSize: 10 }} />;
    return <MinusOutlined style={{ color: "var(--text-secondary)", fontSize: 10 }} />;
}

function indicatorColor(s: "bullish" | "bearish" | "neutral") {
    if (s === "bullish") return "green";
    if (s === "bearish") return "red";
    return "default";
}

/**
 * Compact single-row signal summary for the what-if analysis page.
 * Shows: Overall signal badge + Layer info + Individual indicator tags.
 * Colors are unified with the Signals page table.
 */
export function SignalSummaryRow({
    closes,
    highs,
    lows,
    volumes,
    floor,
    ceiling,
    isLoading,
}: SignalSummaryRowProps) {
    const signal = useMemo<FunnelSignal | null>(() => {
        if (!closes || closes.length < 50) return null;
        return generateFunnelSignal(closes, highs, lows, volumes, floor, ceiling);
    }, [closes, highs, lows, volumes, floor, ceiling]);

    if (isLoading) {
        return (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-700">
                <DashboardOutlined className="text-gray-400" />
                <Text type="secondary" className="text-sm">Tín hiệu giao dịch</Text>
                <Spin indicator={<LoadingOutlined spin />} size="small" />
            </div>
        );
    }

    if (!signal) {
        return (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-700">
                <DashboardOutlined className="text-gray-400" />
                <Text type="secondary" className="text-sm">Không đủ dữ liệu để phân tích tín hiệu</Text>
            </div>
        );
    }

    const overallBadge = SIGNAL_BADGE_CONFIG[signal.overall];
    const regimeBadge = REGIME_BADGE_CONFIG[signal.layer1.regime];
    const strategyBadge = STRATEGY_BADGE_CONFIG[signal.layer2.strategy];

    return (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 flex-wrap">
            {/* Icon */}
            <DashboardOutlined style={{ color: SIGNAL_COLORS[signal.overall] }} />

            {/* Overall Signal – use unified badge config */}
            <Tooltip title={signal.summary} styles={{ root: { whiteSpace: "pre-line" } }}>
                <Tag
                    color={overallBadge.color}
                    icon={overallBadge.icon}
                    className="m-0 font-semibold cursor-help"
                >
                    {overallBadge.text}
                </Tag>
            </Tooltip>

            {/* Divider */}
            <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 hidden sm:block" />

            {/* Layer 1: Regime – unified colors */}
            <Tooltip title={signal.layer1.reason}>
                <Tag color={regimeBadge.color} className="m-0 text-xs cursor-help">
                    {regimeBadge.shortText}
                </Tag>
            </Tooltip>

            {/* Layer 2: Strategy – unified colors */}
            {signal.layer2.strategy !== "NO_SETUP" && (
                <Tooltip title={signal.layer2.reason}>
                    <Tag color={strategyBadge.color} icon={strategyBadge.icon} className="m-0 text-xs cursor-help">
                        {strategyBadge.text}
                        {" · "}
                        {signal.layer2.confidence}
                    </Tag>
                </Tooltip>
            )}

            {/* Divider */}
            <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 hidden sm:block" />

            {/* Individual indicators */}
            {signal.indicators.map((ind) => (
                <Tooltip key={ind.indicator} title={ind.reason}>
                    <Tag
                        color={indicatorColor(ind.signal)}
                        className="m-0 text-xs cursor-help"
                        icon={signalIcon(ind.signal)}
                    >
                        {ind.indicator} {ind.value}
                    </Tag>
                </Tooltip>
            ))}
        </div>
    );
}

export default SignalSummaryRow;
