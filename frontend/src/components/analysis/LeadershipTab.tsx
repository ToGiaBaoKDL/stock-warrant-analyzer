"use client";

import React from "react";
import { Card, Table, Spin, Typography, Tag, Empty, Avatar } from "antd";
import type { ColumnsType } from "antd/es/table";
import { UserOutlined } from "@ant-design/icons";
import { useLeadership } from "@/hooks";
import type { LeadershipMember } from "@/types/company";

const { Text } = Typography;

export interface LeadershipTabProps {
    symbol: string;
}

// Position level colors - more granular color scheme
const positionColors: Record<string, string> = {
    "2.1": "gold",      // Chairman, CEO, President
    "2.2": "blue",      // Vice presidents, Deputy Directors
    "2.3": "cyan",      // Department heads, Managers
    "1.1": "magenta",   // Board members
    "1.2": "purple",    // Supervisory board
};

/**
 * LeadershipTab - Displays company leadership and board members
 */
export const LeadershipTab = React.memo(function LeadershipTab({
    symbol,
}: LeadershipTabProps) {
    const { data, isLoading, error } = useLeadership(symbol);

    const columns: ColumnsType<LeadershipMember> = [
        {
            title: "Họ tên",
            dataIndex: "fullName",
            key: "fullName",
            render: (name) => (
                <div className="flex items-center gap-2">
                    <Avatar size="small" icon={<UserOutlined />} />
                    <Text strong>{name}</Text>
                </div>
            ),
        },
        {
            title: "Chức vụ",
            dataIndex: "positionName",
            key: "positionName",
            render: (position, record) => (
                <Tag color={positionColors[record.positionLevel] || "default"}>
                    {position}
                </Tag>
            ),
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
                <Empty description="Không có thông tin ban lãnh đạo" />
            </Card>
        );
    }

    return (
        <div className="h-full">
            <Text strong className="mb-3 block">Ban lãnh đạo ({data.length} người)</Text>
            <Table
                dataSource={data}
                columns={columns}
                rowKey={(record) => `${record.personId}-${record.positionName}`}
                size="small"
                pagination={{ pageSize: 10 }}
                scroll={{ y: 350, x: "max-content" }}
            />
        </div>
    );
});

export default LeadershipTab;
