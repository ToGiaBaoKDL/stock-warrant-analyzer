"use client";

import React, { useEffect, useRef } from "react";
import { Card, Spin, Typography, Row, Col, Empty } from "antd";
import { useCapDividend, useChartColors } from "@/hooks";

const { Text, Title } = Typography;

export interface CapDividendTabProps {
    symbol: string;
}

/**
 * CapDividendTab - Displays capital and dividend history charts
 * 
 * Shows bar charts with trend lines for:
 * - Total Assets by Year
 * - Cash Dividend per Share by Year
 */
export const CapDividendTab = React.memo(function CapDividendTab({
    symbol,
}: CapDividendTabProps) {
    const { data, isLoading, error } = useCapDividend(symbol);

    // Theme colors
    const colors = useChartColors();

    const assetCanvasRef = useRef<HTMLCanvasElement>(null);
    const dividendCanvasRef = useRef<HTMLCanvasElement>(null);
    // Responsive canvas handling
    const [containerWidth, setContainerWidth] = React.useState(0);

    // Use ref + effect for responsive canvas sizing
    const divRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!divRef.current) return;

        // Immediate measure
        if (divRef.current.clientWidth > 0) {
            setContainerWidth(divRef.current.clientWidth);
        }

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (entry.contentRect && entry.contentRect.width > 0) {
                    setContainerWidth(entry.contentRect.width);
                }
            }
        });

        resizeObserver.observe(divRef.current);

        return () => resizeObserver.disconnect();
    }, []); // Empty dependency array is fine as divRef is stable

    // Draw asset chart
    useEffect(() => {
        const effectiveWidth = containerWidth || 500;

        if (!data) {
            return;
        }

        if (!assetCanvasRef.current || !data?.assetList || data.assetList.length === 0) return;

        const ctx = assetCanvasRef.current.getContext("2d");
        if (!ctx) return;

        const assets = data.assetList
            .slice(0, 10) // Last 10 years
            .reverse();

        const values = assets.map(a => Number(a.asset) / 1e12); // Convert to trillion
        const maxVal = Math.max(...values) * 1.2;

        const width = effectiveWidth;
        const height = 250; // Increased height
        const padding = { top: 30, right: 30, bottom: 30, left: 40 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        // Dynamic bar width based on container
        const barWidth = Math.min(60, (chartWidth / assets.length) - 20);

        // Resize canvas
        assetCanvasRef.current.width = width;
        assetCanvasRef.current.height = height;

        ctx.clearRect(0, 0, width, height);

        // Draw grid lines
        ctx.strokeStyle = colors.borderColor;
        ctx.lineWidth = 1;
        const gridLines = 5;
        for (let i = 0; i <= gridLines; i++) {
            const y = padding.top + (chartHeight / gridLines) * i;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();

            // Y-axis labels
            ctx.fillStyle = colors.textColor;
            ctx.font = "10px sans-serif";
            ctx.textAlign = "right";
            const val = maxVal - (maxVal / gridLines) * i;
            ctx.fillText(val.toFixed(0), padding.left - 5, y + 3);
        }

        // Draw bars
        assets.forEach((item, i) => {
            // Calculate center position for each slot
            const slotWidth = chartWidth / assets.length;
            const xCenter = padding.left + slotWidth * i + slotWidth / 2;
            const x = xCenter - barWidth / 2;

            const barHeight = (values[i] / maxVal) * chartHeight;
            const y = height - padding.bottom - barHeight;

            // Bar with gradient
            const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
            gradient.addColorStop(0, "#3b82f6"); // Blue 500
            gradient.addColorStop(1, "#93c5fd"); // Blue 300

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.roundRect(x, y, barWidth, barHeight, [4, 4, 0, 0]);
            ctx.fill();

            // Year label
            ctx.fillStyle = colors.textColor;
            ctx.font = "bold 11px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(item.year, xCenter, height - 10);

            // Value label on top
            ctx.fillStyle = colors.textColor; // Adapt to theme
            ctx.font = "bold 10px sans-serif";
            ctx.fillText(values[i].toFixed(0), xCenter, y - 5);
        });

        // Draw trend line
        ctx.beginPath();
        const lineGradient = ctx.createLinearGradient(padding.left, 0, width - padding.right, 0);
        lineGradient.addColorStop(0, "#10b981");
        lineGradient.addColorStop(1, "#34d399");
        ctx.strokeStyle = lineGradient;
        ctx.lineWidth = 3;

        assets.forEach((item, i) => {
            const slotWidth = chartWidth / assets.length;
            const x = padding.left + slotWidth * i + slotWidth / 2;
            const y = height - padding.bottom - (values[i] / maxVal) * chartHeight;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Draw dots
        assets.forEach((item, i) => {
            const slotWidth = chartWidth / assets.length;
            const x = padding.left + slotWidth * i + slotWidth / 2;
            const y = height - padding.bottom - (values[i] / maxVal) * chartHeight;

            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fillStyle = colors.background; // Match bg
            ctx.fill();
            ctx.strokeStyle = "#10b981";
            ctx.lineWidth = 2;
            ctx.stroke();
        });

    }, [data, containerWidth, colors]);

    // Draw dividend chart
    useEffect(() => {
        const effectiveWidth = containerWidth || 500;

        if (!data) return;

        if (!dividendCanvasRef.current || !data?.cashDividendList || data.cashDividendList.length === 0) return;

        const ctx = dividendCanvasRef.current.getContext("2d");
        if (!ctx) return;

        const dividends = data.cashDividendList
            .filter(d => Number(d.valuePershare) > 0)
            .slice(0, 10)
            .reverse();

        const width = effectiveWidth;
        const height = 250;

        // Resize canvas
        dividendCanvasRef.current.width = width;
        dividendCanvasRef.current.height = height;

        if (dividends.length === 0) {
            ctx.clearRect(0, 0, width, height);
            ctx.fillStyle = colors.textColor;
            ctx.font = "14px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("Không có dữ liệu cổ tức", width / 2, height / 2);
            return;
        }

        const values = dividends.map(d => Number(d.valuePershare));
        const maxVal = Math.max(...values) * 1.2;

        const padding = { top: 30, right: 30, bottom: 30, left: 40 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;
        const barWidth = Math.min(60, (chartWidth / dividends.length) - 20);

        ctx.clearRect(0, 0, width, height);

        // Draw grid lines
        ctx.strokeStyle = colors.borderColor;
        ctx.lineWidth = 1;
        const gridLines = 5;
        for (let i = 0; i <= gridLines; i++) {
            const y = padding.top + (chartHeight / gridLines) * i;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();

            // Y-axis labels
            ctx.fillStyle = colors.textColor;
            ctx.font = "10px sans-serif";
            ctx.textAlign = "right";
            const val = maxVal - (maxVal / gridLines) * i;
            ctx.fillText(val.toFixed(0), padding.left - 5, y + 3);
        }

        // Draw bars
        dividends.forEach((item, i) => {
            const slotWidth = chartWidth / dividends.length;
            const xCenter = padding.left + slotWidth * i + slotWidth / 2;
            const x = xCenter - barWidth / 2;

            const barHeight = (values[i] / maxVal) * chartHeight;
            const y = height - padding.bottom - barHeight;

            // Bar
            const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
            gradient.addColorStop(0, "#6366f1"); // Indigo 500
            gradient.addColorStop(1, "#a5b4fc"); // Indigo 300

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.roundRect(x, y, barWidth, barHeight, [4, 4, 0, 0]);
            ctx.fill();

            // Year label
            ctx.fillStyle = colors.textColor;
            ctx.font = "bold 11px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(item.year, xCenter, height - 10);

            // Value label on top (moved up slightly to clear the line)
            ctx.fillStyle = colors.textColor; // Adapt to theme
            ctx.font = "bold 10px sans-serif";
            ctx.fillText(values[i].toLocaleString(), xCenter, y - 10);
        });

        // Draw trend line
        ctx.beginPath();
        const lineGradient = ctx.createLinearGradient(padding.left, 0, width - padding.right, 0);
        lineGradient.addColorStop(0, "#8b5cf6"); // Violet 500
        lineGradient.addColorStop(1, "#a78bfa"); // Violet 400
        ctx.strokeStyle = lineGradient;
        ctx.lineWidth = 3;

        dividends.forEach((item, i) => {
            const slotWidth = chartWidth / dividends.length;
            const x = padding.left + slotWidth * i + slotWidth / 2;
            const y = height - padding.bottom - (values[i] / maxVal) * chartHeight;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Draw dots on line
        dividends.forEach((item, i) => {
            const slotWidth = chartWidth / dividends.length;
            const x = padding.left + slotWidth * i + slotWidth / 2;
            const y = height - padding.bottom - (values[i] / maxVal) * chartHeight;

            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fillStyle = colors.background; // Match bg
            ctx.fill();
            ctx.strokeStyle = "#8b5cf6";
            ctx.lineWidth = 2;
            ctx.stroke();
        });

    }, [data, containerWidth, colors]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-48">
                <Spin size="large" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <Card variant="borderless">
                <Empty description="Không có dữ liệu vốn và cổ tức" />
            </Card>
        );
    }

    return (
        <Card variant="borderless" className="h-full">
            <div ref={divRef} className="w-full">
                <Row gutter={[16, 24]}>
                    {/* Total Assets Chart */}
                    <Col span={24}>
                        <Text strong className="mb-2 block">Tổng tài sản (nghìn tỷ VND)</Text>
                        {data.assetList && data.assetList.length > 0 ? (
                            <canvas ref={assetCanvasRef} style={{ width: '100%', height: '250px' }} />
                        ) : (
                            <Empty description="Không có dữ liệu tài sản" />
                        )}
                    </Col>

                    {/* Cash Dividend Chart */}
                    <Col span={24}>
                        <Text strong className="mb-2 block">Cổ tức tiền mặt (VND/CP)</Text>
                        <canvas ref={dividendCanvasRef} style={{ width: '100%', height: '250px' }} />
                    </Col>
                </Row>
            </div>
        </Card>
    );
});

export default CapDividendTab;
