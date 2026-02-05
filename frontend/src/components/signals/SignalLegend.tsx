/**
 * Signal Legend Component
 * 
 * Displays legend for signal indicators and price colors
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
            <div className="flex flex-wrap items-center gap-4 text-sm">
                <Text strong>Chú thích:</Text>
                <Space>
                    <Tag color="green">✓ Bullish</Tag>
                    <Tag color="red">✗ Bearish</Tag>
                    <Tag color="default">○ Neutral</Tag>
                </Space>
                <span className="text-gray-400">|</span>
                <Space wrap className="text-xs">
                    <Text type="secondary">
                        <b>RSI:</b> 14 ngày
                    </Text>
                    <Text type="secondary">
                        <b>MACD:</b> 12,26,9
                    </Text>
                    <Text type="secondary">
                        <b>BB:</b> 20,2
                    </Text>
                    <Text type="secondary">
                        <b>MA:</b> 20/50
                    </Text>
                    <Text type="secondary">
                        <b>MOM:</b> 10D
                    </Text>
                </Space>
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm border-t pt-2">
                <Text strong>Màu giá:</Text>
                <Space>
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
