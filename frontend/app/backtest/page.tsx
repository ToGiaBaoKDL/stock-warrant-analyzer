/**
 * Backtest Page -  Dedicated walk-forward backtesting dashboard.
 *
 * Features:
 * - Symbol selector (all VN30/HOSE/HNX stocks)
 * - Tuning controls: holding period, lookback days, signal step
 * - Summary metrics + grade
 * - Equity curve (cumulative returns line chart)
 * - Signal breakdown cards
 * - Full trade history table
 */

"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
    Layout,
    Card,
    Select,
    Slider,
    Statistic,
    Table,
    Tag,
    Tooltip,
    Badge,
    Empty,
    Spin,
    Typography,
    Alert,
    theme,
} from "antd";
import {
    ExperimentOutlined,
    TrophyOutlined,
    WarningOutlined,
    InfoCircleOutlined,
    RiseOutlined,
    FallOutlined,
    SettingOutlined,
    LineChartOutlined,
    ReloadOutlined,
    ThunderboltOutlined,
    QuestionCircleOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import {
    createChart,
    LineSeries,
    AreaSeries,
    HistogramSeries,
    type IChartApi,
    type UTCTimestamp,
} from "lightweight-charts";
import { MainNav } from "@/components";
import { apiClient, endpoints } from "@/lib";
import type { ChartHistoryResponse } from "@/hooks/useStockHistory";
import { useChartColors, useStockList } from "@/hooks";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { runBacktest, getBacktestGrade, type BacktestResult } from "@/utils/indicators/backtesting";

const { Content } = Layout;
const { Title, Text } = Typography;
const { useToken } = theme;

// ===================================================================
// CONSTANTS
// ===================================================================

const GRADE_COLORS: Record<string, string> = {
    "A+": "#00C853",
    A: "#4CAF50",
    B: "#8BC34A",
    C: "#FFC107",
    D: "#FF9800",
    F: "#F44336",
};

const SIGNAL_TAG_COLORS: Record<string, string> = {
    STRONG_BUY: "green",
    BUY: "lime",
    SELL: "orange",
    STRONG_SELL: "red",
};

const SIGNAL_LABELS: Record<string, string> = {
    STRONG_BUY: "Mua Mạnh",
    BUY: "Mua",
    SELL: "Bán",
    STRONG_SELL: "Bán Mạnh",
};

/** Color shorthand for positive/negative/neutral metrics */
const C = { up: "#10B981", down: "#EF4444", warn: "#F59E0B", muted: "#9CA3AF" } as const;

function metricColor(value: number, goodAbove: number, warnAbove?: number): string {
    if (warnAbove !== undefined && value >= warnAbove && value < goodAbove) return C.warn;
    return value >= goodAbove ? C.up : C.down;
}

/** Tiny help icon with tooltip */
function HelpTip({ text }: { text: string }) {
    return (
        <Tooltip title={text}>
            <QuestionCircleOutlined style={{ fontSize: 11, marginLeft: 4, opacity: 0.5, cursor: "help" }} />
        </Tooltip>
    );
}

// ===================================================================
// EQUITY CURVE COMPONENT
// ===================================================================

function EquityCurve({
    trades,
}: {
    trades: BacktestResult["trades"];
}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const colors = useChartColors();
    const { token } = useToken();

    useEffect(() => {
        if (!containerRef.current || trades.length === 0) return;

        // Clean up previous chart
        if (chartRef.current) {
            chartRef.current.remove();
            chartRef.current = null;
        }

        const chart = createChart(containerRef.current, {
            width: containerRef.current.clientWidth,
            height: 220,
            layout: {
                background: { color: "transparent" },
                textColor: colors.textColor,
            },
            grid: {
                vertLines: { visible: false },
                horzLines: { color: colors.borderColor, style: 2 },
            },
            timeScale: {
                visible: false,
            },
            rightPriceScale: {
                borderColor: colors.borderColor,
            },
            crosshair: {
                mode: 1,
            },
        });
        chartRef.current = chart;

        // Build cumulative return data
        let cumReturn = 0;
        const equityData = trades.map((trade, idx) => {
            cumReturn += trade.returnPct;
            return {
                time: (idx + 1) as UTCTimestamp,
                value: Math.round(cumReturn * 100) / 100,
            };
        });

        // Area series for equity curve
        const areaSeries = chart.addSeries(AreaSeries, {
            lineColor: cumReturn >= 0 ? "#10B981" : "#EF4444",
            topColor: cumReturn >= 0 ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)",
            bottomColor: cumReturn >= 0 ? "rgba(16, 185, 129, 0.02)" : "rgba(239, 68, 68, 0.02)",
            lineWidth: 2,
            priceLineVisible: false,
            lastValueVisible: true,
        });
        areaSeries.setData(equityData);

        // Zero line
        const zeroLine = chart.addSeries(LineSeries, {
            color: colors.textColor + "40",
            lineWidth: 1,
            lineStyle: 2,
            priceLineVisible: false,
            lastValueVisible: false,
        });
        zeroLine.setData(equityData.map(d => ({ time: d.time, value: 0 })));

        chart.timeScale().fitContent();

        // Resize observer
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (entry.contentRect && chartRef.current) {
                    chartRef.current.applyOptions({ width: entry.contentRect.width });
                }
            }
        });
        resizeObserver.observe(containerRef.current);

        return () => {
            resizeObserver.disconnect();
            if (chartRef.current) {
                chartRef.current.remove();
                chartRef.current = null;
            }
        };
    }, [trades, colors]);

    if (trades.length === 0) return null;

    return (
        <div>
            <h4
                className="text-sm font-semibold mb-2 flex items-center gap-2"
                style={{ color: token.colorText }}
            >
                <LineChartOutlined />
                Đường vốn (Equity Curve)
            </h4>
            <div ref={containerRef} className="w-full rounded-lg" style={{ height: 220 }} />
        </div>
    );
}

