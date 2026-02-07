"use client";

import React from "react";
import { Card, Typography } from "antd";
import { formatVolume } from "@/utils";

const { Text } = Typography;

// ============================================
// Types
// ============================================

export interface ExchangeSummaryData {
    total_stocks: number;
    total_volume: number;
    advances: number;
    declines: number;
    unchanged: number;
}

export interface MarketSummaryCardProps {
    /** Exchange name (e.g., 'HOSE', 'HNX', 'UPCOM') */
    exchange: string;
    /** Summary data for the exchange */
    summary: ExchangeSummaryData | undefined;
}

// ============================================
// Helper Functions
// ============================================

function getExchangeColor(exchange: string): string {
    switch (exchange) {
        case "HOSE":
            return "bg-blue-500";
        case "HNX":
            return "bg-orange-500";
        case "UPCOM":
            return "bg-purple-500";
        case "VN30":
            return "bg-green-500";
        default:
            return "bg-gray-500";
    }
}

// ============================================
// Component
// ============================================

/**
 * MarketSummaryCard - Displays exchange summary statistics
 * Extracted from app/page.tsx for reusability
 */
export const MarketSummaryCard = React.memo(function MarketSummaryCard({
    exchange,
    summary,
}: MarketSummaryCardProps) {
    const total =
        (summary?.advances || 0) + (summary?.declines || 0) + (summary?.unchanged || 0);

    return (
        <Card size="small" className="h-full">
            <div className="flex justify-between items-center">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className={`w-1 h-4 rounded-full ${getExchangeColor(exchange)}`} />
                        <Text type="secondary" className="font-semibold tracking-wide text-xs uppercase">
                            {exchange}
                        </Text>
                    </div>
                    <div className="text-lg font-semibold !text-gray-900 dark:!text-white">{summary?.total_stocks || "..."} mã</div>
                </div>
                <div className="text-right">
                    <div className="flex gap-2 text-xs">
                        <span style={{ color: "var(--color-up)" }}>▲ {summary?.advances || 0}</span>
                        <span style={{ color: "var(--color-ref)" }}>- {summary?.unchanged || 0}</span>
                        <span style={{ color: "var(--color-down)" }}>▼ {summary?.declines || 0}</span>
                    </div>
                    <Text type="secondary" className="text-xs">
                        KL: {formatVolume(summary?.total_volume || 0)}
                    </Text>
                </div>
            </div>
            
            {/* Market Breadth Bar */}
            {total > 0 && (
                <div className="flex h-1.5 w-full rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 mt-3">
                    <div
                        style={{ width: `${((summary?.advances || 0) / total) * 100}%`, backgroundColor: "var(--color-up)" }}
                    />
                    <div
                        style={{ width: `${((summary?.unchanged || 0) / total) * 100}%`, backgroundColor: "var(--color-ref)" }}
                    />
                    <div
                        style={{ width: `${((summary?.declines || 0) / total) * 100}%`, backgroundColor: "var(--color-down)" }}
                    />
                </div>
            )}

        </Card>
    );
});

export interface MarketSummaryGridProps {
    /** Summary data for each exchange */
    getSummary: (exchange: string) => ExchangeSummaryData | undefined;
    /** List of exchanges to display */
    exchanges?: string[];
}

export const MarketSummaryGrid = React.memo(function MarketSummaryGrid({
    getSummary,
    exchanges = ["HOSE", "HNX", "UPCOM"],
}: MarketSummaryGridProps) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {exchanges.map((exchange) => (
                <MarketSummaryCard
                    key={exchange}
                    exchange={exchange}
                    summary={getSummary(exchange)}
                />
            ))}
        </div>
    );
});
