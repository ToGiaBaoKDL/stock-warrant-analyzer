"use client";

import React, { useEffect, useRef, useState } from "react";
import { Card, Segmented, Spin, Typography } from "antd";
import {
    createChart,
    CandlestickSeries,
    LineSeries,
    AreaSeries,
    IChartApi,
    CandlestickData,
    LineData,
    AreaData,
    Time,
    UTCTimestamp,
    ISeriesApi
} from "lightweight-charts";
import { useStockHistory, type ChartResolution, useChartColors } from "@/hooks";
import { AppColors } from "@/utils/theme";

const { Text } = Typography;

export interface StockChartTabProps {
    /** Stock or warrant symbol */
    symbol: string;
}

const RESOLUTION_OPTIONS = [
    { value: "1", label: "1p" },
    { value: "5", label: "5p" },
    { value: "15", label: "15p" },
    { value: "30", label: "30p" },
    { value: "60", label: "1h" },
    { value: "1D", label: "1D" },
];

const CHART_TYPES = [
    { value: "candlestick", label: "Nến" },
    { value: "line", label: "Đường" },
    { value: "area", label: "Vùng" },
];

/**
 * StockChartTab - Interactive candlestick chart using Lightweight Charts
 * 
 * Features:
 * - Resolution selector (1m, 5m, 15m, 30m, 1h, 1D)
 * - Candlestick chart with OHLCV data
 * - Auto-resize on window change
 * - Vietnamese color scheme (green up, red down)
 */