// ===================================================================
// TRADE RETURN HISTOGRAM
// ===================================================================

function ReturnDistribution({
    trades,
}: {
    trades: BacktestResult["trades"];
}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const colors = useChartColors();
    const { token } = useToken();

    useEffect(() => {
        if (!containerRef.current || trades.length === 0) return;

        if (chartRef.current) {
            chartRef.current.remove();
            chartRef.current = null;
        }

        const chart = createChart(containerRef.current, {
            width: containerRef.current.clientWidth,
            height: 160,
            layout: {
                background: { color: "transparent" },
                textColor: colors.textColor,
            },
            grid: {
                vertLines: { visible: false },
                horzLines: { color: colors.borderColor, style: 2 },
            },
            timeScale: { visible: false },
            rightPriceScale: { borderColor: colors.borderColor },
        });
        chartRef.current = chart;

        // Sort trades by return and create a histogram
        const sorted = [...trades].sort((a, b) => a.returnPct - b.returnPct);
        const histData = sorted.map((trade, idx) => ({
            time: (idx + 1) as UTCTimestamp,
            value: trade.returnPct,
            color: trade.returnPct >= 0 ? "#10B981" : "#EF4444",
        }));

        const histSeries = chart.addSeries(HistogramSeries, {
            priceFormat: { type: "price" as const, precision: 2, minMove: 0.01 },
            priceLineVisible: false,
            lastValueVisible: false,
        });
        histSeries.setData(histData);

        chart.timeScale().fitContent();

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (entry.contentRect && chartRef.current) {
                    chartRef.current.applyOptions({ width: entry.contentRect.width });
                }
            }
        });
        resizeObserver.observe(containerRef.current);

        return () => {
            resizeObserver.disconnect();
            if (chartRef.current) {
                chartRef.current.remove();
                chartRef.current = null;
            }
        };
    }, [trades, colors]);

    if (trades.length === 0) return null;

    return (
        <div>
            <h4
                className="text-sm font-semibold mb-2 flex items-center gap-2"
                style={{ color: token.colorText }}
            >
                <ThunderboltOutlined />
                Phân bổ lợi nhuận
            </h4>
            <div ref={containerRef} className="w-full rounded-lg" style={{ height: 160 }} />
        </div>
    );
}

// ===================================================================
// MAIN PAGE
// ===================================================================

