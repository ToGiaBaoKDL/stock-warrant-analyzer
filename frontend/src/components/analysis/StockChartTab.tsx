"use client";

import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { Card, Segmented, Spin, Typography, Dropdown, Button, Space, Tooltip } from "antd";
import { LineChartOutlined, DownOutlined, ZoomInOutlined, ZoomOutOutlined, ExpandOutlined, EyeOutlined, EyeInvisibleOutlined, AimOutlined } from "@ant-design/icons";
import {
    createChart,
    CandlestickSeries,
    LineSeries,
    AreaSeries,
    HistogramSeries,
    IChartApi,
    CandlestickData,
    LineData,
    AreaData,
    HistogramData,
    Time,
    UTCTimestamp,
    ISeriesApi,
    MouseEventParams
} from "lightweight-charts";
import { useStockHistory, type ChartResolution, useChartColors } from "@/hooks";
import { AppColors } from "@/utils/theme";
import { 
    calculateSMA, 
    calculateEMA, 
    calculateBollingerBands, 
    calculateVolumeMA,
    calculateMACD,
    calculateRSI,
    calculateIchimoku,
    removeNulls,
    BB_COLORS,
    VOLUME_COLORS,
    MACD_COLORS,
    RSI_COLORS,
    RSI_LEVELS,
    ICHIMOKU_COLORS,
    type MAType 
} from "@/utils/indicators";
import { IndicatorPanel, type IndicatorSettings, DEFAULT_INDICATORS } from "./IndicatorPanel";
import type { CrosshairData } from "./chart-types";
import { TIME_OFFSET } from "./chart-types";

const { Text } = Typography;

export interface StockChartTabProps {
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
    { value: "candlestick" as const, label: "Nến" },
    { value: "line" as const, label: "Đường" },
    { value: "area" as const, label: "Vùng" },
];

/**
 * StockChartTab - Interactive candlestick chart with technical indicators
 */
