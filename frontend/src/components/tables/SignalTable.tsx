/**
 * Signal Table Components
 * 
 * Optimized components for displaying trading signals:
 * - Memoized sub-components to prevent unnecessary re-renders
 * - Extracted column definitions
 */

import React, { memo, useMemo } from "react";
import { Table, Tag, Tooltip, Spin, Badge, Progress, Space, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ArrowUpOutlined, ArrowDownOutlined, MinusOutlined, RiseOutlined, FallOutlined } from "@ant-design/icons";
import Link from "next/link";
import { SIGNAL_COLORS, type SignalStrength } from "@/utils/indicators";
import { getPricePosition, getPositionColorHex, getPriceColorHex } from "@/utils/priceColor";
import type { StockSignalRow } from "@/hooks/useSignals";

const { Text } = Typography;

// ===========================================
// Memoized Sub-Components
// ===========================================

/**
 * Stock symbol with price-based color - Memoized
 */
export const StockSymbol = memo(function StockSymbol({ 
    symbol, 
    price, 
    refPrice, 
    ceiling, 
    floor 
}: { 
    symbol: string; 
    price: number; 
    refPrice: number; 
    ceiling: number; 
    floor: number;
}) {
    const position = getPricePosition(price, refPrice, ceiling, floor);
    const colorVar = getPositionColorHex(position);
    
    return (
        <Link 
            href={`/analysis/${symbol}`} 
            className="font-bold hover:underline"
            style={{ color: colorVar }}
        >
            {symbol}
        </Link>
    );
});

/**
 * Indicator mini badge with tooltip - Memoized
 */
export const IndicatorBadge = memo(function IndicatorBadge({ 
    name, 
    signal, 
    strength,
    value,
}: { 
    name: string; 
    signal: "bullish" | "bearish" | "neutral"; 
    strength: number;
    value?: string;
}) {
    const color = signal === "bullish" ? "green" : signal === "bearish" ? "red" : "default";
    const icon = signal === "bullish" ? "✓" : signal === "bearish" ? "✗" : "○";
    
    const tooltipContent = (
        <div className="text-xs">
            <div className="font-semibold">{name}</div>
            <div>Điểm: {strength > 0 ? "+" : ""}{strength.toFixed(0)}</div>
            {value && <div className="text-gray-400">{value}</div>}
        </div>
    );
    
    return (
        <Tooltip title={tooltipContent}>
            <Tag color={color} className="text-xs px-1 py-0 cursor-help">
                {icon}
            </Tag>
        </Tooltip>
    );
});

/**
 * Signal badge configuration
 */
const SIGNAL_BADGE_CONFIG: Record<SignalStrength, { color: string; text: string; icon: React.ReactNode }> = {
    STRONG_BUY: { color: "green", text: "MUA MẠNH", icon: <RiseOutlined /> },
    BUY: { color: "lime", text: "MUA", icon: <ArrowUpOutlined /> },
    NEUTRAL: { color: "default", text: "TRUNG LẬP", icon: <MinusOutlined /> },
    SELL: { color: "orange", text: "BÁN", icon: <ArrowDownOutlined /> },
    STRONG_SELL: { color: "red", text: "BÁN MẠNH", icon: <FallOutlined /> },
};

/**
 * Get signal badge props
 */
export function getSignalBadge(overall: SignalStrength) {
    return SIGNAL_BADGE_CONFIG[overall];
}

// ===========================================
// Column Definitions
// ===========================================

/**
 * Create table columns for signals table
 */