export const StockChartTab = React.memo(function StockChartTab({
    symbol,
}: StockChartTabProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<"Candlestick" | "Line" | "Area"> | null>(null);

    // State
    const [resolution, setResolution] = useState<ChartResolution>("1D");
    const [chartType, setChartType] = useState<"candlestick" | "line" | "area">("candlestick");
    // Infinite scroll state: undefined = use backend default
    const [days, setDays] = useState<number | undefined>(undefined);

    // Theme colors
    const colors = useChartColors();

    // Atomic handlers
    const handleResolutionChange = (val: ChartResolution) => {
        setResolution(val);
        setDays(undefined); // Reset immediately: critical for avoiding huge data requests on small resolutions
    };

    const handleChartTypeChange = (val: any) => {
        setChartType(val);
    };

    // Reset when symbol changes
    useEffect(() => {
        setDays(undefined);
    }, [symbol]);

    const { data, isLoading, isFetching, error } = useStockHistory(symbol, { resolution, days });

    // Refs to track latest state for non-reactive callbacks (avoiding stale closures)
    const stateRef = useRef({
        resolution,
        isFetching,
        data,
        days
    });

    // Update refs whenever state changes
    useEffect(() => {
        stateRef.current = { resolution, isFetching, data, days };
    }, [resolution, isFetching, data, days]);

    // Initialize and update chart
    useEffect(() => {
        if (!chartContainerRef.current || (!data?.c && !isLoading)) {
            return;
        }

        // Create new chart if doesn't exist
        if (!chartRef.current) {
            const chart = createChart(chartContainerRef.current, {
                width: chartContainerRef.current.clientWidth,
                height: 400,
                layout: {
                    background: { color: colors.background },
                    textColor: colors.textColor,
                },
                grid: {
                    vertLines: { color: colors.gridColor },
                    horzLines: { color: colors.gridColor },
                },
                crosshair: {
                    mode: 1, // Crosshair mode
                    vertLine: {
                        labelBackgroundColor: colors.crosshairLabel,
                    },
                    horzLine: {
                        labelBackgroundColor: colors.crosshairLabel,
                    },
                },
                timeScale: {
                    timeVisible: true,
                    secondsVisible: false,
                    borderColor: colors.borderColor,
                },
                rightPriceScale: {
                    borderColor: colors.borderColor,
                },
            });

            chartRef.current = chart;

            // Subscribe to visible logical range change for infinite scroll
            chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
                const { resolution: currentRes, isFetching: fetching, data: currentData } = stateRef.current;

                // Check if we reached the left edge (history)
                // Use a buffer (e.g. -5) to trigger fetch slightly before hitting the absolute edge
                // Ensure we are not currently fetching to avoid duplicates
                if (range && range.from < 0 && !fetching && currentData?.c && currentData.c.length > 0) {
                    // Simple heuristic to load more data
                    setDays((prev) => {
                        // Use currentRes from ref, not closure
                        const current = prev || (currentRes === "1D" ? 365 : 7);

                        // Backend limit for intraday is ~30 days
                        const isIntraday = ["1", "5", "15", "30", "60"].includes(currentRes);
                        const maxBackFill = isIntraday ? 30 : 3650; // 30 days for intraday, 10 years for daily

                        // Increase by 2x
                        const next = Math.min(current * 2, maxBackFill);

                        // Only update if we haven't reached cap
                        if (next > current) {
                            console.log(`[StockChart] Fetching history: ${next} days (Max: ${maxBackFill})`);
                            return next;
                        }
                        return current;
                    });
                }
            });
        } else {
            // Update chart options if theme colors changed
            chartRef.current.applyOptions({
                layout: {
                    background: { color: colors.background },
                    textColor: colors.textColor,
                },
                grid: {
                    vertLines: { color: colors.gridColor },
                    horzLines: { color: colors.gridColor },
                },
                timeScale: {
                    borderColor: colors.borderColor,
                },
                rightPriceScale: {
                    borderColor: colors.borderColor,
                },
            });
        }

        const chart = chartRef.current;

        // Clean up previous series
        if (seriesRef.current) {
            chart.removeSeries(seriesRef.current);
            seriesRef.current = null;
        }

        // Don't update series if no data yet (but chart frame exists)
        if (!data?.c || data.c.length === 0) return;

        // Add series based on type
        let series: ISeriesApi<"Candlestick" | "Line" | "Area">;

        // Time offset for UTC+7 (Vietnam)
        const TIME_OFFSET = 7 * 60 * 60;

        if (chartType === "candlestick") {
            series = chart.addSeries(CandlestickSeries, {
                upColor: colors.upColor,
                downColor: colors.downColor,
                borderUpColor: colors.upColor,
                borderDownColor: colors.downColor,
                wickUpColor: colors.upColor,
                wickDownColor: colors.downColor,
            });
            const candleData: CandlestickData<Time>[] = data.t.map((timestamp, i) => ({
                time: (timestamp + TIME_OFFSET) as UTCTimestamp,
                open: data.o[i],
                high: data.h[i],
                low: data.l[i],
                close: data.c[i],
            }));
            series.setData(candleData);
        } else if (chartType === "area") {
            series = chart.addSeries(AreaSeries, {
                lineColor: AppColors.primary,
                topColor: "rgba(59, 130, 246, 0.4)", // Blue with opacity
                bottomColor: "rgba(59, 130, 246, 0.0)", // Transparent
                lineWidth: 2,
            });
            const areaData: AreaData<Time>[] = data.t.map((timestamp, i) => ({
                time: (timestamp + TIME_OFFSET) as UTCTimestamp,
                value: data.c[i],
            }));
            series.setData(areaData);
        } else {
            // Line
            series = chart.addSeries(LineSeries, {
                color: AppColors.primary,
                lineWidth: 2,
            });
            const lineData: LineData<Time>[] = data.t.map((timestamp, i) => ({
                time: (timestamp + TIME_OFFSET) as UTCTimestamp,
                value: data.c[i],
            }));
            series.setData(lineData);
        }

        seriesRef.current = series;

        // Fit content only on first load or significant data change, not on incremental load
        // But for now, we fit content if we just reset 'days' (new symbol/resolution)
        if (days === undefined) {
            chart.timeScale().fitContent();
        }

        // Handle resize with ResizeObserver
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (entry.contentRect && chartRef.current) {
                    chartRef.current.applyOptions({
                        width: entry.contentRect.width,
                    });
                }
            }
        });

        if (chartContainerRef.current) {
            resizeObserver.observe(chartContainerRef.current);
        }

        return () => {
            resizeObserver.disconnect();
            // We do NOT remove chart on unmount of effect to preserve it,
            // but we do if component unmounts (handled by ref check or separate cleanup)
        };
    }, [data, isLoading, isFetching, chartType, symbol, resolution, colors]); // Add dependencies

    // Clean up chart instance on component unmount
    useEffect(() => {
        return () => {
            if (chartRef.current) {
                chartRef.current.remove();
                chartRef.current = null;
                seriesRef.current = null; // Important: Clear series ref so we don't try to remove it from a new chart instance later
            }
        };
    }, []);

    return (
        <Card variant="borderless" className="h-full">
            {/* Resolution selector */}
            <div className="mb-4 flex flex-wrap justify-between items-center gap-2">
                <div className="flex items-center gap-2">
                    <Text strong>Biểu đồ giá</Text>
                    {isFetching && !isLoading && <Spin size="small" />}
                </div>

                <div className="flex gap-2">
                    <Segmented
                        options={CHART_TYPES}
                        value={chartType}
                        onChange={handleChartTypeChange}
                        size="small"
                    />
                    <Segmented
                        options={RESOLUTION_OPTIONS}
                        value={resolution}
                        onChange={(val) => handleResolutionChange(val as ChartResolution)}
                        size="small"
                    />
                </div>
            </div>

            {/* Chart container */}
            <div className="relative">
                {isLoading && !data && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-800/80 z-10">
                        <Spin size="large" />
                    </div>
                )}

                {error || (!isLoading && (!data?.c || data.c.length < 2)) ? (
                    <div className="flex items-center justify-center h-96 text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        Không có dữ liệu biểu đồ
                    </div>
                ) : (
                    <div ref={chartContainerRef} className="w-full" style={{ height: 400 }} />
                )}
            </div>
        </Card>
    );
});

export default StockChartTab;
