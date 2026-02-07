"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Layout, Card, Tabs, Tag, Button, Typography } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { MainNav } from "@/components";
import { SignalTable } from "@/components/tables/SignalTable";
import { SignalStatsCards, SignalLegend, SignalMethodology } from "@/components/signals";
import { useSignals, VN30_SYMBOLS, type ExchangeType } from "@/hooks/useSignals";
import type { SignalStrength } from "@/utils/indicators";

const { Content } = Layout;
const { Title, Text } = Typography;

type FilterType = "ALL" | SignalStrength;

/**
 * Signals Page - Stock Trading Signals for HOSE, HNX, VN30
 * 
 * Uses the 3-Layer Funnel Signal System:
 * - Layer 1: Market Regime (EMA50, MA200, ADX)
 * - Layer 2: Setup (Trend Following vs Mean Reversion)
 * - Layer 3: Volume Confirmation (RVOL)
 * 
 * Optimized with memoization and component extraction
 */
export default function SignalsPage() {
    const [activeExchange, setActiveExchange] = useState<ExchangeType>("VN30");
    const [filter, setFilter] = useState<FilterType>("ALL");

    // Use custom hook for signals data
    const { 
        tableData, 
        stats, 
        isStockLoading, 
        isHistoryLoading,
        hoseCount,
        hnxCount,
        refetch,
    } = useSignals({ exchange: activeExchange });

    // Filter and sort data - memoized
    const filteredData = useMemo(() => {
        let data = [...tableData];

        // Apply filter
        if (filter !== "ALL") {
            data = data.filter(row => row.signal?.overall === filter);
        }

        // Sort by signal strength (STRONG_BUY first, then BUY, etc.)
        const STRENGTH_ORDER: Record<string, number> = {
            STRONG_BUY: 0,
            BUY: 1,
            NEUTRAL: 2,
            SELL: 3,
            STRONG_SELL: 4,
        };
        data.sort((a, b) => {
            const orderA = a.signal ? (STRENGTH_ORDER[a.signal.overall] ?? 5) : 5;
            const orderB = b.signal ? (STRENGTH_ORDER[b.signal.overall] ?? 5) : 5;
            if (orderA !== orderB) return orderA - orderB;
            return a.symbol.localeCompare(b.symbol);
        });

        return data;
    }, [tableData, filter]);

    // Memoized tab change handler
    const handleExchangeChange = useCallback((key: string) => {
        setActiveExchange(key as ExchangeType);
        setFilter("ALL"); // Reset filter when changing exchange
    }, []);

    // Memoized filter change handler
    const handleFilterChange = useCallback((newFilter: FilterType) => {
        setFilter(newFilter);
    }, []);

    return (
        <Layout className="min-h-screen" style={{ background: "var(--background)" }}>
            <MainNav />
            
            <Content className="p-6">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <Title level={3} className="!mb-0">
                                Tín Hiệu Giao Dịch
                            </Title>
                            <Text type="secondary" className="text-sm">
                                Hệ thống Phễu 3 Lớp: Xu Hướng → Chiến Thuật → Volume
                            </Text>
                        </div>
                        <Button 
                            icon={<ReloadOutlined spin={isHistoryLoading} />} 
                            onClick={refetch}
                            loading={isStockLoading}
                        >
                            Làm mới
                        </Button>
                    </div>

                    {/* Exchange Tabs */}
                    <Tabs
                        activeKey={activeExchange}
                        onChange={handleExchangeChange}
                        className="mb-4"
                        items={[
                            {
                                key: "VN30",
                                label: (
                                    <span className="flex items-center gap-2">
                                        VN30
                                        <Tag color="gold">{VN30_SYMBOLS.size}</Tag>
                                    </span>
                                ),
                            },
                            {
                                key: "HOSE",
                                label: (
                                    <span className="flex items-center gap-2">
                                        HOSE
                                        <Tag color="blue">{hoseCount || "..."}</Tag>
                                    </span>
                                ),
                            },
                            {
                                key: "HNX",
                                label: (
                                    <span className="flex items-center gap-2">
                                        HNX
                                        <Tag color="orange">{hnxCount || "..."}</Tag>
                                    </span>
                                ),
                            },
                        ]}
                    />

                    {/* Stats Cards */}
                    <SignalStatsCards 
                        stats={stats} 
                        filter={filter} 
                        onFilterChange={handleFilterChange} 
                    />

                    {/* Main Table */}
                    <Card styles={{ body: { padding: 0 } }}>
                        <SignalTable 
                            data={filteredData} 
                            loading={isStockLoading} 
                        />
                    </Card>

                    {/* Legend */}
                    <SignalLegend />

                    {/* Methodology - Formula & Scoring */}
                    <SignalMethodology />
                </div>
            </Content>
        </Layout>
    );
}