export function createSignalColumns(): ColumnsType<StockSignalRow> {
    return [
        {
            title: "Mã CK",
            dataIndex: "symbol",
            key: "symbol",
            width: 80,
            fixed: "left",
            render: (_, record) => (
                <StockSymbol 
                    symbol={record.symbol}
                    price={record.price}
                    refPrice={record.refPrice}
                    ceiling={record.ceiling}
                    floor={record.floor}
                />
            ),
        },
        {
            title: "Giá",
            dataIndex: "price",
            key: "price",
            width: 75,
            align: "right",
            render: (price: number, record) => {
                const position = getPricePosition(price, record.refPrice, record.ceiling, record.floor);
                const colorVar = record.refPrice > 0 ? getPositionColorHex(position) : getPriceColorHex(record.change);
                return (
                    <Text className="font-mono font-semibold" style={{ color: colorVar }}>
                        {price > 0 ? (price / 1000).toFixed(2) : "-"}
                    </Text>
                );
            },
        },
        {
            title: "+/-",
            key: "change",
            width: 80,
            align: "right",
            sorter: (a, b) => a.changePercent - b.changePercent,
            render: (_, record) => {
                const position = getPricePosition(record.price, record.refPrice, record.ceiling, record.floor);
                const colorVar = record.refPrice > 0 ? getPositionColorHex(position) : getPriceColorHex(record.change);
                const icon = record.change > 0 ? <ArrowUpOutlined /> : record.change < 0 ? <ArrowDownOutlined /> : null;
                return (
                    <Space size={2}>
                        {icon && <span style={{ color: colorVar }}>{icon}</span>}
                        <Text className="font-mono text-xs" style={{ color: colorVar }}>
                            {record.changePercent.toFixed(2)}%
                        </Text>
                    </Space>
                );
            },
        },
        {
            title: "KL",
            dataIndex: "volume",
            key: "volume",
            width: 70,
            align: "right",
            render: (volume: number) => (
                <Text className="font-mono text-xs">
                    {volume > 0 ? (volume / 1000).toFixed(0) + "K" : "-"}
                </Text>
            ),
        },
        {
            title: "Tín Hiệu",
            key: "signal",
            width: 110,
            align: "center",
            filters: [
                { text: "MUA MẠNH", value: "STRONG_BUY" },
                { text: "MUA", value: "BUY" },
                { text: "TRUNG LẬP", value: "NEUTRAL" },
                { text: "BÁN", value: "SELL" },
                { text: "BÁN MẠNH", value: "STRONG_SELL" },
            ],
            onFilter: (value, record) => record.signal?.overall === value,
            render: (_, record) => {
                if (record.isLoadingHistory) {
                    return <Spin size="small" />;
                }
                if (!record.signal) {
                    return <Tag color="default">N/A</Tag>;
                }
                const badge = getSignalBadge(record.signal.overall);
                return (
                    <Tooltip title={record.signal.summary}>
                        <Tag 
                            color={badge.color} 
                            icon={badge.icon}
                            className="font-semibold cursor-help"
                        >
                            {badge.text}
                        </Tag>
                    </Tooltip>
                );
            },
        },
        {
            title: "Điểm",
            key: "score",
            width: 60,
            align: "center",
            sorter: (a, b) => (a.signal?.score ?? 0) - (b.signal?.score ?? 0),
            defaultSortOrder: "descend",
            render: (_, record) => {
                if (record.isLoadingHistory) return <Spin size="small" />;
                if (!record.signal) return "-";
                
                const score = record.signal.score;
                return (
                    <Badge 
                        count={`${score > 0 ? "+" : ""}${score}`} 
                        color={SIGNAL_COLORS[record.signal.overall]}
                        className="font-mono"
                    />
                );
            },
        },
        {
            title: "RSI",
            key: "rsi",
            width: 40,
            align: "center",
            render: (_, record) => {
                const rsi = record.signal?.signals.find(s => s.indicator === "RSI");
                if (!rsi) return <Tag color="default">-</Tag>;
                return <IndicatorBadge name="RSI" signal={rsi.signal} strength={rsi.strength} value={rsi.value} />;
            },
        },
        {
            title: "MACD",
            key: "macd",
            width: 40,
            align: "center",
            render: (_, record) => {
                const macd = record.signal?.signals.find(s => s.indicator === "MACD");
                if (!macd) return <Tag color="default">-</Tag>;
                return <IndicatorBadge name="MACD" signal={macd.signal} strength={macd.strength} value={macd.value} />;
            },
        },
        {
            title: "BB",
            key: "bb",
            width: 40,
            align: "center",
            render: (_, record) => {
                const bb = record.signal?.signals.find(s => s.indicator === "Bollinger Bands");
                if (!bb) return <Tag color="default">-</Tag>;
                return <IndicatorBadge name="Bollinger Bands" signal={bb.signal} strength={bb.strength} value={bb.value} />;
            },
        },
        {
            title: "MA",
            key: "ma",
            width: 40,
            align: "center",
            render: (_, record) => {
                const ma = record.signal?.signals.find(s => s.indicator === "MA Trend");
                if (!ma) return <Tag color="default">-</Tag>;
                return <IndicatorBadge name="MA Trend" signal={ma.signal} strength={ma.strength} value={ma.value} />;
            },
        },
        {
            title: "MOM",
            key: "momentum",
            width: 40,
            align: "center",
            render: (_, record) => {
                const mom = record.signal?.signals.find(s => s.indicator === "Momentum");
                if (!mom) return <Tag color="default">-</Tag>;
                return <IndicatorBadge name="Momentum" signal={mom.signal} strength={mom.strength} value={mom.value} />;
            },
        },
        {
            title: "Gauge",
            key: "gauge",
            width: 90,
            render: (_, record) => {
                if (!record.signal) return null;
                const percent = (record.signal.score + 100) / 2;
                return (
                    <Progress
                        percent={percent}
                        size="small"
                        showInfo={false}
                        strokeColor={{
                            "0%": "#D32F2F",
                            "25%": "#FF7043",
                            "50%": "#9E9E9E",
                            "75%": "#7CB342",
                            "100%": "#00C853",
                        }}
                    />
                );
            },
        },
    ];
}

// ===========================================
// Main Table Component
// ===========================================

interface SignalTableProps {
    data: StockSignalRow[];
    loading?: boolean;
}

/**
 * Memoized Signal Table Component
 */
export const SignalTable = memo(function SignalTable({ data, loading }: SignalTableProps) {
    const columns = useMemo(() => createSignalColumns(), []);

    return (
        <Table
            columns={columns}
            dataSource={data}
            pagination={{ 
                pageSize: 50, 
                showSizeChanger: true, 
                showTotal: (total, range) => `${range[0]}-${range[1]} / ${total} cổ phiếu`,
                pageSizeOptions: ["20", "50", "100", "200"],
            }}
            size="small"
            scroll={{ x: 950 }}
            loading={loading}
            rowClassName={(record) => {
                if (!record.signal) return "";
                if (record.signal.overall === "STRONG_BUY") return "bg-green-50 dark:bg-green-900/10";
                if (record.signal.overall === "STRONG_SELL") return "bg-red-50 dark:bg-red-900/10";
                return "";
            }}
        />
    );
});

export default SignalTable;