export const StockChartTab = React.memo(function StockChartTab({
    symbol,
}: StockChartTabProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const volumeContainerRef = useRef<HTMLDivElement>(null);
    const macdContainerRef = useRef<HTMLDivElement>(null);
    const rsiContainerRef = useRef<HTMLDivElement>(null);
    
    const chartRef = useRef<IChartApi | null>(null);
    const volumeChartRef = useRef<IChartApi | null>(null);
    const macdChartRef = useRef<IChartApi | null>(null);
    const rsiChartRef = useRef<IChartApi | null>(null);
    
    const mainSeriesRef = useRef<ISeriesApi<"Candlestick" | "Line" | "Area"> | null>(null);
    const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
    
    // Indicator series refs
    const ma1SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
    const ma2SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
    const bbUpperSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
    const bbMiddleSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
    const bbLowerSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
    const volumeMASeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
    
    // Ichimoku refs (overlay on main chart)
    const ichimokuTenkanRef = useRef<ISeriesApi<"Line"> | null>(null);
    const ichimokuKijunRef = useRef<ISeriesApi<"Line"> | null>(null);
    const ichimokuSpanARef = useRef<ISeriesApi<"Line"> | null>(null);
    const ichimokuSpanBRef = useRef<ISeriesApi<"Line"> | null>(null);
    const ichimokuChikouRef = useRef<ISeriesApi<"Line"> | null>(null);

    // State
    const [resolution, setResolution] = useState<ChartResolution>("1D");
    const [chartType, setChartType] = useState<"candlestick" | "line" | "area">("candlestick");
    const [days, setDays] = useState<number | undefined>(undefined);
    const [indicators, setIndicators] = useState<IndicatorSettings>(DEFAULT_INDICATORS);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    
    // Crosshair legend state
    const [crosshairData, setCrosshairData] = useState<CrosshairData | null>(null);
    
    // Price line visibility state (đường nét đứt hiển thị giá hiện tại)
    const [showPriceLines, setShowPriceLines] = useState(true);
    
    // Crosshair visibility state (dấu thập khi hover)
    const [showCrosshair, setShowCrosshair] = useState(true);

    // Theme colors
    const colors = useChartColors();

    // Update crosshair visibility when toggle changes
    useEffect(() => {
        const charts = [chartRef.current, volumeChartRef.current, macdChartRef.current, rsiChartRef.current];
        charts.forEach(chart => {
            if (chart) {
                chart.applyOptions({
                    crosshair: {
                        mode: showCrosshair ? 1 : 0,
                        vertLine: { visible: showCrosshair },
                        horzLine: { visible: showCrosshair },
                    },
                });
            }
        });
    }, [showCrosshair]);

    // Handlers
    const handleResolutionChange = useCallback((val: ChartResolution) => {
        setResolution(val);
        setDays(undefined);
    }, []);

    const handleChartTypeChange = useCallback((val: "candlestick" | "line" | "area") => {
        setChartType(val);
    }, []);

    const handleIndicatorChange = useCallback((key: keyof IndicatorSettings, value: unknown) => {
        setIndicators(prev => ({ ...prev, [key]: value }));
    }, []);

    // Zoom handlers
    const handleZoomIn = useCallback(() => {
        if (!chartRef.current) return;
        const timeScale = chartRef.current.timeScale();
        const range = timeScale.getVisibleLogicalRange();
        if (range) {
            const newRange = {
                from: range.from + (range.to - range.from) * 0.25,
                to: range.to - (range.to - range.from) * 0.25,
            };
            timeScale.setVisibleLogicalRange(newRange);
        }
    }, []);

    const handleZoomOut = useCallback(() => {
        if (!chartRef.current) return;
        const timeScale = chartRef.current.timeScale();
        const range = timeScale.getVisibleLogicalRange();
        if (range) {
            const newRange = {
                from: range.from - (range.to - range.from) * 0.5,
                to: range.to + (range.to - range.from) * 0.5,
            };
            timeScale.setVisibleLogicalRange(newRange);
        }
    }, []);

    const handleResetZoom = useCallback(() => {
        if (!chartRef.current) return;
        chartRef.current.timeScale().fitContent();
    }, []);

    // Reset when symbol changes
    useEffect(() => {
        setDays(undefined);
    }, [symbol]);

    const { data, isLoading, isFetching, error } = useStockHistory(symbol, { resolution, days });

    // Calculate indicators
    const calculatedIndicators = useMemo(() => {
        if (!data?.c || data.c.length === 0) return null;

        const timestamps = data.t.map(t => (t + TIME_OFFSET) as UTCTimestamp);

        return {
            ma1: indicators.showMA1 
                ? (indicators.ma1Type === "SMA" ? calculateSMA(data.c, indicators.ma1Period) : calculateEMA(data.c, indicators.ma1Period))
                : null,
            ma2: indicators.showMA2
                ? (indicators.ma2Type === "SMA" ? calculateSMA(data.c, indicators.ma2Period) : calculateEMA(data.c, indicators.ma2Period))
                : null,
            bb: indicators.showBB
                ? calculateBollingerBands(data.c, indicators.bbPeriod, indicators.bbStdDev)
                : null,
            volumeMA: indicators.showVolume
                ? calculateVolumeMA(data.v, indicators.volumeMAPeriod)
                : null,
            macd: indicators.showMACD
                ? calculateMACD(data.c, indicators.macdFast, indicators.macdSlow, indicators.macdSignal)
                : null,
            rsi: indicators.showRSI
                ? calculateRSI(data.c, indicators.rsiPeriod)
                : null,
            ichimoku: indicators.showIchimoku
                ? calculateIchimoku(data.h, data.l, data.c, indicators.ichimokuTenkan, indicators.ichimokuKijun, indicators.ichimokuSenkouB)
                : null,
            timestamps,
        };
    }, [data, indicators]);

    // Count active indicators for badge
    const activeIndicatorCount = useMemo(() => {
        let count = 0;
        if (indicators.showMA1) count++;
        if (indicators.showMA2) count++;
        if (indicators.showBB) count++;
        if (indicators.showVolume) count++;
        if (indicators.showMACD) count++;
        if (indicators.showRSI) count++;
        if (indicators.showIchimoku) count++;
        return count;
    }, [indicators]);

    // Refs for callbacks
    const stateRef = useRef({ resolution, isFetching, data, days });
    useEffect(() => {
        stateRef.current = { resolution, isFetching, data, days };
    }, [resolution, isFetching, data, days]);

    // Initialize and update main chart
    useEffect(() => {
        if (!chartContainerRef.current || (!data?.c && !isLoading)) {
            return;
        }

        // Create main chart if doesn't exist
        if (!chartRef.current) {
            const chart = createChart(chartContainerRef.current, {
                width: chartContainerRef.current.clientWidth,
                height: 400,
                layout: {
                    background: { color: colors.background },
                    textColor: colors.textColor,
                },
                grid: {
                    vertLines: { visible: false },
                    horzLines: { visible: false },
                },
                crosshair: {
                    mode: showCrosshair ? 1 : 0,
                    vertLine: { 
                        labelBackgroundColor: colors.crosshairLabel,
                        color: colors.borderColor,
                        width: 1,
                        style: 0,
                        visible: showCrosshair,
                    },
                    horzLine: { 
                        labelBackgroundColor: colors.crosshairLabel,
                        color: colors.borderColor,
                        width: 1,
                        style: 0,
                        visible: showCrosshair,
                    },
                },
                timeScale: {
                    timeVisible: true,
                    secondsVisible: false,
                    borderColor: colors.borderColor,
                },
                rightPriceScale: { borderColor: colors.borderColor },
            });

            chartRef.current = chart;

            // Infinite scroll
            chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
                const { resolution: currentRes, isFetching: fetching, data: currentData } = stateRef.current;
                if (range && range.from < 0 && !fetching && currentData?.c && currentData.c.length > 0) {
                    setDays((prev) => {
                        const current = prev || (currentRes === "1D" ? 365 : 7);
                        const isIntraday = ["1", "5", "15", "30", "60"].includes(currentRes);
                        const maxBackFill = isIntraday ? 30 : 3650;
                        const next = Math.min(current * 2, maxBackFill);
                        return next > current ? next : current;
                    });
                }
            });

            // Crosshair move handler for legend
            chart.subscribeCrosshairMove((param: MouseEventParams) => {
                if (!param.time || !param.point) {
                    setCrosshairData(null);
                    return;
                }
                
                const { data: chartData } = stateRef.current;
                if (!chartData?.c) return;
                
                const timestamp = (param.time as number) - TIME_OFFSET;
                const index = chartData.t.findIndex(t => t === timestamp);
                
                if (index >= 0) {
                    const open = chartData.o[index];
                    const close = chartData.c[index];
                    const change = close - open;
                    const changePercent = (change / open) * 100;
                    
                    setCrosshairData({
                        time: new Date(timestamp * 1000).toLocaleString("vi-VN"),
                        open,
                        high: chartData.h[index],
                        low: chartData.l[index],
                        close,
                        volume: chartData.v[index],
                        change,
                        changePercent,
                    });
                }
            });

            // Drawing tools removed
        } else {
            chartRef.current.applyOptions({
                layout: { background: { color: colors.background }, textColor: colors.textColor },
                grid: { vertLines: { visible: false }, horzLines: { visible: false } },
                timeScale: { borderColor: colors.borderColor },
                rightPriceScale: { borderColor: colors.borderColor },
            });
        }

        const chart = chartRef.current;

        // Clean up previous series - use try/catch to handle stale refs
        const safeRemoveSeries = (seriesRef: React.MutableRefObject<ISeriesApi<"Line" | "Candlestick" | "Area" | "Histogram"> | null>) => {
            if (seriesRef.current && chart) {
                try {
                    chart.removeSeries(seriesRef.current);
                } catch {
                    // Series may have been removed already
                }
                seriesRef.current = null;
            }
        };

        safeRemoveSeries(mainSeriesRef as React.MutableRefObject<ISeriesApi<"Line" | "Candlestick" | "Area" | "Histogram"> | null>);
        safeRemoveSeries(ma1SeriesRef as React.MutableRefObject<ISeriesApi<"Line" | "Candlestick" | "Area" | "Histogram"> | null>);
        safeRemoveSeries(ma2SeriesRef as React.MutableRefObject<ISeriesApi<"Line" | "Candlestick" | "Area" | "Histogram"> | null>);
        safeRemoveSeries(bbUpperSeriesRef as React.MutableRefObject<ISeriesApi<"Line" | "Candlestick" | "Area" | "Histogram"> | null>);
        safeRemoveSeries(bbMiddleSeriesRef as React.MutableRefObject<ISeriesApi<"Line" | "Candlestick" | "Area" | "Histogram"> | null>);
        safeRemoveSeries(bbLowerSeriesRef as React.MutableRefObject<ISeriesApi<"Line" | "Candlestick" | "Area" | "Histogram"> | null>);
        // Ichimoku cleanup
        safeRemoveSeries(ichimokuTenkanRef as React.MutableRefObject<ISeriesApi<"Line" | "Candlestick" | "Area" | "Histogram"> | null>);
        safeRemoveSeries(ichimokuKijunRef as React.MutableRefObject<ISeriesApi<"Line" | "Candlestick" | "Area" | "Histogram"> | null>);
        safeRemoveSeries(ichimokuSpanARef as React.MutableRefObject<ISeriesApi<"Line" | "Candlestick" | "Area" | "Histogram"> | null>);
        safeRemoveSeries(ichimokuSpanBRef as React.MutableRefObject<ISeriesApi<"Line" | "Candlestick" | "Area" | "Histogram"> | null>);
        safeRemoveSeries(ichimokuChikouRef as React.MutableRefObject<ISeriesApi<"Line" | "Candlestick" | "Area" | "Histogram"> | null>);

        if (!data?.c || data.c.length === 0) return;

        // Add main series
        let mainSeries: ISeriesApi<"Candlestick" | "Line" | "Area">;

        if (chartType === "candlestick") {
            mainSeries = chart.addSeries(CandlestickSeries, {
                upColor: colors.upColor,
                downColor: colors.downColor,
                borderUpColor: colors.upColor,
                borderDownColor: colors.downColor,
                wickUpColor: colors.upColor,
                wickDownColor: colors.downColor,
                priceLineVisible: showPriceLines,
                lastValueVisible: true,
            });
            const candleData: CandlestickData<Time>[] = data.t.map((timestamp, i) => ({
                time: (timestamp + TIME_OFFSET) as UTCTimestamp,
                open: data.o[i],
                high: data.h[i],
                low: data.l[i],
                close: data.c[i],
            }));
            mainSeries.setData(candleData);
        } else if (chartType === "area") {
            mainSeries = chart.addSeries(AreaSeries, {
                lineColor: AppColors.primary,
                topColor: "rgba(59, 130, 246, 0.4)",
                bottomColor: "rgba(59, 130, 246, 0.0)",
                lineWidth: 2,
                priceLineVisible: showPriceLines,
                lastValueVisible: true,
            });
            const areaData: AreaData<Time>[] = data.t.map((timestamp, i) => ({
                time: (timestamp + TIME_OFFSET) as UTCTimestamp,
                value: data.c[i],
            }));
            mainSeries.setData(areaData);
        } else {
            mainSeries = chart.addSeries(LineSeries, {
                color: AppColors.primary,
                lineWidth: 2,
                priceLineVisible: showPriceLines,
                lastValueVisible: true,
            });
            const lineData: LineData<Time>[] = data.t.map((timestamp, i) => ({
                time: (timestamp + TIME_OFFSET) as UTCTimestamp,
                value: data.c[i],
            }));
            mainSeries.setData(lineData);
        }

        mainSeriesRef.current = mainSeries;

        // Add indicator overlays
        if (calculatedIndicators) {
            // MA1
            if (calculatedIndicators.ma1) {
                const { timestamps, values } = removeNulls(data.t, calculatedIndicators.ma1);
                const ma1Series = chart.addSeries(LineSeries, {
                    color: indicators.ma1Color,
                    lineWidth: 2,
                    title: `${indicators.ma1Type}(${indicators.ma1Period})`,
                    priceLineVisible: showPriceLines,
                    lastValueVisible: true,
                });
                ma1Series.setData(timestamps.map((time, i) => ({ time, value: values[i] })));
                ma1SeriesRef.current = ma1Series;
            }

            // MA2
            if (calculatedIndicators.ma2) {
                const { timestamps, values } = removeNulls(data.t, calculatedIndicators.ma2);
                const ma2Series = chart.addSeries(LineSeries, {
                    color: indicators.ma2Color,
                    lineWidth: 2,
                    title: `${indicators.ma2Type}(${indicators.ma2Period})`,
                    priceLineVisible: showPriceLines,
                    lastValueVisible: true,
                });
                ma2Series.setData(timestamps.map((time, i) => ({ time, value: values[i] })));
                ma2SeriesRef.current = ma2Series;
            }

            // Bollinger Bands
            if (calculatedIndicators.bb) {
                const { timestamps: upperT, values: upperV } = removeNulls(data.t, calculatedIndicators.bb.upper);
                const { timestamps: middleT, values: middleV } = removeNulls(data.t, calculatedIndicators.bb.middle);
                const { timestamps: lowerT, values: lowerV } = removeNulls(data.t, calculatedIndicators.bb.lower);

                const bbUpper = chart.addSeries(LineSeries, {
                    color: BB_COLORS.upper,
                    lineWidth: 1,
                    lineStyle: 2,
                    title: "BB Upper",
                    priceLineVisible: showPriceLines,
                    lastValueVisible: true,
                });
                bbUpper.setData(upperT.map((time, i) => ({ time, value: upperV[i] })));
                bbUpperSeriesRef.current = bbUpper;

                const bbMiddle = chart.addSeries(LineSeries, {
                    color: BB_COLORS.middle,
                    lineWidth: 1,
                    title: `BB(${indicators.bbPeriod})`,
                    priceLineVisible: showPriceLines,
                    lastValueVisible: true,
                });
                bbMiddle.setData(middleT.map((time, i) => ({ time, value: middleV[i] })));
                bbMiddleSeriesRef.current = bbMiddle;

                const bbLower = chart.addSeries(LineSeries, {
                    color: BB_COLORS.lower,
                    lineWidth: 1,
                    lineStyle: 2,
                    title: "BB Lower",
                    priceLineVisible: showPriceLines,
                    lastValueVisible: true,
                });
                bbLower.setData(lowerT.map((time, i) => ({ time, value: lowerV[i] })));
                bbLowerSeriesRef.current = bbLower;
            }

            // Ichimoku Cloud (overlay on main chart)
            if (calculatedIndicators.ichimoku) {
                const ichi = calculatedIndicators.ichimoku;
                
                // Tenkan-sen (Conversion Line) - Blue
                const { timestamps: tenkanT, values: tenkanV } = removeNulls(data.t, ichi.tenkanSen);
                const tenkanSeries = chart.addSeries(LineSeries, {
                    color: ICHIMOKU_COLORS.tenkanSen,
                    lineWidth: 1,
                    title: "Tenkan",
                    priceLineVisible: showPriceLines,
                    lastValueVisible: true,
                });
                tenkanSeries.setData(tenkanT.map((time, i) => ({ time, value: tenkanV[i] })));
                ichimokuTenkanRef.current = tenkanSeries;

                // Kijun-sen (Base Line) - Red
                const { timestamps: kijunT, values: kijunV } = removeNulls(data.t, ichi.kijunSen);
                const kijunSeries = chart.addSeries(LineSeries, {
                    color: ICHIMOKU_COLORS.kijunSen,
                    lineWidth: 1,
                    title: "Kijun",
                    priceLineVisible: showPriceLines,
                    lastValueVisible: true,
                });
                kijunSeries.setData(kijunT.map((time, i) => ({ time, value: kijunV[i] })));
                ichimokuKijunRef.current = kijunSeries;

                // Senkou Span A (Leading Span A) - Green dashed
                // Note: Senkou arrays are longer (length + displacement), but we only plot for available timestamps
                const { timestamps: spanAT, values: spanAV } = removeNulls(data.t, ichi.senkouSpanA.slice(0, data.t.length));
                const spanASeries = chart.addSeries(LineSeries, {
                    color: ICHIMOKU_COLORS.senkouSpanA,
                    lineWidth: 1,
                    lineStyle: 2,
                    title: "Span A",
                    priceLineVisible: showPriceLines,
                    lastValueVisible: true,
                });
                spanASeries.setData(spanAT.map((time, i) => ({ time, value: spanAV[i] })));
                ichimokuSpanARef.current = spanASeries;

                // Senkou Span B (Leading Span B) - Red dashed
                const { timestamps: spanBT, values: spanBV } = removeNulls(data.t, ichi.senkouSpanB.slice(0, data.t.length));
                const spanBSeries = chart.addSeries(LineSeries, {
                    color: ICHIMOKU_COLORS.senkouSpanB,
                    lineWidth: 1,
                    lineStyle: 2,
                    title: "Span B",
                    priceLineVisible: showPriceLines,
                    lastValueVisible: true,
                });
                spanBSeries.setData(spanBT.map((time, i) => ({ time, value: spanBV[i] })));
                ichimokuSpanBRef.current = spanBSeries;

                // Chikou Span (Lagging Span) - Green
                const { timestamps: chikouT, values: chikouV } = removeNulls(data.t, ichi.chikouSpan);
                const chikouSeries = chart.addSeries(LineSeries, {
                    color: ICHIMOKU_COLORS.chikouSpan,
                    lineWidth: 1,
                    title: "Chikou",
                    priceLineVisible: showPriceLines,
                    lastValueVisible: true,
                });
                chikouSeries.setData(chikouT.map((time, i) => ({ time, value: chikouV[i] })));
                ichimokuChikouRef.current = chikouSeries;
            }
        }

        // Horizontal lines feature removed

        if (days === undefined) {
            chart.timeScale().fitContent();
        }

        // Resize observer
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (entry.contentRect && chartRef.current) {
                    chartRef.current.applyOptions({ width: entry.contentRect.width });
                }
            }
        });
        resizeObserver.observe(chartContainerRef.current);

        return () => {
            resizeObserver.disconnect();
        };
    }, [data, chartType, colors, isLoading, days, calculatedIndicators, indicators, showPriceLines, showCrosshair]);

    // Volume chart effect
    useEffect(() => {
        if (!indicators.showVolume) {
            if (volumeChartRef.current) {
                volumeChartRef.current.remove();
                volumeChartRef.current = null;
            }
            return;
        }

        if (!volumeContainerRef.current || !data?.v) return;

        // Create volume chart if doesn't exist
        if (!volumeChartRef.current) {
            const volumeChart = createChart(volumeContainerRef.current, {
                width: volumeContainerRef.current.clientWidth,
                height: 150,
                layout: { background: { color: colors.background }, textColor: colors.textColor },
                grid: { vertLines: { visible: false }, horzLines: { visible: false } },
                timeScale: { timeVisible: true, secondsVisible: false, borderColor: colors.borderColor },
                rightPriceScale: { borderColor: colors.borderColor },
            });

            volumeChartRef.current = volumeChart;

            // Sync time scales
            if (chartRef.current) {
                chartRef.current.timeScale().subscribeVisibleLogicalRangeChange((timeRange) => {
                    if (volumeChartRef.current && timeRange) {
                        volumeChartRef.current.timeScale().setVisibleLogicalRange(timeRange);
                    }
                });
            }
        } else {
            volumeChartRef.current.applyOptions({
                layout: { background: { color: colors.background }, textColor: colors.textColor },
                grid: { vertLines: { visible: false }, horzLines: { visible: false } },
            });
        }

        const volumeChart = volumeChartRef.current;

        // Clean up previous series safely
        if (volumeSeriesRef.current) { 
            try { volumeChart.removeSeries(volumeSeriesRef.current); } catch { /* ignore */ }
            volumeSeriesRef.current = null; 
        }
        if (volumeMASeriesRef.current) { 
            try { volumeChart.removeSeries(volumeMASeriesRef.current); } catch { /* ignore */ }
            volumeMASeriesRef.current = null; 
        }

        if (!data?.v || data.v.length === 0) return;

        // Add volume histogram
        const volumeSeries = volumeChart.addSeries(HistogramSeries, {
            color: VOLUME_COLORS.neutral,
            priceFormat: { type: "volume" },
            priceLineVisible: false,
            lastValueVisible: true,
        });

        const volumeData: HistogramData<Time>[] = data.t.map((timestamp, i) => ({
            time: (timestamp + TIME_OFFSET) as UTCTimestamp,
            value: data.v[i],
            color: data.c[i] >= data.o[i] ? colors.upColor : colors.downColor,
        }));
        volumeSeries.setData(volumeData);
        volumeSeriesRef.current = volumeSeries;

        // Add volume MA
        if (calculatedIndicators?.volumeMA) {
            const { timestamps, values } = removeNulls(data.t, calculatedIndicators.volumeMA);
            const volumeMASeries = volumeChart.addSeries(LineSeries, {
                color: VOLUME_COLORS.ma,
                lineWidth: 2,
                title: `MA(${indicators.volumeMAPeriod})`,
                priceLineVisible: false,
                lastValueVisible: true,
            });
            volumeMASeries.setData(timestamps.map((time, i) => ({ time, value: values[i] })));
            volumeMASeriesRef.current = volumeMASeries;
        }

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (entry.contentRect && volumeChartRef.current) {
                    volumeChartRef.current.applyOptions({ width: entry.contentRect.width });
                }
            }
        });
        resizeObserver.observe(volumeContainerRef.current);

        return () => {
            resizeObserver.disconnect();
        };
    }, [data, indicators.showVolume, indicators.volumeMAPeriod, colors, calculatedIndicators]);

    // MACD chart effect
    useEffect(() => {
        if (!indicators.showMACD) {
            if (macdChartRef.current) {
                macdChartRef.current.remove();
                macdChartRef.current = null;
            }
            return;
        }

        if (!macdContainerRef.current || !data?.c || !calculatedIndicators?.macd) return;

        if (!macdChartRef.current) {
            const macdChart = createChart(macdContainerRef.current, {
                width: macdContainerRef.current.clientWidth,
                height: 120,
                layout: { background: { color: colors.background }, textColor: colors.textColor },
                grid: { vertLines: { visible: false }, horzLines: { visible: false } },
                timeScale: { timeVisible: true, secondsVisible: false, borderColor: colors.borderColor },
                rightPriceScale: { borderColor: colors.borderColor },
            });
            macdChartRef.current = macdChart;

            // Sync time scales
            if (chartRef.current) {
                chartRef.current.timeScale().subscribeVisibleLogicalRangeChange((timeRange) => {
                    if (macdChartRef.current && timeRange) {
                        macdChartRef.current.timeScale().setVisibleLogicalRange(timeRange);
                    }
                });
            }
        } else {
            macdChartRef.current.applyOptions({
                layout: { background: { color: colors.background }, textColor: colors.textColor },
                grid: { vertLines: { visible: false }, horzLines: { visible: false } },
            });
        }

        const macdChart = macdChartRef.current;

        // MACD Histogram
        const { timestamps: histT, values: histV } = removeNulls(data.t, calculatedIndicators.macd.histogram);
        const histSeries = macdChart.addSeries(HistogramSeries, {
            color: MACD_COLORS.histogramUp,
            priceFormat: { type: "price", precision: 2, minMove: 0.01 },
            priceLineVisible: false,
            lastValueVisible: true,
        });
        histSeries.setData(histT.map((time, i) => ({
            time: (time + TIME_OFFSET) as UTCTimestamp,
            value: histV[i],
            color: histV[i] >= 0 ? MACD_COLORS.histogramUp : MACD_COLORS.histogramDown,
        })));

        // MACD Line
        const { timestamps: macdT, values: macdV } = removeNulls(data.t, calculatedIndicators.macd.macd);
        const macdLineSeries = macdChart.addSeries(LineSeries, {
            color: MACD_COLORS.macdLine,
            lineWidth: 2,
            title: "MACD",
            priceLineVisible: false,
            lastValueVisible: true,
        });
        macdLineSeries.setData(macdT.map((time, i) => ({ time: (time + TIME_OFFSET) as UTCTimestamp, value: macdV[i] })));

        // Signal Line
        const { timestamps: sigT, values: sigV } = removeNulls(data.t, calculatedIndicators.macd.signal);
        const signalSeries = macdChart.addSeries(LineSeries, {
            color: MACD_COLORS.signalLine,
            lineWidth: 2,
            title: "Signal",
            priceLineVisible: false,
            lastValueVisible: true,
        });
        signalSeries.setData(sigT.map((time, i) => ({ time: (time + TIME_OFFSET) as UTCTimestamp, value: sigV[i] })));

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (entry.contentRect && macdChartRef.current) {
                    macdChartRef.current.applyOptions({ width: entry.contentRect.width });
                }
            }
        });
        resizeObserver.observe(macdContainerRef.current);

        return () => {
            resizeObserver.disconnect();
        };
    }, [data, indicators.showMACD, indicators.macdFast, indicators.macdSlow, indicators.macdSignal, colors, calculatedIndicators]);

    // RSI chart effect
    useEffect(() => {
        if (!indicators.showRSI) {
            if (rsiChartRef.current) {
                rsiChartRef.current.remove();
                rsiChartRef.current = null;
            }
            return;
        }

        if (!rsiContainerRef.current || !data?.c || !calculatedIndicators?.rsi) return;

        if (!rsiChartRef.current) {
            const rsiChart = createChart(rsiContainerRef.current, {
                width: rsiContainerRef.current.clientWidth,
                height: 100,
                layout: { background: { color: colors.background }, textColor: colors.textColor },
                grid: { vertLines: { visible: false }, horzLines: { visible: false } },
                timeScale: { timeVisible: true, secondsVisible: false, borderColor: colors.borderColor },
                rightPriceScale: { borderColor: colors.borderColor, scaleMargins: { top: 0.1, bottom: 0.1 } },
            });
            rsiChartRef.current = rsiChart;

            // Sync time scales
            if (chartRef.current) {
                chartRef.current.timeScale().subscribeVisibleLogicalRangeChange((timeRange) => {
                    if (rsiChartRef.current && timeRange) {
                        rsiChartRef.current.timeScale().setVisibleLogicalRange(timeRange);
                    }
                });
            }
        } else {
            rsiChartRef.current.applyOptions({
                layout: { background: { color: colors.background }, textColor: colors.textColor },
                grid: { vertLines: { visible: false }, horzLines: { visible: false } },
            });
        }

        const rsiChart = rsiChartRef.current;

        // RSI Line
        const { timestamps: rsiT, values: rsiV } = removeNulls(data.t, calculatedIndicators.rsi);
        const rsiSeries = rsiChart.addSeries(LineSeries, {
            color: RSI_COLORS.line,
            lineWidth: 2,
            title: `RSI(${indicators.rsiPeriod})`,
            priceLineVisible: false,
            lastValueVisible: true,
        });
        rsiSeries.setData(rsiT.map((time, i) => ({ time: (time + TIME_OFFSET) as UTCTimestamp, value: rsiV[i] })));

        // Overbought/Oversold lines (using baseline series approach with line series)
        const overboughtSeries = rsiChart.addSeries(LineSeries, {
            color: RSI_COLORS.upperBand,
            lineWidth: 1,
            lineStyle: 2,
            priceLineVisible: false,
            lastValueVisible: false,
        });
        overboughtSeries.setData(rsiT.map((time) => ({ time: (time + TIME_OFFSET) as UTCTimestamp, value: RSI_LEVELS.overbought })));

        const oversoldSeries = rsiChart.addSeries(LineSeries, {
            color: RSI_COLORS.lowerBand,
            lineWidth: 1,
            lineStyle: 2,
            priceLineVisible: false,
            lastValueVisible: false,
        });
        oversoldSeries.setData(rsiT.map((time) => ({ time: (time + TIME_OFFSET) as UTCTimestamp, value: RSI_LEVELS.oversold })));

        const middleSeries = rsiChart.addSeries(LineSeries, {
            color: RSI_COLORS.middleBand,
            lineWidth: 1,
            lineStyle: 2,
            priceLineVisible: false,
            lastValueVisible: false,
        });
        middleSeries.setData(rsiT.map((time) => ({ time: (time + TIME_OFFSET) as UTCTimestamp, value: RSI_LEVELS.middle })));

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (entry.contentRect && rsiChartRef.current) {
                    rsiChartRef.current.applyOptions({ width: entry.contentRect.width });
                }
            }
        });
        resizeObserver.observe(rsiContainerRef.current);

        return () => {
            resizeObserver.disconnect();
        };
    }, [data, indicators.showRSI, indicators.rsiPeriod, colors, calculatedIndicators]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; }
            if (volumeChartRef.current) { volumeChartRef.current.remove(); volumeChartRef.current = null; }
            if (macdChartRef.current) { macdChartRef.current.remove(); macdChartRef.current = null; }
            if (rsiChartRef.current) { rsiChartRef.current.remove(); rsiChartRef.current = null; }
        };
    }, []);

    const dropdownContent = (
        <IndicatorPanel 
            indicators={indicators} 
            onChange={handleIndicatorChange} 
        />
    );

    return (
        <Card className="h-full" styles={{ body: { padding: 16 } }}>
            {/* Header */}
            <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
                <div className="flex items-center gap-2">
                    <Text strong>Biểu đồ giá</Text>
                    {isFetching && !isLoading && <Spin size="small" />}
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                    {/* Zoom Controls */}
                    <Space.Compact size="small">
                        <Tooltip title="Phóng to">
                            <Button size="small" icon={<ZoomInOutlined />} onClick={handleZoomIn} className="h-6" />
                        </Tooltip>
                        <Tooltip title="Thu nhỏ">
                            <Button size="small" icon={<ZoomOutOutlined />} onClick={handleZoomOut} className="h-6" />
                        </Tooltip>
                        <Tooltip title="Xem tất cả">
                            <Button size="small" icon={<ExpandOutlined />} onClick={handleResetZoom} className="h-6" />
                        </Tooltip>
                    </Space.Compact>

                    {/* Crosshair Toggle */}
                    <Tooltip title={showCrosshair ? "Ẩn dấu thập" : "Hiện dấu thập"}>
                        <Button 
                            size="small" 
                            icon={<AimOutlined />}
                            onClick={() => setShowCrosshair(!showCrosshair)}
                            type={showCrosshair ? "primary" : "default"}
                            className="h-6"
                        />
                    </Tooltip>

                    {/* Price Lines Toggle */}
                    <Tooltip title={showPriceLines ? "Ẩn giá hiện tại" : "Hiện giá hiện tại"}>
                        <Button 
                            size="small" 
                            icon={showPriceLines ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                            onClick={() => setShowPriceLines(!showPriceLines)}
                            type={showPriceLines ? "primary" : "default"}
                            className="h-6"
                        />
                    </Tooltip>

                    {/* Indicators Dropdown */}
                    <Dropdown
                        open={dropdownOpen}
                        onOpenChange={setDropdownOpen}
                        dropdownRender={() => dropdownContent}
                        trigger={["click"]}
                        placement="bottomRight"
                    >
                        <Button 
                            size="small"
                            icon={<LineChartOutlined />}
                            className="flex items-center text-xs h-6 px-2"
                        >
                            Chỉ báo
                            {activeIndicatorCount > 0 && (
                                <span className="ml-1 px-1 py-0 text-[10px] bg-blue-500 text-white rounded-full leading-tight">
                                    {activeIndicatorCount}
                                </span>
                            )}
                            <DownOutlined className="text-[10px] ml-0.5" />
                        </Button>
                    </Dropdown>

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

            {/* Main chart */}
            <div className="relative">
                {/* Crosshair Legend */}
                {crosshairData && (
                    <div className="absolute top-2 left-2 z-20 bg-white/90 dark:bg-gray-800/90 rounded-lg px-3 py-2 shadow-sm border border-gray-200 dark:border-gray-700 text-xs">
                        <div className="flex gap-4 items-center">
                            <span className="text-gray-500">{crosshairData.time}</span>
                            <span><span className="text-gray-400">O:</span> {crosshairData.open.toLocaleString()}</span>
                            <span><span className="text-gray-400">H:</span> <span className="text-green-600">{crosshairData.high.toLocaleString()}</span></span>
                            <span><span className="text-gray-400">L:</span> <span className="text-red-500">{crosshairData.low.toLocaleString()}</span></span>
                            <span><span className="text-gray-400">C:</span> {crosshairData.close.toLocaleString()}</span>
                            <span className={crosshairData.change >= 0 ? "text-green-600" : "text-red-500"}>
                                {crosshairData.change >= 0 ? "+" : ""}{crosshairData.change.toLocaleString()} ({crosshairData.changePercent >= 0 ? "+" : ""}{crosshairData.changePercent.toFixed(2)}%)
                            </span>
                            <span><span className="text-gray-400">Vol:</span> {(crosshairData.volume / 1000).toFixed(0)}K</span>
                        </div>
                    </div>
                )}

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
                    <>
                        <div ref={chartContainerRef} className="w-full" style={{ height: 400 }} />
                        {indicators.showVolume && (
                            <div ref={volumeContainerRef} className="w-full mt-2" style={{ height: 150 }} />
                        )}
                        {indicators.showMACD && (
                            <div ref={macdContainerRef} className="w-full mt-2" style={{ height: 120 }} />
                        )}
                        {indicators.showRSI && (
                            <div ref={rsiContainerRef} className="w-full mt-2" style={{ height: 100 }} />
                        )}
                    </>
                )}
            </div>
        </Card>
    );
});

export default StockChartTab;
