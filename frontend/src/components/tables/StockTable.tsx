"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Table, Input, Select, Button, Typography } from "antd";
import { SearchOutlined, ReloadOutlined } from "@ant-design/icons";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiClient, endpoints } from "@/lib/api-client";
import { pollingIntervals } from "@/lib/query-client";
import type { StockItem, StockListResponse } from "@/types/api";
import { formatVND, formatVolume, getFullPriceColorHex, getRefetchInterval } from "@/utils";
import { AppColors } from "@/utils/theme";
import { ExportButtons, SparklineCell } from "@/components";

const { Text } = Typography;



export interface StockTableProps {
    /** Exchange code (e.g., 'hose', 'hnx', 'upcom') */
    exchange: string;
    /** Display label for the exchange */
    label: string;
}

type SortOrder = "asc" | "desc";



const EXPORT_COLUMNS = [
    { key: "symbol", title: "Mã" },
    { key: "name", title: "Tên" },
    { key: "current_price", title: "Giá" },
    { key: "change_percent", title: "+/-" },
    { key: "volume", title: "KL" },
    { key: "ref_price", title: "Tham chiếu" },
    { key: "ceiling", title: "Trần" },
    { key: "floor", title: "Sàn" },
];

const SORT_OPTIONS = [
    { value: "volume", label: "Khối lượng" },
    { value: "change_percent", label: "% Thay đổi" },
    { value: "value", label: "Giá trị" },
];

