"use client";

import React from "react";
import { InputNumber, Button, Tooltip, Tag, Typography } from "antd";
import { DeleteOutlined, InfoCircleOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { formatVND, formatPercent } from "@/utils";
import { AppColors } from "@/utils/theme";
import type { FeeSettings } from "@/stores/useWarrantStore";
import type { ScenarioRow } from "@/types";

const { Text } = Typography;

// Re-export for convenience
export type { ScenarioRow };

// ============================================
// Shared Column Renderers
// ============================================

const RoiCell = React.memo(function RoiCell({
    value,
    isProfit,
}: {
    value: number;
    isProfit: boolean;
}) {
    const absValue = Math.abs(value);
    const barWidth = Math.min(absValue, 100);
    
    // Use inline styles for consistent colors in both themes
    const tagStyle = {
        backgroundColor: isProfit ? 'rgba(22, 163, 74, 0.15)' : 'rgba(220, 38, 38, 0.15)',
        color: isProfit ? '#16a34a' : '#dc2626',
        border: `1px solid ${isProfit ? 'rgba(22, 163, 74, 0.3)' : 'rgba(220, 38, 38, 0.3)'}`,
    };
    
    return (
        <div className="space-y-1">
            <div className="flex items-center justify-end gap-2">
                <Tag className="font-semibold m-0 dark:!bg-transparent" style={tagStyle}>
                    {formatPercent(value)}
                </Tag>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                <div
                    className="h-1.5 rounded-full transition-all"
                    style={{ width: `${barWidth}%`, backgroundColor: isProfit ? '#16a34a' : '#dc2626' }}
                />
            </div>
        </div>
    );
});

const ProfitCell = React.memo(function ProfitCell({
    value,
    isProfit,
}: {
    value: number;
    isProfit: boolean;
}) {
    const bgClass = isProfit
        ? "!bg-emerald-500 !text-white !border-emerald-600 dark:!bg-emerald-900/40 dark:!text-emerald-300 dark:!border-emerald-700"
        : "!bg-rose-500 !text-white !border-rose-600 dark:!bg-rose-900/40 dark:!text-rose-300 dark:!border-rose-700";

    return (
        <div
            className={`px-2 py-1 rounded font-bold text-right inline-block min-w-[90px] border ${bgClass}`}
        >
            {value >= 0 ? "+" : ""}{formatVND(value)}
        </div>
    );
});

// ============================================
// Column Generators
// ============================================

interface ColumnGeneratorParams {
    feeSettings: FeeSettings;
    onUpdateScenario: (id: string, data: { sellPrice: number }) => void;
    onRemoveScenario: (id: string) => void;
}

/**
 * Generate columns for WARRANT scenarios
 */
export function getWarrantScenarioColumns({
    feeSettings,
    onUpdateScenario,
    onRemoveScenario,
}: ColumnGeneratorParams): ColumnsType<ScenarioRow> {
    return [
        {
            title: "Giá bán",
            dataIndex: "sellPrice",
            key: "sellPrice",
            width: 130,
            render: (price: number, record: ScenarioRow) => (
                <InputNumber
                    value={price}
                    onChange={(value) => value && onUpdateScenario(record.id, { sellPrice: value })}
                    formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                    parser={(value) => Number(value?.replace(/,/g, ""))}
                    min={0}
                    className="w-full"
                    size="small"
                />
            ),
        },
        {
            title: "Doanh thu",
            dataIndex: "grossRevenue",
            key: "grossRevenue",
            align: "right",
            render: (value: number) => (
                <Text className="text-slate-600">{formatVND(value)}</Text>
            ),
        },
        {
            title: (
                <Tooltip title={`Phí bán ${feeSettings.sellFeePercent}%`}>
                    <span>Phí bán <InfoCircleOutlined className="text-gray-400" /></span>
                </Tooltip>
            ),
            dataIndex: "sellFee",
            key: "sellFee",
            align: "right",
            render: (value: number) => <Text type="danger">-{formatVND(value)}</Text>,
        },
        {
            title: (
                <Tooltip title={`Thuế bán ${feeSettings.sellTaxPercent}%`}>
                    <span>Thuế <InfoCircleOutlined className="text-gray-400" /></span>
                </Tooltip>
            ),
            dataIndex: "sellTax",
            key: "sellTax",
            align: "right",
            render: (value: number) => <Text type="danger">-{formatVND(value)}</Text>,
        },
        {
            title: "Thu ròng",
            dataIndex: "netRevenue",
            key: "netRevenue",
            align: "right",
            render: (value: number) => <Text strong>{formatVND(value)}</Text>,
        },
        {
            title: "Lợi nhuận",
            dataIndex: "profit",
            key: "profit",
            align: "right",
            render: (value: number, record: ScenarioRow) => (
                <ProfitCell value={value} isProfit={record.isProfit} />
            ),
        },
        {
            title: "ROI",
            dataIndex: "profitPercent",
            key: "profitPercent",
            align: "right",
            width: 140,
            render: (value: number, record: ScenarioRow) => (
                <RoiCell value={value} isProfit={record.isProfit} />
            ),
        },
        {
            title: "",
            key: "action",
            width: 50,
            render: (_: unknown, record: ScenarioRow) => (
                <Tooltip title="Xóa kịch bản">
                    <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined className="dark:!text-red-400" />}
                        size="small"
                        onClick={() => onRemoveScenario(record.id)}
                        className="hover:!bg-red-50 dark:hover:!bg-red-900/30"
                    />
                </Tooltip>
            ),
        },
    ];
}

