"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Table, Input, Select, Button, Typography, Tag } from "antd";
import { SearchOutlined, ReloadOutlined } from "@ant-design/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiClient, endpoints } from "@/lib/api-client";
import { pollingIntervals } from "@/lib/query-client";
import type { WarrantItem, WarrantListResponse } from "@/types/api";
import { formatVND, formatVolume, getPriceColorClass, getRefetchInterval } from "@/utils";
import { ExportButtons } from "@/components";

const { Text } = Typography;

// ============================================
// Types
// ============================================

export interface WarrantTableProps {
    /** Callback when user wants to view detailed screener */
    onViewScreener?: () => void;
}

type SortOrder = "asc" | "desc";

// ============================================
// Column Definitions (Static)
// ============================================

const EXPORT_COLUMNS = [
    { key: "symbol", title: "Mã CW" },
    { key: "underlying_symbol", title: "CP mẹ" },
    { key: "current_price", title: "Giá" },
    { key: "change_percent", title: "+/-" },
    { key: "volume", title: "KL" },
    { key: "exercise_price", title: "Giá TH" },
    { key: "exercise_ratio", title: "Tỷ lệ" },
    { key: "maturity_date", title: "Ngày ĐH" },
    { key: "days_to_maturity", title: "Còn lại" },
];

const SORT_OPTIONS = [
    { value: "volume", label: "Khối lượng" },
    { value: "change_percent", label: "% Thay đổi" },
    { value: "days_to_maturity", label: "Ngày còn lại" },
];

// ============================================
// Component
// ============================================

/**
 * WarrantTable - Displays warrant overview data
 * Extracted from app/page.tsx for reusability and maintainability
 */
