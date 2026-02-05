"use client";

import React, { useMemo } from "react";
import { Card, Badge, Tooltip, Progress, Tag, Space, Typography } from "antd";
import { 
    ArrowUpOutlined, 
    ArrowDownOutlined, 
    MinusOutlined,
    BulbOutlined,
    BarChartOutlined,
} from "@ant-design/icons";
import {
    generateTradingSignal,
    SIGNAL_COLORS,
    type TradingSignal,
    type IndicatorSignal,
    type SignalStrength,
} from "@/utils/indicators";

const { Text, Title } = Typography;

interface TradingSignalPanelProps {
    closes: number[];
    highs: number[];
    lows: number[];
    volumes: number[];
    symbol: string;
}

/**
 * Get signal icon based on signal type
 */
function getSignalIcon(signal: "bullish" | "bearish" | "neutral") {
    switch (signal) {
        case "bullish":
            return <ArrowUpOutlined className="text-green-500" />;
        case "bearish":
            return <ArrowDownOutlined className="text-red-500" />;
        default:
            return <MinusOutlined className="text-gray-500" />;
    }
}

/**
 * Get overall signal badge
 */
function getSignalBadge(overall: SignalStrength) {
    const config: Record<SignalStrength, { color: string; text: string }> = {
        STRONG_BUY: { color: "green", text: "MUA MẠNH" },
        BUY: { color: "lime", text: "MUA" },
        NEUTRAL: { color: "default", text: "TRUNG LẬP" },
        SELL: { color: "orange", text: "BÁN" },
        STRONG_SELL: { color: "red", text: "BÁN MẠNH" },
    };
    return config[overall];
}

/**
 * Individual indicator row
 */
function IndicatorRow({ signal }: { signal: IndicatorSignal }) {
    const progressColor = signal.strength > 0 ? "#52c41a" : signal.strength < 0 ? "#f5222d" : "#d9d9d9";
    const normalizedStrength = (signal.strength + 100) / 2; // Convert -100~100 to 0~100

    return (
        <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
            <div className="flex items-center gap-2 flex-1">
                {getSignalIcon(signal.signal)}
                <Text className="font-medium text-sm">{signal.indicator}</Text>
            </div>
            <div className="flex-1 px-4">
                <Progress
                    percent={normalizedStrength}
                    size="small"
                    showInfo={false}
                    strokeColor={progressColor}
                    railColor="#e8e8e8"
                />
            </div>
            <div className="flex-1 text-right">
                <Tooltip title={signal.reason}>
                    <Tag 
                        color={signal.signal === "bullish" ? "green" : signal.signal === "bearish" ? "red" : "default"}
                        className="cursor-help"
                    >
                        {signal.strength > 0 ? "+" : ""}{signal.strength.toFixed(0)}
                    </Tag>
                </Tooltip>
            </div>
        </div>
    );
}

/**
 * Trading Signal Panel Component
 * 
 * Displays combined trading signals from multiple indicators
 */
export function TradingSignalPanel({
    closes,
    highs,
    lows,
    volumes,
    symbol,
}: TradingSignalPanelProps) {
    // Calculate trading signal
    const tradingSignal = useMemo<TradingSignal | null>(() => {
        if (!closes || closes.length < 50) {
            return null;
        }
        return generateTradingSignal(closes, highs, lows, volumes);
    }, [closes, highs, lows, volumes]);

    if (!tradingSignal) {
        return (
            <Card size="small" className="h-full">
                <div className="flex items-center justify-center h-32 text-gray-400">
                    <BulbOutlined className="text-2xl mr-2" />
                    <Text type="secondary">Không đủ dữ liệu để phân tích</Text>
                </div>
            </Card>
        );
    }

    const badgeConfig = getSignalBadge(tradingSignal.overall);
    const scoreColor = tradingSignal.score > 0 ? "text-green-500" : tradingSignal.score < 0 ? "text-red-500" : "text-gray-500";

    return (
        <Card 
            size="small"
            title={
                <div className="flex items-center gap-2">
                    <BarChartOutlined />
                    <span>Tín Hiệu Giao Dịch - {symbol}</span>
                </div>
            }
            extra={
                <Badge 
                    color={SIGNAL_COLORS[tradingSignal.overall]}
                    text={
                        <Text strong className={scoreColor}>
                            {tradingSignal.score > 0 ? "+" : ""}{tradingSignal.score}
                        </Text>
                    }
                />
            }
            className="h-full"
        >
            {/* Overall Signal */}
            <div className="text-center mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <Tag color={badgeConfig.color} className="text-lg px-4 py-1 mb-2">
                    {badgeConfig.text}
                </Tag>
                <Text className="block text-sm text-gray-600 dark:text-gray-400 mt-2">
                    {tradingSignal.summary}
                </Text>
            </div>

            {/* Score Gauge */}
            <div className="mb-4">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Bán mạnh</span>
                    <span>Trung lập</span>
                    <span>Mua mạnh</span>
                </div>
                <Progress
                    percent={(tradingSignal.score + 100) / 2}
                    size="small"
                    showInfo={false}
                    strokeColor={{
                        "0%": "#f5222d",
                        "50%": "#faad14",
                        "100%": "#52c41a",
                    }}
                />
            </div>

            {/* Individual Indicators */}
            <div className="mt-4">
                <Text strong className="text-sm mb-2 block text-gray-600 dark:text-gray-400">
                    Chi tiết các chỉ báo:
                </Text>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-2">
                    {tradingSignal.signals.map((signal, index) => (
                        <IndicatorRow key={index} signal={signal} />
                    ))}
                </div>
            </div>

            {/* Timestamp */}
            <Text type="secondary" className="text-xs mt-3 block text-right">
                Cập nhật: {tradingSignal.timestamp.toLocaleTimeString("vi-VN")}
            </Text>
        </Card>
    );
}

export default TradingSignalPanel;
