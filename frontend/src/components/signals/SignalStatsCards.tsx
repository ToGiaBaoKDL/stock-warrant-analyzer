/**
 * Signal Stats Cards Component
 * 
 * Displays statistics about trading signals with clickable filters
 */

import React, { memo } from "react";
import { Card, Typography } from "antd";
import { SIGNAL_COLORS, type SignalStrength } from "@/utils/indicators";
import type { SignalStats } from "@/hooks/useSignals";

const { Text } = Typography;

type FilterType = "ALL" | SignalStrength;

interface StatsCardProps {
    label: string;
    count: number;
    color: string;
    isActive: boolean;
    onClick: () => void;
}

/**
 * Single stat card - Memoized
 */
const StatsCard = memo(function StatsCard({ 
    label, 
    count, 
    color, 
    isActive, 
    onClick 
}: StatsCardProps) {
    return (
        <Card 
            size="small" 
            className="text-center cursor-pointer hover:shadow-md transition-shadow"
            onClick={onClick}
            style={{ borderColor: isActive ? color : undefined }}
        >
            <div className="text-2xl font-bold" style={{ color }}>{count}</div>
            <Text type="secondary" className="text-xs">{label}</Text>
        </Card>
    );
});

interface SignalStatsCardsProps {
    stats: SignalStats;
    filter: FilterType;
    onFilterChange: (filter: FilterType) => void;
}

/**
 * Signal Stats Cards Grid - Memoized
 */
export const SignalStatsCards = memo(function SignalStatsCards({ 
    stats, 
    filter, 
    onFilterChange 
}: SignalStatsCardsProps) {
    return (
        <div className="grid grid-cols-6 gap-3 mb-4">
            <StatsCard 
                label="TẤT CẢ"
                count={stats.total}
                color="#1890ff"
                isActive={filter === "ALL"}
                onClick={() => onFilterChange("ALL")}
            />
            <StatsCard 
                label="MUA MẠNH"
                count={stats.strongBuy}
                color={SIGNAL_COLORS.STRONG_BUY}
                isActive={filter === "STRONG_BUY"}
                onClick={() => onFilterChange("STRONG_BUY")}
            />
            <StatsCard 
                label="MUA"
                count={stats.buy}
                color={SIGNAL_COLORS.BUY}
                isActive={filter === "BUY"}
                onClick={() => onFilterChange("BUY")}
            />
            <StatsCard 
                label="TRUNG LẬP"
                count={stats.neutral}
                color={SIGNAL_COLORS.NEUTRAL}
                isActive={filter === "NEUTRAL"}
                onClick={() => onFilterChange("NEUTRAL")}
            />
            <StatsCard 
                label="BÁN"
                count={stats.sell}
                color={SIGNAL_COLORS.SELL}
                isActive={filter === "SELL"}
                onClick={() => onFilterChange("SELL")}
            />
            <StatsCard 
                label="BÁN MẠNH"
                count={stats.strongSell}
                color={SIGNAL_COLORS.STRONG_SELL}
                isActive={filter === "STRONG_SELL"}
                onClick={() => onFilterChange("STRONG_SELL")}
            />
        </div>
    );
});

export default SignalStatsCards;
