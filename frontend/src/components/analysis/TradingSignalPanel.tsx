"use client";

import React, { useMemo } from "react";
import { Card, Badge, Tooltip, Tag, Typography } from "antd";
import { 
    ArrowUpOutlined, 
    ArrowDownOutlined, 
    MinusOutlined,
    BulbOutlined,
    BarChartOutlined,
} from "@ant-design/icons";
import {
    generateFunnelSignal,
    SIGNAL_COLORS,
    type FunnelSignal,
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
    floor?: number;
    ceiling?: number;
}

/**
 * Get signal icon based on signal type
 */
function getSignalIcon(signal: "bullish" | "bearish" | "neutral") {
    switch (signal) {
        case "bullish":
            return <ArrowUpOutlined style={{ color: "var(--color-up)" }} />;
        case "bearish":
            return <ArrowDownOutlined style={{ color: "var(--color-down)" }} />;
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
    return (
        <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
            <div className="flex items-center gap-2 flex-1">
                {getSignalIcon(signal.signal)}
                <Text className="font-medium text-sm">{signal.indicator}</Text>
            </div>
            <div className="flex-1 text-right">
                <Tooltip title={signal.reason}>
                    <Tag 
                        color={signal.signal === "bullish" ? "green" : signal.signal === "bearish" ? "red" : "default"}
                        className="cursor-help"
                    >
                        {signal.value || signal.signal}
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
    floor,
    ceiling,
}: TradingSignalPanelProps) {
    // Calculate trading signal with floor/ceiling for VN market
    const tradingSignal = useMemo<FunnelSignal | null>(() => {
        if (!closes || closes.length < 50) {
            return null;
        }
        return generateFunnelSignal(closes, highs, lows, volumes, floor, ceiling);
    }, [closes, highs, lows, volumes, floor, ceiling]);

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
                        <Text strong>
                            {badgeConfig.text}
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

            {/* Individual Indicators */}
            <div className="mt-4">
                <Text strong className="text-sm mb-2 block text-gray-600 dark:text-gray-400">
                    Chi tiết các chỉ báo:
                </Text>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-2">
                    {tradingSignal.indicators.map((signal: IndicatorSignal, index: number) => (
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
