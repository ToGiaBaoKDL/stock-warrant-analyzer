/**
 * Signal Stats Cards Component
 * 
 * Displays statistics about trading signals and market regime with clickable filters.
 * Two rows: signal strength stats + market regime stats.
 */

import React, { memo } from "react";
import { Card, Typography, Tag } from "antd";
import { 
    RiseOutlined, 
    FallOutlined, 
    SwapOutlined, 
    StopOutlined,
} from "@ant-design/icons";
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

/**
 * Small regime stat badge
 */
const RegimeStat = memo(function RegimeStat({ 
    icon, 
    label, 
    count, 
    color,
}: { 
    icon: React.ReactNode; 
    label: string; 
    count: number; 
    color: string;
}) {
    return (
        <Tag color={color} className="px-2 py-0.5">
            {icon} {label}: <strong>{count}</strong>
        </Tag>
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
        <div className="mb-4 space-y-3">
            {/* Row 1: Signal Strength */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <StatsCard 
                    label="TẤT CẢ"
                    count={stats.total}
                    color="var(--primary-500)"
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

            {/* Row 2: Market Regime Summary */}
            <div className="flex flex-wrap items-center gap-2">
                <Text type="secondary" className="text-xs font-semibold">Thị trường:</Text>
                <RegimeStat icon={<RiseOutlined />} label="Uptrend" count={stats.uptrend} color="green" />
                <RegimeStat icon={<FallOutlined />} label="Downtrend" count={stats.downtrend} color="red" />
                <RegimeStat icon={<SwapOutlined />} label="Sideway" count={stats.sideway} color="default" />
                {stats.atFloor > 0 && (
                    <RegimeStat icon={<StopOutlined />} label="Nằm Sàn" count={stats.atFloor} color="cyan" />
                )}
            </div>
        </div>
    );
});

export default SignalStatsCards;
