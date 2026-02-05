"use client";

import React from "react";
import { InputNumber, Button, Tooltip, Typography } from "antd";
import { DeleteOutlined, InfoCircleOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { formatVND } from "@/utils";
import { AppColors } from "@/utils/theme";
import { RoiCell, ProfitCell } from "@/components/common";
import type { FeeSettings } from "@/stores/useWarrantStore";
import type { ScenarioRow } from "@/types";

const { Text } = Typography;

// Re-export for convenience
export type { ScenarioRow };

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
