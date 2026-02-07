"use client";

import React from "react";
import { Card, Spin, Typography, Tag, Table } from "antd";
import { ArrowUpOutlined, ArrowDownOutlined, MinusOutlined } from "@ant-design/icons";
import type { StockItem, WarrantItem } from "@/types/api";
import { formatVND, getFullPriceColorHex } from "@/utils";

const { Text, Title } = Typography;

export interface PriceInfoTabProps {
    /** Stock or warrant data */
    data: StockItem | WarrantItem | null;
    /** Whether data is loading */
    isLoading?: boolean;
    /** Symbol type: 'stock' or 'warrant' */
    type: "stock" | "warrant";
}

/**
 * PriceInfoTab - Displays comprehensive price information as vertical table
 * 
 * Shows:
 * - Current price with 5-color coding (ceiling/floor)
 * - Absolute change and percentage change with colors
 * - Volume
 * - For stocks: Ceiling, Floor, Reference prices with colors
 * - For warrants: Exercise price, conversion ratio, maturity (5-color)
 */
export const PriceInfoTab = React.memo(function PriceInfoTab({
    data,
    isLoading = false,
    type,
}: PriceInfoTabProps) {
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-48">
                <Spin size="large" />
            </div>
        );
    }

    if (!data) {
        return (
            <Card variant="borderless" className="text-center py-8">
                <Text type="secondary">Không có dữ liệu</Text>
            </Card>
        );
    }

    const isStock = type === "stock";
    const stockData = data as StockItem;
    const warrantData = data as WarrantItem;

    // For stocks: use 5-color based on ceiling/floor
    // For warrants: also use 5-color based on underlying price position
    const priceColor = isStock
        ? getFullPriceColorHex(stockData.current_price, stockData.ref_price, stockData.ceiling, stockData.floor)
        : getFullPriceColorHex(
            warrantData.current_price,
            warrantData.ref_price || warrantData.current_price - warrantData.change,
            warrantData.ceiling,
            warrantData.floor
        );

    const changeColor = priceColor; // Same color for change
    const changeIcon = data.change > 0
        ? <ArrowUpOutlined style={{ color: changeColor }} />
        : data.change < 0
            ? <ArrowDownOutlined style={{ color: changeColor }} />
            : <MinusOutlined style={{ color: "var(--color-ref)" }} />;

    // Build table data for vertical layout
    const tableData: { key: string; label: string; value: React.ReactNode }[] = [];

    // Current Price row - prominent
    tableData.push({
        key: "price",
        label: "Giá hiện tại",
        value: (
            <span style={{ color: priceColor, fontSize: 24, fontWeight: 600 }}>
                {formatVND(data.current_price)}
            </span>
        ),
    });

    // Change row
    tableData.push({
        key: "change",
        label: "+/-",
        value: (
            <span style={{ color: changeColor, fontWeight: 500 }}>
                {changeIcon}{" "}
                {data.change >= 0 ? "+" : ""}{data.change?.toLocaleString()} ({data.change_percent >= 0 ? "+" : ""}{data.change_percent?.toFixed(2)}%)
            </span>
        ),
    });

    // Volume row
    tableData.push({
        key: "volume",
        label: "Khối lượng",
        value: data.volume?.toLocaleString(),
    });

    if (isStock) {
        // Stock-specific rows
        tableData.push({
            key: "ref",
            label: "Tham chiếu",
            value: <span style={{ color: "var(--color-ref)" }}>{formatVND(stockData.ref_price)}</span>,
        });
        tableData.push({
            key: "ceiling",
            label: "Trần",
            value: <span style={{ color: "var(--color-ceiling)" }}>{formatVND(stockData.ceiling)}</span>,
        });
        tableData.push({
            key: "floor",
            label: "Sàn",
            value: <span style={{ color: "var(--color-floor)" }}>{formatVND(stockData.floor)}</span>,
        });
        tableData.push({
            key: "open",
            label: "Mở cửa",
            value: formatVND(stockData.open_price),
        });
        tableData.push({
            key: "high",
            label: "Cao nhất",
            value: <span style={{ color: "var(--color-up)" }}>{formatVND(stockData.high_price)}</span>,
        });
        tableData.push({
            key: "low",
            label: "Thấp nhất",
            value: <span style={{ color: "var(--color-down)" }}>{formatVND(stockData.low_price)}</span>,
        });
    } else {
        // Warrant-specific rows
        tableData.push({
            key: "underlying",
            label: "CP Mẹ",
            value: <Tag color="blue">{warrantData.underlying_symbol}</Tag>,
        });
        tableData.push({
            key: "exercise_price",
            label: "Giá thực hiện",
            value: formatVND(warrantData.exercise_price),
        });
        tableData.push({
            key: "ratio",
            label: "Tỷ lệ CĐ",
            value: `${warrantData.exercise_ratio}:1`,
        });
        tableData.push({
            key: "maturity",
            label: "Ngày đáo hạn",
            value: warrantData.maturity_date,
        });
        tableData.push({
            key: "days_left",
            label: "Còn lại",
            value: (
                <Tag color={warrantData.days_to_maturity < 14 ? "red" : "default"}>
                    {warrantData.days_to_maturity} ngày
                </Tag>
            ),
        });
        tableData.push({
            key: "issuer",
            label: "TCPH",
            value: warrantData.issuer_name || "N/A",
        });
    }

    const columns = [
        {
            dataIndex: "label",
            key: "label",
            width: 120,
            render: (text: string) => <Text style={{ color: "var(--foreground)" }}>{text}</Text>,
        },
        {
            dataIndex: "value",
            key: "value",
        },
    ];

    return (
        <Card variant="borderless" className="h-full">
            {/* Header with Symbol and Name */}
            <div className="mb-4 pb-3 border-b">
                <div className="flex items-baseline gap-3">
                    <Title level={3} style={{ margin: 0, color: priceColor }}>
                        {data.symbol}
                    </Title>
                    <Text className="text-sm" style={{ color: "var(--foreground)" }}>
                        {isStock ? stockData.name : warrantData.underlying_symbol}
                    </Text>
                </div>
            </div>

            {/* Vertical Price Table */}
            <Table
                dataSource={tableData}
                columns={columns}
                rowKey="key"
                size="small"
                showHeader={false}
                pagination={false}
            />
        </Card>
    );
});

export default PriceInfoTab;