/**
 * Generate columns for STOCK scenarios
 */
export function getStockScenarioColumns({
    feeSettings,
    onUpdateScenario,
    onRemoveScenario,
}: ColumnGeneratorParams): ColumnsType<ScenarioRow> {
    return [
        {
            title: "Giá bán",
            dataIndex: "sellPrice",
            key: "sellPrice",
            width: 130,
            render: (price: number, record: ScenarioRow) => (
                <InputNumber
                    value={price}
                    onChange={(value) => value && onUpdateScenario(record.id, { sellPrice: value })}
                    formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                    parser={(value) => Number(value?.replace(/,/g, ""))}
                    min={0}
                    className="w-full"
                    size="small"
                />
            ),
        },
        {
            title: (
                <Tooltip title="Giá cần đạt để hòa vốn (đã tính phí)">
                    <span>Hòa vốn <InfoCircleOutlined className="text-gray-400" /></span>
                </Tooltip>
            ),
            dataIndex: "breakEvenPrice",
            key: "breakEvenPrice",
            align: "right",
            render: (value: number) => (
                <Text type="secondary">{formatVND(value)}</Text>
            ),
        },
        {
            title: "Doanh thu",
            dataIndex: "grossRevenue",
            key: "grossRevenue",
            align: "right",
            render: (value: number) => (
                <Text className="text-slate-600">{formatVND(value)}</Text>
            ),
        },
        {
            title: (
                <Tooltip title={`Phí: ${feeSettings.sellFeePercent}% + Thuế: ${feeSettings.sellTaxPercent}%`}>
                    <span>Phí + Thuế <InfoCircleOutlined className="text-gray-400" /></span>
                </Tooltip>
            ),
            key: "fees",
            align: "right",
            render: (_: unknown, record: ScenarioRow) => (
                <Text type="danger">-{formatVND(record.sellFee + record.sellTax)}</Text>
            ),
        },
        {
            title: "Thu ròng",
            dataIndex: "netRevenue",
            key: "netRevenue",
            align: "right",
            render: (value: number) => <Text strong>{formatVND(value)}</Text>,
        },
        {
            title: "Lợi nhuận",
            dataIndex: "profit",
            key: "profit",
            align: "right",
            render: (value: number, record: ScenarioRow) => (
                <ProfitCell value={value} isProfit={record.isProfit} />
            ),
        },
        {
            title: "ROI",
            dataIndex: "profitPercent",
            key: "profitPercent",
            align: "right",
            width: 140,
            render: (value: number, record: ScenarioRow) => (
                <RoiCell value={value} isProfit={record.isProfit} />
            ),
        },
        {
            title: "",
            key: "action",
            width: 50,
            render: (_: unknown, record: ScenarioRow) => (
                <Tooltip title="Xóa kịch bản">
                    <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined className="dark:!text-red-400" />}
                        size="small"
                        onClick={() => onRemoveScenario(record.id)}
                        className="hover:!bg-red-50 dark:hover:!bg-red-900/30"
                    />
                </Tooltip>
            ),
        },
    ];
}

/**
 * Hook to get appropriate columns based on asset type
 */
export function useScenarioColumns(
    isWarrant: boolean,
    feeSettings: FeeSettings,
    onUpdateScenario: (id: string, data: { sellPrice: number }) => void,
    onRemoveScenario: (id: string) => void
): ColumnsType<ScenarioRow> {
    const params = { feeSettings, onUpdateScenario, onRemoveScenario };
    return isWarrant
        ? getWarrantScenarioColumns(params)
        : getStockScenarioColumns(params);
}
