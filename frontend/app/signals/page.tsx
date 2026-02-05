"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Layout, Card, Tabs, Tag, Segmented, Spin, Button, Alert, Typography } from "antd";
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
 * Features:
 * - Uses same cache as homepage for stock data
 * - Calculates technical signals using 5 indicators
 * - Optimized with memoization and component extraction
 */
export default function SignalsPage() {
    const [activeExchange, setActiveExchange] = useState<ExchangeType>("VN30");
    const [filter, setFilter] = useState<FilterType>("ALL");
    const [sortBy, setSortBy] = useState<"score" | "symbol" | "change">("score");

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

        // Sort
        data.sort((a, b) => {
            if (sortBy === "score") {
                const scoreA = a.signal?.score ?? -999;
                const scoreB = b.signal?.score ?? -999;
                return scoreB - scoreA;
            } else if (sortBy === "change") {
                return b.changePercent - a.changePercent;
            }
            return a.symbol.localeCompare(b.symbol);
        });

        return data;
    }, [tableData, filter, sortBy]);

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
                                Phân tích kỹ thuật: RSI, MACD, Bollinger, MA, Momentum
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

                    {/* Disclaimer */}
                    {/* <Alert
                        title="Lưu ý"
                        description="Tín hiệu dựa trên 5 chỉ báo kỹ thuật với trọng số. Điểm từ -100 đến +100. Chỉ mang tính tham khảo."
                        type="warning"
                        showIcon
                        className="mb-1"
                        closable
                    /> */}

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
