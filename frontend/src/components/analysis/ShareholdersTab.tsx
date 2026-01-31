"use client";

import React, { useEffect, useRef } from "react";
import { Card, Table, Spin, Typography, Tag, Empty, Row, Col } from "antd";
import type { ColumnsType } from "antd/es/table";
import { createChart } from "lightweight-charts";
import { useShareholders, useShareholderSummary, useChartColors } from "@/hooks";
import type { ShareholderDetail } from "@/types/company";
import { AppColors } from "@/utils/theme";

const { Text, Title } = Typography;

export interface ShareholdersTabProps {
    symbol: string;
}

/**
 * ShareholdersTab - Displays shareholders list and structure pie chart
 * 
 * Left: Shareholder detail list (individual/corporate)
 * Right: Pie chart showing foreign/state/other percentages
 */
export const ShareholdersTab = React.memo(function ShareholdersTab({
    symbol,
}: ShareholdersTabProps) {
    const { data: shareholders, isLoading: loadingShareholders } = useShareholders(symbol);
    const { data: summary, isLoading: loadingSummary } = useShareholderSummary(symbol);
    const chartRef = useRef<HTMLCanvasElement>(null);

    // Theme colors
    const colors = useChartColors();

    const columns: ColumnsType<ShareholderDetail> = [
        {
            title: "Tên",
            dataIndex: "name",
            key: "name",
            width: 250,
            render: (name, record) => (
                <div>
                    <Text strong style={{ color: colors.textColor }}>{name}</Text>
                    <div>
                        <Tag color={record.type === "I" ? "green" : "blue"}>
                            {record.type === "I" ? "Cá nhân" : "Tổ chức"}
                        </Tag>
                    </div>
                </div>
            ),
        },
        {
            title: "Số lượng",
            dataIndex: "quantity",
            key: "quantity",
            width: 120,
            align: "right",
            render: (val) => (val / 1e6).toFixed(2) + "M",
        },
        {
            title: "Tỷ lệ",
            dataIndex: "percentage",
            key: "percentage",
            width: 100,
            align: "right",
            render: (val) => (val * 100).toFixed(2) + "%",
        },
    ];

    // Draw modern pie chart using Canvas
    useEffect(() => {
        if (!chartRef.current || !summary) return;

        const ctx = chartRef.current.getContext("2d");
        if (!ctx) {
            console.error("Could not get 2D context for Shareholders chart");
            return;
        }

        const foreign = parseFloat(summary.foreignerPercentage) * 100;
        const state = parseFloat(summary.statePercentage) * 100;
        const other = parseFloat(summary.otherPercentage) * 100;

        // Premium color palette with gradients
        const data = [
            { label: "Nước ngoài", value: foreign, color: "#6366f1", gradient: "#a5b4fc" }, // Indigo
            { label: "Nhà nước", value: state, color: "#f97316", gradient: "#fdba74" }, // Orange
            { label: "Khác", value: other, color: "#10b981", gradient: "#6ee7b7" }, // Emerald
        ].filter(d => d.value > 0);

        // Clear canvas
        const width = 300;
        const height = 300;
        ctx.clearRect(0, 0, width, height);

        // Chart dimensions
        const centerX = width / 2;
        const centerY = height / 2;
        const outerRadius = 110;
        const innerRadius = 60;
        let startAngle = -Math.PI / 2;

        // Draw shadow
        ctx.shadowColor = "rgba(0, 0, 0, 0.15)";
        ctx.shadowBlur = 15;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 5;

        // Draw pie segments
        data.forEach((segment) => {
            const sliceAngle = (segment.value / 100) * 2 * Math.PI;

            // Create gradient
            const gradient = ctx.createRadialGradient(
                centerX, centerY, innerRadius,
                centerX, centerY, outerRadius
            );
            gradient.addColorStop(0, segment.gradient);
            gradient.addColorStop(1, segment.color);

            ctx.beginPath();
            ctx.moveTo(
                centerX + innerRadius * Math.cos(startAngle),
                centerY + innerRadius * Math.sin(startAngle)
            );
            ctx.arc(centerX, centerY, outerRadius, startAngle, startAngle + sliceAngle);
            ctx.arc(centerX, centerY, innerRadius, startAngle + sliceAngle, startAngle, true);
            ctx.closePath();
            ctx.fillStyle = gradient;
            ctx.fill();

            // Draw label on arc
            if (segment.value > 5) { // Only show label if segment is large enough
                const midAngle = startAngle + sliceAngle / 2;
                const labelRadius = (outerRadius + innerRadius) / 2 + 5;
                const labelX = centerX + labelRadius * Math.cos(midAngle);
                const labelY = centerY + labelRadius * Math.sin(midAngle);

                ctx.shadowColor = "transparent";
                ctx.fillStyle = "#fff"; 
                ctx.font = "bold 12px sans-serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(`${segment.value.toFixed(0)}%`, labelX, labelY);
                ctx.shadowColor = "rgba(0, 0, 0, 0.15)";
            }

            startAngle += sliceAngle;
        });

        // Remove shadow for center circle
        ctx.shadowColor = "transparent";

        // Draw center circle (donut hole) with gradient
        const centerGradient = ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, innerRadius
        );
        centerGradient.addColorStop(0, colors.background);
        centerGradient.addColorStop(1, colors.background); // Using simple background for now to blend in

        ctx.beginPath();
        ctx.arc(centerX, centerY, innerRadius - 2, 0, 2 * Math.PI);
        ctx.fillStyle = centerGradient;
        ctx.fill();

        // Draw center text
        ctx.fillStyle = colors.textColor;
        ctx.font = "bold 14px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Cơ cấu", centerX, centerY - 8);
        ctx.font = "12px sans-serif";
        ctx.fillStyle = colors.textColor; // Muted text? Need helper. Using textColor for now.
        ctx.fillText("cổ đông", centerX, centerY + 10);

    }, [summary, colors]);

    if (loadingShareholders || loadingSummary) {
        return (
            <div className="flex items-center justify-center h-48">
                <Spin size="large" />
            </div>
        );
    }

    return (
        <Card variant="borderless" className="h-full">
            <Row gutter={16}>
                {/* Left: Shareholder list */}
                <Col xs={24} lg={14}>
                    <Text strong className="mb-3 block">
                        Cổ đông lớn ({shareholders?.length || 0})
                    </Text>
                    {shareholders && shareholders.length > 0 ? (
                        <Table
                            dataSource={shareholders}
                            columns={columns}
                            rowKey={(record) => record.symbol + record.name}
                            size="small"
                            pagination={{ pageSize: 8 }}
                            scroll={{ y: 300, x: "max-content" }}
                        />
                    ) : (
                        <Empty description="Không có thông tin cổ đông" />
                    )}
                </Col>

                {/* Right: Pie chart */}
                <Col xs={24} lg={10}>
                    <Text strong className="mb-3 block">Cơ cấu cổ đông</Text>
                    {summary ? (
                        <div className="flex flex-col items-center">
                            <canvas ref={chartRef} width={280} height={280} />
                            <div className="flex gap-4 mt-2">
                                <div className="flex items-center gap-1">
                                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                                    <Text className="text-xs">
                                        Nước ngoài ({(parseFloat(summary.foreignerPercentage) * 100).toFixed(1)}%)
                                    </Text>
                                </div>
                                {parseFloat(summary.statePercentage) > 0 && (
                                    <div className="flex items-center gap-1">
                                        <div className="w-3 h-3 rounded-full bg-red-500" />
                                        <Text className="text-xs">
                                            Nhà nước ({(parseFloat(summary.statePercentage) * 100).toFixed(1)}%)
                                        </Text>
                                    </div>
                                )}
                                <div className="flex items-center gap-1">
                                    <div className="w-3 h-3 rounded-full bg-green-500" />
                                    <Text className="text-xs">
                                        Khác ({(parseFloat(summary.otherPercentage) * 100).toFixed(1)}%)
                                    </Text>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <Empty description="Không có dữ liệu" />
                    )}
                </Col>
            </Row>
        </Card>
    );
});

export default ShareholdersTab;