export const StockTable = React.memo(function StockTable({
    exchange,
    label,
}: StockTableProps) {
    // Local state
    const [search, setSearch] = useState("");
    const [sortField, setSortField] = useState<string | null>(null);
    const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

    // Data fetching
    const { data, isLoading, refetch, isFetching } = useQuery({
        queryKey: ["stocks", exchange],
        queryFn: async () => {
            const response = await apiClient.get<StockListResponse>(
                endpoints.stocks.byExchange(exchange.toLowerCase())
            );
            return response.data;
        },
        refetchInterval: getRefetchInterval(pollingIntervals.marketData),
        staleTime: 30000,
    });

    // Filtered and sorted data
    const filteredStocks = useMemo(() => {
        if (!data?.stocks) return [];
        let stocks = [...data.stocks];

        // Filter by search
        if (search) {
            const searchUpper = search.toUpperCase();
            stocks = stocks.filter(
                (s) =>
                    s.symbol.includes(searchUpper) ||
                    s.name.toLowerCase().includes(search.toLowerCase())
            );
        }

        // Sort - only sort numeric fields
        if (sortField && ['volume', 'change_percent', 'value', 'current_price'].includes(sortField)) {
            stocks.sort((a, b) => {
                const aVal = (a[sortField as keyof StockItem] as number) ?? 0;
                const bVal = (b[sortField as keyof StockItem] as number) ?? 0;
                return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
            });
        }

        return stocks;
    }, [data?.stocks, search, sortField, sortOrder]);

    // Memoized columns
    const columns = useMemo(
        () => [
            {
                title: "Mã",
                dataIndex: "symbol",
                key: "symbol",
                width: 80,
                fixed: "left" as const,
                render: (symbol: string, record: StockItem) => (
                    <Link
                        href={`/analysis/${symbol}`}
                        className="font-semibold hover:opacity-80"
                        style={{ color: getFullPriceColorHex(record.current_price, record.ref_price, record.ceiling, record.floor) }}
                    >
                        {symbol}
                    </Link>
                ),
            },
            {
                title: "Tên",
                dataIndex: "name",
                key: "name",
                ellipsis: true,
                width: 200,
            },
            {
                title: "Giá",
                dataIndex: "current_price",
                key: "current_price",
                width: 100,
                align: "right" as const,
                render: (price: number, record: StockItem) => (
                    <span style={{ color: getFullPriceColorHex(price, record.ref_price, record.ceiling, record.floor) }}>{formatVND(price)}</span>
                ),
            },
            {
                title: "+/-",
                dataIndex: "change_percent",
                key: "change_percent",
                width: 80,
                align: "right" as const,
                sorter: true,
                render: (percent: number, record: StockItem) => {
                    const color = getFullPriceColorHex(record.current_price, record.ref_price, record.ceiling, record.floor);
                    const absChange = record.change || 0;
                    return (
                        <div className="flex flex-col items-end leading-tight">
                            <span style={{ color }}>
                                {absChange >= 0 ? "+" : ""}{absChange.toLocaleString()}
                            </span>
                            <span style={{ color }} className="text-xs">
                                {percent >= 0 ? "+" : ""}{percent.toFixed(2)}%
                            </span>
                        </div>
                    );
                },
            },
            {
                title: "Trend",
                dataIndex: "symbol",
                key: "trend",
                width: 90,
                align: "center" as const,
                render: (symbol: string, record: StockItem) => (
                    <SparklineCell
                        symbol={symbol}
                        currentPrice={record.current_price}
                        refPrice={record.ref_price}
                        ceiling={record.ceiling}
                        floor={record.floor}
                        width={80}
                        height={24}
                    />
                ),
            },
            {
                title: "KL",
                dataIndex: "volume",
                key: "volume",
                width: 90,
                align: "right" as const,
                sorter: true,
                render: (vol: number) => formatVolume(vol),
            },
            {
                title: "Tham chiếu",
                dataIndex: "ref_price",
                key: "ref_price",
                width: 90,
                align: "right" as const,
                render: (price: number) => formatVND(price),
            },
            {
                title: "Trần",
                dataIndex: "ceiling",
                key: "ceiling",
                width: 90,
                align: "right" as const,
                render: (price: number) => <span style={{ color: "var(--color-ceiling)" }}>{formatVND(price)}</span>,
            },
            {
                title: "Sàn",
                dataIndex: "floor",
                key: "floor",
                width: 90,
                align: "right" as const,
                render: (price: number) => <span style={{ color: "var(--color-floor)" }}>{formatVND(price)}</span>,
            },
            {
                title: "NN Mua",
                dataIndex: "foreign_buy_vol",
                key: "foreign_buy_vol",
                width: 90,
                align: "right" as const,
                render: (vol: number) => formatVolume(vol),
            },
            {
                title: "NN Bán",
                dataIndex: "foreign_sell_vol",
                key: "foreign_sell_vol",
                width: 90,
                align: "right" as const,
                render: (vol: number) => formatVolume(vol),
            },
        ],
        []
    );

    // Handlers
    const handleSearchChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            setSearch(e.target.value);
        },
        []
    );

    const handleSortChange = useCallback((value: string | null) => {
        setSortField(value);
    }, []);

    const handleTableChange = useCallback(
        (_: unknown, __: unknown, sorter: { field?: string; order?: string } | unknown) => {
            if (!Array.isArray(sorter) && typeof sorter === "object" && sorter && "field" in sorter) {
                const s = sorter as { field?: string; order?: string };
                if (s.field) {
                    setSortField(s.field);
                    setSortOrder(s.order === "ascend" ? "asc" : "desc");
                }
            }
        },
        []
    );

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4">
                <Input
                    placeholder="Tìm mã hoặc tên..."
                    prefix={<SearchOutlined className="text-gray-400 dark:text-gray-500" />}
                    value={search}
                    onChange={handleSearchChange}
                    style={{ width: 200 }}
                    allowClear
                />
                <div className="relative inline-block w-[140px]">
                    <Select
                        placeholder="Sắp xếp"
                        style={{ width: '100%' }}
                        allowClear
                        value={sortField}
                        onChange={handleSortChange}
                        options={SORT_OPTIONS}
                        className="w-full [&.ant-select-single_.ant-select-selector]:!pl-9"
                    />
                </div>
                <Button
                    icon={<ReloadOutlined spin={isFetching} />}
                    onClick={() => refetch()}
                    style={{ color: AppColors.primary, borderColor: AppColors.primary }}
                >
                    Làm mới
                </Button>
                <ExportButtons
                    data={filteredStocks as unknown as Record<string, unknown>[]}
                    columns={EXPORT_COLUMNS}
                    filename={`stocks_${exchange}`}
                />
                <Text type="secondary">
                    {filteredStocks.length} / {data?.total || 0} mã
                </Text>
            </div>

            {/* Table */}
            <Table
                columns={columns}
                dataSource={filteredStocks}
                rowKey="symbol"
                loading={isLoading}
                size="small"
                scroll={{ x: 1000, y: 500 }}
                pagination={{
                    pageSize: 50,
                    showSizeChanger: true,
                    pageSizeOptions: ["20", "50", "100"],
                    showTotal: (total) => `${total} mã`,
                }}
                onChange={handleTableChange}
            />
        </div>
    );
});
