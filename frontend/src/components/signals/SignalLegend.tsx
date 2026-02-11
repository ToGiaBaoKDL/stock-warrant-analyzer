/**
 * Signal Legend Component
 * 
 * Displays legend for the 3-Layer Funnel signal system
 */

import React, { memo } from "react";
import { Card, Tag, Space, Typography } from "antd";

const { Text } = Typography;

/**
 * Signal Legend - Memoized since it never changes
 */
export const SignalLegend = memo(function SignalLegend() {
    return (
        <Card size="small" className="mt-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                <Text strong>Chỉ báo:</Text>
                <Space wrap>
                    <Tag color="green">+ Tăng</Tag>
                    <Tag color="red">- Giảm</Tag>
                    <Tag color="default">o Trung lập</Tag>
                </Space>
                <span className="text-gray-300 dark:text-gray-600 hidden sm:inline">│</span>
                <Space wrap className="text-xs">
                    <Text type="secondary"><b>RSI:</b> 14D</Text>
                    <Text type="secondary"><b>MACD:</b> 12,26,9</Text>
                    <Text type="secondary"><b>BB:</b> 20,2σ</Text>
                    <Text type="secondary"><b>ADX:</b> 14D</Text>
                    <Text type="secondary"><b>RVOL:</b> 20D avg</Text>
                </Space>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-sm border-t pt-2">
                <Text strong>Xu hướng:</Text>
                <Space wrap size={4}>
                    <Tag color="green" className="text-xs">Up Mạnh</Tag>
                    <Tag color="lime" className="text-xs">Up Yếu</Tag>
                    <Tag color="red" className="text-xs">Down</Tag>
                    <Tag color="default" className="text-xs">Sideway</Tag>
                    <Tag color="cyan" className="text-xs">Sàn</Tag>
                </Space>
                <span className="text-gray-300 dark:text-gray-600 hidden sm:inline">│</span>
                <Text strong>Màu giá:</Text>
                <Space wrap size={4}>
                    <span style={{ color: "var(--color-ceiling)" }}>■ Trần</span>
                    <span style={{ color: "var(--color-up)" }}>■ Tăng</span>
                    <span style={{ color: "var(--color-ref)" }}>■ TC</span>
                    <span style={{ color: "var(--color-down)" }}>■ Giảm</span>
                    <span style={{ color: "var(--color-floor)" }}>■ Sàn</span>
                </Space>
            </div>
        </Card>
    );
});

export default SignalLegend;
