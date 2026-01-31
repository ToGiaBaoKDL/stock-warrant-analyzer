"use client";

import React from "react";
import { Card, Table, Spin, Typography, Tag, Empty } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useSubCompanies } from "@/hooks";
import type { SubCompany } from "@/types/company";

const { Text } = Typography;

export interface SubsidiariesTabProps {
    symbol: string;
}

/**
 * SubsidiariesTab - Displays list of subsidiaries and affiliated companies
 */
export const SubsidiariesTab = React.memo(function SubsidiariesTab({
    symbol,
}: SubsidiariesTabProps) {
    const { data, isLoading, error } = useSubCompanies(symbol);

    const columns: ColumnsType<SubCompany> = [
        {
            title: "Mã",
            dataIndex: "childSymbol",
            key: "childSymbol",
            width: 90,
            fixed: "left",
            render: (val) => (
                <Text
                    style={{
                        color: "var(--color-floor)", // Cyan
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        fontFamily: "monospace"
                    }}
                >
                    {val}
                </Text>
            ),
        },
        {
            title: "Tên công ty",
            dataIndex: "childCompanyName",
            key: "childCompanyName",
            width: 280,
        },
        {
            title: "Loại",
            dataIndex: "roleName",
            key: "roleName",
            width: 120,
            render: (val) => (
                <Tag color={val === "Công ty con" ? "blue" : val === "Công ty liên kết" ? "green" : "default"}>
                    {val}
                </Tag>
            ),
        },
        {
            title: "Sở hữu",
            dataIndex: "percentage",
            key: "percentage",
            width: 80,
            align: "right",
            render: (val) => {
                // API returns values like 0.51 (meaning 51%) or 51.0 (meaning 51%)
                const numVal = Number(val);
                // If value > 1, it's already in percentage form
                const pct = numVal > 1 ? numVal : numVal * 100;
                return pct > 0 ? `${pct.toFixed(1)}%` : "-";
            },
        },
    ];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-48">
                <Spin size="large" />
            </div>
        );
    }

    if (error || !data || data.length === 0) {
        return (
            <Card variant="borderless">
                <Empty description="Không có thông tin công ty con" />
            </Card>
        );
    }

    return (
        <div className="h-full">
            <Text strong className="mb-3 block">Công ty con & Liên kết ({data.length})</Text>
            <Table
                dataSource={data}
                columns={columns}
                rowKey={(record) => record.childSymbol}
                size="small"
                pagination={{ pageSize: 10 }}
                scroll={{ y: 350, x: "max-content" }}
            />
        </div>
    );
});

export default SubsidiariesTab;