export default function BacktestPage() {
    const { token } = useToken();

    // ── State (persisted to survive tab switches) ──
    const [symbol, setSymbol] = useLocalStorage<string | null>("backtest-symbol", null);
    const [holdingPeriod, setHoldingPeriod] = useLocalStorage<number>("backtest-holding", 5);
    const [lookbackDays, setLookbackDays] = useLocalStorage<number>("backtest-lookback", 120);
    const [signalStep, setSignalStep] = useLocalStorage<number>("backtest-step", 3);

    // ── Fetch stock list for selector (same as CW page) ──
    const { data: stockListData, isLoading: stockListLoading } = useStockList();

    // Build options with CP prefix + company name
    const symbolOptions = useMemo(() => {
        if (!stockListData?.stocks) return [];
        return stockListData.stocks.map((stock) => ({
            value: stock.symbol,
            searchText: `${stock.symbol} ${stock.name}`.toLowerCase(),
            label: (
                <div className="flex items-center gap-2">
                    <Tag color="blue" className="text-xs">CP</Tag>
                    {`${stock.symbol} - ${stock.name}`}
                </div>
            ),
        }));
    }, [stockListData]);

    // ── Fetch history data ──
    const { data: historyData, isLoading: historyLoading } = useQuery<ChartHistoryResponse>({
        queryKey: ["stock-history", symbol, "1D", 350],
        queryFn: async () => {
            if (!symbol) throw new Error("Symbol is required");
            const res = await apiClient.get<ChartHistoryResponse>(
                endpoints.market.history(symbol, { resolution: "1D", days: 350 })
            );
            return res.data;
        },
        enabled: !!symbol,
        staleTime: 20 * 60 * 1000,
        refetchOnWindowFocus: false,
    });

    // ── Run backtest ──
    const backtestResult = useMemo<BacktestResult | null>(() => {
        if (!historyData?.c || historyData.c.length < 100) return null;
        try {
            return runBacktest(
                historyData.c,
                historyData.h,
                historyData.l,
                historyData.v,
                { holdingPeriod, lookbackDays, signalStep },
            );
        } catch {
            return null;
        }
    }, [historyData, holdingPeriod, lookbackDays, signalStep]);

    const grade = useMemo(() => {
        if (!backtestResult || backtestResult.totalSignals === 0) return null;
        return getBacktestGrade(backtestResult.winRate, backtestResult.profitFactor);
    }, [backtestResult]);

    // ── Derived stats ──
    const advancedStats = useMemo(() => {
        if (!backtestResult || backtestResult.trades.length === 0) return null;

        const trades = backtestResult.trades;
        const returns = trades.map(t => t.returnPct);
        const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + (r - avgReturn) ** 2, 0) / returns.length;
        const stdDev = Math.sqrt(variance);

        // Sharpe-like ratio (using 0% as risk-free, annualized for daily)
        const sharpe = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252 / holdingPeriod) : 0;

        // Max consecutive losses
        let maxConsecLoss = 0;
        let currentConsecLoss = 0;
        for (const trade of trades) {
            if (!trade.isWin) {
                currentConsecLoss++;
                maxConsecLoss = Math.max(maxConsecLoss, currentConsecLoss);
            } else {
                currentConsecLoss = 0;
            }
        }

        // Cumulative return
        const cumReturn = returns.reduce((a, b) => a + b, 0);

        // Average win vs average loss
        const wins = returns.filter(r => r > 0);
        const losses = returns.filter(r => r < 0);
        const avgWin = wins.length > 0 ? wins.reduce((a, b) => a + b, 0) / wins.length : 0;
        const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / losses.length : 0;
        const payoffRatio = avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : avgWin > 0 ? Infinity : 0;

        // Expectancy = (WinRate × AvgWin) − (LossRate × |AvgLoss|)
        const winRateFrac = backtestResult.winRate / 100;
        const expectancy = (winRateFrac * avgWin) - ((1 - winRateFrac) * Math.abs(avgLoss));

        // Kelly Criterion % = W − (1−W)/R
        const kelly = isFinite(payoffRatio) && payoffRatio > 0
            ? (winRateFrac - (1 - winRateFrac) / payoffRatio) * 100
            : !isFinite(payoffRatio) && payoffRatio === Infinity
                ? winRateFrac * 100   // No losses → Kelly = win rate
                : 0;

        // Recovery Factor = cumReturn / |maxDrawdown|
        const recoveryFactor = backtestResult.maxDrawdown !== 0
            ? Math.abs(cumReturn / backtestResult.maxDrawdown)
            : cumReturn > 0 ? Infinity : 0;

        // Max consecutive wins
        let maxConsecWin = 0;
        let curWin = 0;
        for (const trade of trades) {
            if (trade.isWin) { curWin++; maxConsecWin = Math.max(maxConsecWin, curWin); }
            else { curWin = 0; }
        }

        return { sharpe, maxConsecLoss, cumReturn, avgWin, avgLoss, payoffRatio, stdDev, expectancy, kelly, recoveryFactor, maxConsecWin, minTrades: trades.length < 5 };
    }, [backtestResult, holdingPeriod]);

    const breakdownData = useMemo(() => {
        if (!backtestResult) return [];
        return Object.entries(backtestResult.signalBreakdown).map(([key, val]) => ({
            key,
            signal: key,
            count: val.count,
            winRate: val.winRate,
            avgReturn: val.avgReturn,
        }));
    }, [backtestResult]);

    const tradeColumns = useMemo(() => [
        {
            title: "#",
            dataIndex: "date",
            key: "date",
            width: 60,
            render: (v: number) => `#${v}`,
        },
        {
            title: "Tín hiệu",
            dataIndex: "signal",
            key: "signal",
            width: 110,
            render: (v: string) => (
                <Tag color={SIGNAL_TAG_COLORS[v] ?? "default"}>
                    {SIGNAL_LABELS[v] ?? v}
                </Tag>
            ),
        },
        {
            title: "Giá vào",
            dataIndex: "entryPrice",
            key: "entryPrice",
            width: 90,
            align: "right" as const,
            render: (v: number) => v.toLocaleString("vi-VN"),
        },
        {
            title: "Giá ra",
            dataIndex: "exitPrice",
            key: "exitPrice",
            width: 90,
            align: "right" as const,
            render: (v: number) => v.toLocaleString("vi-VN"),
        },
        {
            title: "Lợi nhuận",
            dataIndex: "returnPct",
            key: "returnPct",
            width: 100,
            align: "right" as const,
            sorter: (a: { returnPct: number }, b: { returnPct: number }) => a.returnPct - b.returnPct,
            render: (v: number) => (
                <span style={{ color: v >= 0 ? "#10B981" : "#EF4444", fontWeight: 600 }}>
                    {v >= 0 ? "+" : ""}{v.toFixed(2)}%
                </span>
            ),
        },
        {
            title: "Kết quả",
            dataIndex: "isWin",
            key: "isWin",
            width: 80,
            align: "center" as const,
            render: (v: boolean) =>
                v
                    ? <Tag color="green">Thắng</Tag>
                    : <Tag color="red">Thua</Tag>,
        },
    ], []);

    const handleSymbolChange = useCallback((val: string | null) => {
        setSymbol(val);
    }, []);

    return (
        <Layout className="min-h-screen" style={{ background: "var(--background)" }}>
            <MainNav />

            <Content className="p-3 sm:p-4 lg:p-6">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                        <div>
                            <Title level={3} className="!mb-0 flex items-center gap-2">
                                <ExperimentOutlined />
                                Backtest -  Kiểm Tra Tín Hiệu
                            </Title>
                            <Text type="secondary" className="text-sm">
                                Walk-forward backtest: tín hiệu chỉ dùng dữ liệu quá khứ, không có look-ahead bias.
                            </Text>
                        </div>
                    </div>

                    {/* Controls Row */}
                    <Card className="mb-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {/* Symbol Selector */}
                            <div>
                                <label className="text-xs font-semibold mb-2 block" style={{ color: token.colorTextSecondary }}>
                                    Mã cổ phiếu
                                </label>
                                <Select
                                    showSearch
                                    allowClear
                                    placeholder="Tìm mã CP..."
                                    value={symbol}
                                    onChange={handleSymbolChange}
                                    options={symbolOptions}
                                    className="w-full"
                                    loading={stockListLoading}
                                    optionFilterProp="searchText"
                                    filterOption={(input, option) =>
                                        (option?.searchText ?? "")
                                            .includes(input.toLowerCase())
                                    }
                                    suffixIcon={historyLoading ? <Spin size="small" /> : undefined}
                                />
                            </div>

                            {/* Holding Period */}
                            <div>
                                <label className="text-xs font-semibold mb-2 block" style={{ color: token.colorTextSecondary }}>
                                    <SettingOutlined className="mr-1" />
                                    Số phiên nắm giữ: <strong>{holdingPeriod}</strong>
                                    <HelpTip text="Sau khi tín hiệu xuất hiện, giữ bao nhiêu phiên rồi bán. Swing trade thường 3-10 phiên." />
                                </label>
                                <Slider
                                    min={1}
                                    max={20}
                                    value={holdingPeriod}
                                    onChange={setHoldingPeriod}
                                    marks={{ 1: "1", 3: "3", 5: "5", 10: "10", 20: "20" }}
                                />
                            </div>

                            {/* Lookback Days */}
                            <div>
                                <label className="text-xs font-semibold mb-2 block" style={{ color: token.colorTextSecondary }}>
                                    <SettingOutlined className="mr-1" />
                                    Lookback (phiên): <strong>{lookbackDays}</strong>
                                    <HelpTip text="Chỉ tính thống kê từ N phiên gần nhất. 120 phiên ≈ 6 tháng giao dịch." />
                                </label>
                                <Slider
                                    min={30}
                                    max={300}
                                    step={10}
                                    value={lookbackDays}
                                    onChange={setLookbackDays}
                                    marks={{ 30: "30", 60: "60", 120: "120", 200: "200", 300: "300" }}
                                />
                            </div>

                            {/* Signal Step */}
                            <div>
                                <label className="text-xs font-semibold mb-2 block" style={{ color: token.colorTextSecondary }}>
                                    <SettingOutlined className="mr-1" />
                                    Bước tín hiệu: <strong>{signalStep}</strong>
                                    <HelpTip text="Kiểm tra tín hiệu mỗi N phiên. Bước nhỏ = chính xác hơn. Bước 1 = kiểm tra mỗi phiên." />
                                </label>
                                <Slider
                                    min={1}
                                    max={10}
                                    value={signalStep}
                                    onChange={setSignalStep}
                                    marks={{ 1: "1", 3: "3", 5: "5", 10: "10" }}
                                />
                            </div>
                        </div>
                    </Card>

                    {/* No symbol selected */}
                    {!symbol && (
                        <Card>
                            <Empty
                                description="Chọn mã cổ phiếu để bắt đầu backtest"
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                            />
                        </Card>
                    )}

                    {/* Loading */}
                    {symbol && historyLoading && (
                        <Card>
                            <Spin size="large" tip="Đang tải dữ liệu lịch sử...">
                                <div className="py-20" />
                            </Spin>
                        </Card>
                    )}

                    {/* No result */}
                    {symbol && !historyLoading && (!backtestResult || backtestResult.totalSignals === 0) && historyData && (
                        <Card>
                            <Empty description="Không đủ dữ liệu hoặc không có tín hiệu trong khoảng thời gian. Thử giảm lookback hoặc signalStep." />
                        </Card>
                    )}

                    {/* Results */}
                    {backtestResult && backtestResult.totalSignals > 0 && (
                        <>
                            {/* Min trades warning */}
                            {advancedStats?.minTrades && (
                                <Alert
                                    className="mb-6"
                                    type="info"
                                    title={`Chỉ có ${backtestResult.totalSignals} tín hiệu trong khung thời gian - Các chỉ số thống kê (Sharpe, Kelly, Payoff) chưa đủ mẫu để tin cậy. Nên có ≥5 trades.`}
                                />
                            )}

                            {/* Grade + Key Metrics */}
                            <Card
                                className="mb-6"
                                title={
                                    <span className="flex items-center gap-2">
                                        <TrophyOutlined />
                                        Tổng quan: {symbol}
                                        {grade && (
                                            <Badge
                                                count={grade}
                                                style={{
                                                    backgroundColor: GRADE_COLORS[grade] ?? token.colorPrimary,
                                                    fontWeight: 700,
                                                    fontSize: 16,
                                                }}
                                            />
                                        )}
                                    </span>
                                }
                            >
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                    <Tooltip title="Tỷ lệ các trade có lợi nhuận dương. ≥50% là cơ bản, ≥60% là tốt.">
                                        <div>
                                            <Statistic
                                                title="Tỷ lệ thắng"
                                                value={backtestResult.winRate}
                                                suffix="%"
                                                precision={1}
                                                styles={{ content: { color: metricColor(backtestResult.winRate, 50, 40), fontWeight: 700 } }}
                                                prefix={<TrophyOutlined />}
                                            />
                                        </div>
                                    </Tooltip>
                                    <Tooltip title="Lợi nhuận trung bình mỗi trade (%). Dương = hệ thống sinh lời.">
                                        <div>
                                            <Statistic
                                                title="Lợi nhuận TB/trade"
                                                value={backtestResult.avgReturn}
                                                suffix="%"
                                                precision={2}
                                                styles={{ content: { color: backtestResult.avgReturn >= 0 ? C.up : C.down, fontWeight: 700 } }}
                                                prefix={backtestResult.avgReturn >= 0 ? <RiseOutlined /> : <FallOutlined />}
                                            />
                                        </div>
                                    </Tooltip>
                                    <Tooltip title="Profit Factor = Tổng lãi / Tổng lỗ. ≥1.5 tốt, ≥2.0 xuất sắc.">
                                        <div>
                                            <Statistic
                                                title="Profit Factor"
                                                value={isFinite(backtestResult.profitFactor) ? backtestResult.profitFactor : "∞"}
                                                precision={isFinite(backtestResult.profitFactor) ? 2 : undefined}
                                                styles={{ content: { color: metricColor(backtestResult.profitFactor, 1.5, 1.0), fontWeight: 700 } }}
                                            />
                                        </div>
                                    </Tooltip>
                                    <Statistic
                                        title="Tổng tín hiệu"
                                        value={backtestResult.totalSignals}
                                        suffix={
                                            <span style={{ fontSize: 12, color: token.colorTextSecondary, marginLeft: 4 }}>
                                                ({backtestResult.buySignals} Mua / {backtestResult.sellSignals} Bán)
                                            </span>
                                        }
                                    />
                                </div>

                                <div className="mt-4 mb-3 flex items-center gap-2" style={{ borderBottom: `1px solid ${token.colorBorderSecondary}`, paddingBottom: 6 }}>
                                    <Text type="secondary" className="text-xs font-semibold">Rủi ro & Hiệu suất</Text>
                                </div>

                                {/* Extended metrics row */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                    <Tooltip title="Lợi nhuận lớn nhất trong 1 trade.">
                                        <div>
                                            <Statistic title="Best Trade" value={backtestResult.maxReturn} suffix="%" precision={2} styles={{ content: { color: C.up } }} />
                                        </div>
                                    </Tooltip>
                                    <Tooltip title="Lỗ lớn nhất trong 1 trade (worst single trade).">
                                        <div>
                                            <Statistic title="Worst Trade" value={backtestResult.maxDrawdown} suffix="%" precision={2} styles={{ content: { color: C.down } }} />
                                        </div>
                                    </Tooltip>
                                    {advancedStats && (
                                        <>
                                            <Tooltip title="Expectancy = (WR × AvgWin) − (LossRate × |AvgLoss|). Dương = mỗi trade kỳ vọng lãi. Chỉ số quan trọng nhất.">
                                                <div>
                                                    <Statistic
                                                        title={<>Expectancy <HelpTip text="Kỳ vọng lợi nhuận mỗi trade" /></>}
                                                        value={advancedStats.expectancy}
                                                        suffix="%"
                                                        precision={2}
                                                        styles={{ content: { color: advancedStats.expectancy >= 0 ? C.up : C.down, fontWeight: 700 } }}
                                                    />
                                                </div>
                                            </Tooltip>
                                            <Tooltip title="Sharpe Ratio (annualized, risk-free=0%). >1 khá, >2 tốt, >3 xuất sắc.">
                                                <div>
                                                    <Statistic
                                                        title={<>Sharpe Ratio <HelpTip text="Lợi nhuận / Rủi ro (annualized)" /></>}
                                                        value={advancedStats.stdDev > 0 ? advancedStats.sharpe : "N/A"}
                                                        precision={advancedStats.stdDev > 0 ? 2 : undefined}
                                                        styles={{ content: { color: advancedStats.stdDev > 0 ? metricColor(advancedStats.sharpe, 1, 0.5) : C.muted, fontWeight: 700 } }}
                                                    />
                                                </div>
                                            </Tooltip>
                                        </>
                                    )}
                                </div>

                                {/* Pro trader metrics */}
                                {advancedStats && (
                                    <>
                                    <div className="mt-4 mb-3 flex items-center gap-2" style={{ borderBottom: `1px solid ${token.colorBorderSecondary}`, paddingBottom: 6 }}>
                                        <Text type="secondary" className="text-xs font-semibold">Chuyên gia</Text>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                        <Tooltip title="Kelly Criterion % = phần vốn tối ưu mỗi trade. Thực tế nên dùng ¼–½ Kelly. Âm = không nên trade.">
                                            <div>
                                                <Statistic
                                                    title={<>Kelly % <HelpTip text="% vốn tối ưu/trade (Kelly Criterion)" /></>}
                                                    value={advancedStats.kelly}
                                                    suffix="%"
                                                    precision={1}
                                                    styles={{ content: { color: advancedStats.kelly > 0 ? C.up : C.down, fontWeight: 700 } }}
                                                />
                                            </div>
                                        </Tooltip>
                                        <Tooltip title="Payoff Ratio = Avg Win / |Avg Loss|. >1.5 tốt. Ratio cao cho phép win rate thấp hơn vẫn lãi.">
                                            <div>
                                                <Statistic
                                                    title={<>Payoff Ratio <HelpTip text="TB thắng / TB thua" /></>}
                                                    value={isFinite(advancedStats.payoffRatio) ? advancedStats.payoffRatio : "∞"}
                                                    precision={isFinite(advancedStats.payoffRatio) ? 2 : undefined}
                                                    styles={{ content: { color: metricColor(advancedStats.payoffRatio, 1.5, 1), fontWeight: 700 } }}
                                                />
                                            </div>
                                        </Tooltip>
                                        <Tooltip title="Recovery Factor = Lợi nhuận tích lũy / |Worst Drawdown|. >3 tốt. Hệ thống phục hồi nhanh.">
                                            <div>
                                                <Statistic
                                                    title={<>Recovery Factor <HelpTip text="Khả năng phục hồi sau drawdown" /></>}
                                                    value={isFinite(advancedStats.recoveryFactor) ? advancedStats.recoveryFactor : "∞"}
                                                    precision={isFinite(advancedStats.recoveryFactor) ? 2 : undefined}
                                                    styles={{ content: { color: metricColor(advancedStats.recoveryFactor, 3, 1), fontWeight: 700 } }}
                                                />
                                            </div>
                                        </Tooltip>
                                        <Tooltip title="Lợi nhuận tích lũy tổng cộng qua tất cả trades trong lookback window.">
                                            <div>
                                                <Statistic
                                                    title="Lợi nhuận tích lũy"
                                                    value={advancedStats.cumReturn}
                                                    suffix="%"
                                                    precision={2}
                                                    styles={{ content: { color: advancedStats.cumReturn >= 0 ? C.up : C.down, fontWeight: 700 } }}
                                                />
                                            </div>
                                        </Tooltip>
                                    </div>
                                    </>
                                )}

                                {/* Win/Loss details */}
                                {advancedStats && (
                                    <>
                                    <div className="mt-4 mb-3 flex items-center gap-2" style={{ borderBottom: `1px solid ${token.colorBorderSecondary}`, paddingBottom: 6 }}>
                                        <Text type="secondary" className="text-xs font-semibold">Thắng / Thua</Text>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <Tooltip title="Lợi nhuận trung bình khi trade thắng.">
                                            <div><Statistic title="TB khi thắng" value={advancedStats.avgWin} suffix="%" precision={2} styles={{ content: { color: C.up } }} /></div>
                                        </Tooltip>
                                        <Tooltip title="Lỗ trung bình khi trade thua.">
                                            <div><Statistic title="TB khi thua" value={advancedStats.avgLoss} suffix="%" precision={2} styles={{ content: { color: C.down } }} /></div>
                                        </Tooltip>
                                        <Tooltip title="Chuỗi thắng liên tiếp dài nhất.">
                                            <div>
                                                <Statistic title="Thắng liên tiếp max" value={advancedStats.maxConsecWin} suffix="lần" styles={{ content: { color: C.up, fontWeight: 700 } }} />
                                            </div>
                                        </Tooltip>
                                        <Tooltip title="Chuỗi thua liên tiếp dài nhất. ≥5 cần xem xét lại hệ thống.">
                                            <div>
                                                <Statistic
                                                    title="Thua liên tiếp max"
                                                    value={advancedStats.maxConsecLoss}
                                                    suffix="lần"
                                                    styles={{ content: { color: advancedStats.maxConsecLoss >= 5 ? C.down : advancedStats.maxConsecLoss >= 3 ? C.warn : C.up, fontWeight: 700 } }}
                                                />
                                            </div>
                                        </Tooltip>
                                    </div>
                                    </>
                                )}
                            </Card>

                            {/* Charts Row */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                                <Card size="small">
                                    <EquityCurve trades={backtestResult.trades} />
                                </Card>
                                <Card size="small">
                                    <ReturnDistribution trades={backtestResult.trades} />
                                </Card>
                            </div>

                            {/* Signal Breakdown */}
                            {breakdownData.length > 0 && (
                                <Card className="mb-6" title={
                                    <span className="flex items-center gap-2 text-sm">
                                        <InfoCircleOutlined />
                                        Phân tích theo loại tín hiệu
                                    </span>
                                }>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                        {breakdownData.map((row) => (
                                            <Card
                                                key={row.key}
                                                size="small"
                                                styles={{ body: { padding: "12px 16px" } }}
                                                style={{ border: `1px solid ${token.colorBorderSecondary}` }}
                                            >
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Tag color={SIGNAL_TAG_COLORS[row.signal] ?? "default"}>
                                                        {SIGNAL_LABELS[row.signal] ?? row.signal}
                                                    </Tag>
                                                    <span style={{ color: token.colorTextSecondary, fontSize: 12 }}>
                                                        × {row.count}
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 text-xs">
                                                    <div>
                                                        <span style={{ color: token.colorTextSecondary }}>Win Rate:</span>
                                                        <div
                                                            className="font-bold text-sm"
                                                            style={{ color: row.winRate >= 50 ? "#10B981" : "#EF4444" }}
                                                        >
                                                            {row.winRate.toFixed(0)}%
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <span style={{ color: token.colorTextSecondary }}>Avg Return:</span>
                                                        <div
                                                            className="font-bold text-sm"
                                                            style={{ color: row.avgReturn >= 0 ? "#10B981" : "#EF4444" }}
                                                        >
                                                            {row.avgReturn >= 0 ? "+" : ""}{row.avgReturn.toFixed(2)}%
                                                        </div>
                                                    </div>
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                </Card>
                            )}

                            {/* Trade History */}
                            {backtestResult.trades.length > 0 && (
                                <Card
                                    title={
                                        <span className="text-sm flex items-center gap-2">
                                            <ReloadOutlined />
                                            Lịch sử giao dịch ({backtestResult.trades.length} trades)
                                        </span>
                                    }
                                >
                                    <Table
                                        dataSource={backtestResult.trades.slice().reverse()}
                                        columns={tradeColumns}
                                        pagination={{ pageSize: 15, size: "small", showSizeChanger: true, pageSizeOptions: ["10", "15", "30", "50"] }}
                                        size="small"
                                        rowKey="date"
                                        scroll={{ x: 540 }}
                                    />
                                </Card>
                            )}
                        </>
                    )}
                </div>
            </Content>
        </Layout>
    );
}