export const WarrantTable = React.memo(function WarrantTable({
    onViewScreener,
}: WarrantTableProps) {
    const router = useRouter();

    // Local state
    const [search, setSearch] = useState("");
    const [underlyingFilter, setUnderlyingFilter] = useState<string | null>(null);
    const [sortField, setSortField] = useState<string | null>(null);
    const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

    // Data fetching
    const { data, isLoading, refetch, isFetching } = useQuery({
        queryKey: ["warrants"],
        queryFn: async () => {
            const response = await apiClient.get<WarrantListResponse>(endpoints.warrants.list());
            return response.data;
        },
        refetchInterval: getRefetchInterval(pollingIntervals.marketData),
        staleTime: 30000,
    });

    // Underlying options for filter
    const underlyingOptions = useMemo(() => {
        if (!data?.underlying) return [];
        return Object.keys(data.underlying).map((symbol) => ({
            value: symbol,
            label: symbol,
        }));
    }, [data?.underlying]);

    // Filtered and sorted data
    const filteredWarrants = useMemo(() => {
        if (!data?.warrants) return [];
        let warrants = [...data.warrants];

        // Filter by search
        if (search) {
            const searchUpper = search.toUpperCase();
            warrants = warrants.filter(
                (w) =>
                    w.symbol.includes(searchUpper) || w.underlying_symbol.includes(searchUpper)
            );
        }

        // Filter by underlying
        if (underlyingFilter) {
            warrants = warrants.filter((w) => w.underlying_symbol === underlyingFilter);
        }

        // Sort
        if (sortField) {
            warrants.sort((a, b) => {
                const aVal = a[sortField as keyof WarrantItem] as number;
                const bVal = b[sortField as keyof WarrantItem] as number;
                return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
            });
        }

        return warrants;
    }, [data?.warrants, search, underlyingFilter, sortField, sortOrder]);

    // Memoized columns
    const columns = useMemo(
        () => [
            {
                title: "Mã CW",
                dataIndex: "symbol",
                key: "symbol",
                width: 100,
                fixed: "left" as const,
                render: (symbol: string, record: WarrantItem) => (
                    <Link
                        href={`/analysis/${symbol}`}
                        className={`font-semibold ${getPriceColorClass(record.change)} hover:opacity-80`}
                    >
                        {symbol}
                    </Link>
                ),
            },
            {
                title: "CP Mẹ",
                dataIndex: "underlying_symbol",
                key: "underlying_symbol",
                width: 80,
                render: (symbol: string) => (
                    <Link href={`/analysis/${symbol}`} className="text-blue-600 hover:underline">
                        {symbol}
                    </Link>
                ),
            },
            {
                title: "TCPH",
                dataIndex: "issuer_name",
                key: "issuer_name",
                width: 80,
                ellipsis: true,
            },
            {
                title: "Giá CW",
                dataIndex: "current_price",
                key: "current_price",
                width: 80,
                align: "right" as const,
                render: (price: number, record: WarrantItem) => (
                    <span className={getPriceColorClass(record.change)}>{formatVND(price)}</span>
                ),
            },
            {
                title: "+/-",
                dataIndex: "change_percent",
                key: "change_percent",
                width: 80,
                align: "right" as const,
                sorter: true,
                render: (percent: number) => (
                    <span className={getPriceColorClass(percent)}>
                        {percent > 0 ? "+" : ""}
                        {percent.toFixed(2)}%
                    </span>
                ),
            },
            {
                title: "KL",
                dataIndex: "volume",
                key: "volume",
                width: 80,
                align: "right" as const,
                sorter: true,
                render: (vol: number) => formatVolume(vol),
            },
            {
                title: "Giá TH",
                dataIndex: "exercise_price",
                key: "exercise_price",
                width: 80,
                align: "right" as const,
                render: (price: number) => formatVND(price),
            },
            {
                title: "Tỷ lệ",
                dataIndex: "exercise_ratio",
                key: "exercise_ratio",
                width: 70,
                align: "right" as const,
                render: (ratio: number) => ratio.toFixed(2),
            },
            {
                title: "Ngày ĐH",
                dataIndex: "maturity_date",
                key: "maturity_date",
                width: 100,
            },
            {
                title: "Còn lại",
                dataIndex: "days_to_maturity",
                key: "days_to_maturity",
                width: 80,
                align: "right" as const,
                sorter: true,
                render: (days: number) => (
                    <Tag color={days <= 30 ? "red" : days <= 60 ? "orange" : "green"}>
                        {days} ngày
                    </Tag>
                ),
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

    const handleUnderlyingChange = useCallback((value: string | null) => {
        setUnderlyingFilter(value);
    }, []);

    const handleSortChange = useCallback((value: string | null) => {
        setSortField(value);
    }, []);

    const handleViewScreener = useCallback(() => {
        if (onViewScreener) {
            onViewScreener();
        } else {
            router.push("/warrants");
        }
    }, [onViewScreener, router]);

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
                    placeholder="Tìm mã CW hoặc CP mẹ..."
                    prefix={<SearchOutlined className="text-gray-400" />}
                    value={search}
                    onChange={handleSearchChange}
                    style={{ width: 200 }}
                    allowClear
                />
                <Select
                    placeholder="Lọc theo CP mẹ"
                    style={{ width: 120 }}
                    allowClear
                    value={underlyingFilter}
                    onChange={handleUnderlyingChange}
                    options={underlyingOptions}
                    showSearch
                />
                <Select
                    placeholder="Sắp xếp"
                    style={{ width: 140 }}
                    allowClear
                    value={sortField}
                    onChange={handleSortChange}
                    options={SORT_OPTIONS}
                />
                <Button icon={<ReloadOutlined spin={isFetching} />} onClick={() => refetch()}>
                    Làm mới
                </Button>
                <Button type="primary" onClick={handleViewScreener}>
                    Screener chi tiết
                </Button>
                <ExportButtons
                    data={filteredWarrants as unknown as Record<string, unknown>[]}
                    columns={EXPORT_COLUMNS}
                    filename="warrants_list"
                />
                <Text type="secondary">
                    {filteredWarrants.length} / {data?.total || 0} CW
                </Text>
            </div>

            {/* Table */}
            <Table
                columns={columns}
                dataSource={filteredWarrants}
                rowKey="symbol"
                loading={isLoading}
                size="small"
                scroll={{ x: 1000, y: 500 }}
                pagination={{
                    pageSize: 50,
                    showSizeChanger: true,
                    pageSizeOptions: ["20", "50", "100"],
                    showTotal: (total) => `${total} CW`,
                }}
                onChange={handleTableChange}
            />
        </div>
    );
});
