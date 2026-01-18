"use client";

import { useState, useEffect, useCallback } from "react";
import { Layout, Typography, Card, Tabs, Tag } from "antd";
import { useQuery } from "@tanstack/react-query";
import { apiClient, endpoints } from "@/lib/api-client";
import type { ExchangeSummary, WarrantListResponse } from "@/types/api";
import {
  MainNav,
  StockTable,
  WarrantTable,
  MarketSummaryGrid,
} from "@/components";
import { getRefetchInterval } from "@/utils";
import type { ExchangeSummaryData } from "@/components/cards/MarketSummaryCard";

const { Content, Footer } = Layout;
const { Text } = Typography;

// ============================================
// Main Component
// ============================================

export default function Home() {
  const [activeTab, setActiveTab] = useState("hose");

  // Load saved tab from localStorage on mount
  useEffect(() => {
    const savedTab = localStorage.getItem("homeActiveTab");
    if (savedTab) {
      setActiveTab(savedTab);
    }
  }, []);

  // Save tab to localStorage when changed
  const handleTabChange = useCallback((key: string) => {
    setActiveTab(key);
    localStorage.setItem("homeActiveTab", key);
  }, []);

  // Fetch exchange summary
  const { data: summaryData } = useQuery({
    queryKey: ["exchange-summary"],
    queryFn: async () => {
      const response = await apiClient.get<ExchangeSummary[]>(
        endpoints.market.exchangeSummary()
      );
      return response.data;
    },
    refetchInterval: getRefetchInterval(60000),
  });

  // Fetch warrant count
  const { data: warrantData } = useQuery({
    queryKey: ["warrants-count"],
    queryFn: async () => {
      const response = await apiClient.get<WarrantListResponse>(
        endpoints.warrants.list({ limit: 1 })
      );
      return response.data;
    },
    refetchInterval: getRefetchInterval(60000),
  });

  // Helper to get summary for an exchange
  const getSummary = useCallback(
    (exchange: string): ExchangeSummaryData | undefined => {
      const summary = summaryData?.find(
        (s) => s.exchange === exchange.toUpperCase()
      );
      if (!summary) return undefined;
      return {
        total_stocks: summary.total_stocks,
        total_volume: summary.total_volume,
        advances: summary.advances,
        declines: summary.declines,
        unchanged: summary.unchanged,
      };
    },
    [summaryData]
  );

  // Tab items configuration
  const tabItems = [
    {
      key: "hose",
      label: (
        <span className="flex items-center gap-2">
          HOSE
          <Tag color="blue">{getSummary("HOSE")?.total_stocks || "..."}</Tag>
        </span>
      ),
      children: <StockTable exchange="hose" label="HOSE" />,
    },
    {
      key: "hnx",
      label: (
        <span className="flex items-center gap-2">
          HNX
          <Tag color="orange">{getSummary("HNX")?.total_stocks || "..."}</Tag>
        </span>
      ),
      children: <StockTable exchange="hnx" label="HNX" />,
    },
    {
      key: "upcom",
      label: (
        <span className="flex items-center gap-2">
          UPCOM
          <Tag color="purple">{getSummary("UPCOM")?.total_stocks || "..."}</Tag>
        </span>
      ),
      children: <StockTable exchange="upcom" label="UPCOM" />,
    },
    {
      key: "vn30",
      label: (
        <span className="flex items-center gap-2">
          VN30
          <Tag color="green">30</Tag>
        </span>
      ),
      children: <StockTable exchange="vn30" label="VN30" />,
    },
    {
      key: "cw",
      label: (
        <span className="flex items-center gap-2">
          Chứng quyền
          <Tag color="red">{warrantData?.total || "..."}</Tag>
        </span>
      ),
      children: <WarrantTable />,
    },
  ];

  return (
    <Layout className="min-h-screen" style={{ background: "#F5F4EF" }}>
      {/* Header */}
      <MainNav />

      <Content className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Market Summary Cards - Using extracted component */}
          <MarketSummaryGrid getSummary={getSummary} exchanges={["HOSE", "HNX", "UPCOM", "VN30"]} />

          {/* Main Tabs */}
          <Card styles={{ body: { padding: "16px 24px" } }}>
            <Tabs
              activeKey={activeTab}
              onChange={handleTabChange}
              items={tabItems}
              size="large"
            />
          </Card>
        </div>
      </Content>

      {/* Footer */}
      <Footer className="text-center bg-white border-t border-gray-100 py-4">
        <Text type="secondary" className="text-sm">
          Dữ liệu từ SSI iBoard API
        </Text>
      </Footer>
    </Layout>
  );
}
