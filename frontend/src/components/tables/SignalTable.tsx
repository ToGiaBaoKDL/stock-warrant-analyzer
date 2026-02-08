/**
 * Signal Table Components
 * 
 * Displays 3-Layer Funnel trading signals:
 * - Layer 1: Market Regime (Uptrend/Downtrend/Sideway)
 * - Layer 2: Strategy (Trend Following / Mean Reversion)
 * - Layer 3: Volume Confirmation (RVOL)
 * 
 * Optimized with memoized sub-components
 */

import React, { memo, useMemo } from "react";
import { Table, Tag, Tooltip, Spin, Space, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { 
    ArrowUpOutlined, 
    ArrowDownOutlined, 
    MinusOutlined, 
    RiseOutlined, 
    FallOutlined,
    ThunderboltOutlined,
    SwapOutlined,
    PauseCircleOutlined,
    StopOutlined,
    FireOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    ClockCircleOutlined,
    SafetyCertificateOutlined,
    AimOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { 
    SIGNAL_COLORS, 
    type SignalStrength, 
    type MarketRegime, 
    type StrategyType,
    type IndicatorSignal,
    type EnhancedSignalData,
} from "@/utils/indicators";
import { getPricePosition, getPositionColorHex, getPriceColorHex } from "@/utils/priceColor";
import type { StockSignalRow } from "@/hooks/useSignals";

const { Text } = Typography;

const HeaderWithTip = ({ label, tip }: { label: string; tip: string }) => (
    <Tooltip title={tip}>
        <span>{label}</span>
    </Tooltip>
);

// ===========================================
// Memoized Sub-Components
// ===========================================

/**
 * Stock symbol with price-based color - Memoized
 */
export const StockSymbol = memo(function StockSymbol({ 
    symbol, 
    price, 
    refPrice, 
    ceiling, 
    floor 
}: { 
    symbol: string; 
    price: number; 
    refPrice: number; 
    ceiling: number; 
    floor: number;
}) {
    const position = getPricePosition(price, refPrice, ceiling, floor);
    const colorVar = getPositionColorHex(position);
    
    return (
        <Link 
            href={`/analysis/${symbol}`} 
            className="font-bold hover:underline"
            style={{ color: colorVar }}
        >
            {symbol}
        </Link>
    );
});

/**
 * Indicator mini badge with tooltip - Memoized
 */
export const IndicatorBadge = memo(function IndicatorBadge({ 
    name, 
    signal, 
    value,
}: { 
    name: string; 
    signal: "bullish" | "bearish" | "neutral"; 
    value?: string;
}) {
    const color = signal === "bullish" ? "green" : signal === "bearish" ? "red" : "default";
    const icon = signal === "bullish" ? "+" : signal === "bearish" ? "-" : "o";
    
    const tooltipContent = (
        <div className="text-xs">
            <div className="font-semibold">{name}</div>
            {value && <div className="text-gray-400">{value}</div>}
        </div>
    );
    
    return (
        <Tooltip title={tooltipContent}>
            <Tag color={color} className="text-xs px-1 py-0 cursor-help">
                {icon}
            </Tag>
        </Tooltip>
    );
});

/**
 * Signal badge configuration
 */
const SIGNAL_BADGE_CONFIG: Record<SignalStrength, { color: string; text: string; icon: React.ReactNode }> = {
    STRONG_BUY: { color: "green", text: "MUA MẠNH", icon: <RiseOutlined /> },
    BUY: { color: "lime", text: "MUA", icon: <ArrowUpOutlined /> },
    NEUTRAL: { color: "default", text: "TRUNG LẬP", icon: <MinusOutlined /> },
    SELL: { color: "orange", text: "BÁN", icon: <ArrowDownOutlined /> },
    STRONG_SELL: { color: "red", text: "BÁN MẠNH", icon: <FallOutlined /> },
};

/**
 * Market Regime badge configuration
 */
const REGIME_BADGE_CONFIG: Record<MarketRegime, { color: string; text: string; icon: React.ReactNode; shortText: string }> = {
    UPTREND_STRONG: { color: "green", text: "Uptrend Mạnh", icon: <RiseOutlined />, shortText: "Up Mạnh" },
    UPTREND_WEAK: { color: "lime", text: "Uptrend Yếu", icon: <ArrowUpOutlined />, shortText: "Up Yếu" },
    DOWNTREND: { color: "red", text: "Downtrend", icon: <FallOutlined />, shortText: "Down" },
    SIDEWAY: { color: "default", text: "Sideway", icon: <SwapOutlined />, shortText: "Sideway" },
    FLOOR_PRICE: { color: "cyan", text: "Nằm Sàn", icon: <StopOutlined />, shortText: "Sàn" },
};

/**
 * Strategy badge configuration
 */
const STRATEGY_BADGE_CONFIG: Record<StrategyType, { color: string; text: string; icon: React.ReactNode }> = {
    TREND_FOLLOWING: { color: "blue", text: "Trend", icon: <ThunderboltOutlined /> },
    MEAN_REVERSION: { color: "purple", text: "Mean Rev", icon: <SwapOutlined /> },
    NO_SETUP: { color: "default", text: "Chờ", icon: <PauseCircleOutlined /> },
};

/**
 * Get signal badge props
 */
export function getSignalBadge(overall: SignalStrength) {
    return SIGNAL_BADGE_CONFIG[overall];
}

/**
 * Market Regime Badge - Memoized
 */
export const RegimeBadge = memo(function RegimeBadge({ 
    regime, 
    adx,
    priceVsMa200,
}: { 
    regime: MarketRegime; 
    adx?: number | null;
    priceVsMa200?: number;
}) {
    const config = REGIME_BADGE_CONFIG[regime];
    
    const tooltipContent = (
        <div className="text-xs">
            <div className="font-semibold">{config.text}</div>
            {adx && <div>ADX: {adx.toFixed(0)}</div>}
            {priceVsMa200 !== undefined && (
                <div>vs MA200: {priceVsMa200 > 0 ? "+" : ""}{priceVsMa200.toFixed(1)}%</div>
            )}
        </div>
    );
    
    return (
        <Tooltip title={tooltipContent}>
            <Tag color={config.color} className="text-xs cursor-help">
                {config.shortText}
            </Tag>
        </Tooltip>
    );
});

/**
 * Strategy Badge - Memoized
 */
export const StrategyBadge = memo(function StrategyBadge({ 
    strategy, 
    confidence,
    reason,
}: { 
    strategy: StrategyType; 
    confidence?: "strong" | "moderate" | "weak";
    reason?: string;
}) {
    const config = STRATEGY_BADGE_CONFIG[strategy];
    const confidenceLabel = confidence === "strong" ? "Mạnh" : confidence === "moderate" ? "Trung bình" : "Yếu";
    
    const tooltipContent = (
        <div className="text-xs max-w-xs">
            <div className="font-semibold">{config.text}</div>
            {confidence && <div>Độ tin cậy: {confidenceLabel}</div>}
            {reason && <div className="text-gray-400 mt-1">{reason}</div>}
        </div>
    );
    
    return (
        <Tooltip title={tooltipContent}>
            <Tag color={config.color} icon={config.icon} className="text-xs cursor-help">
                {config.text}
            </Tag>
        </Tooltip>
    );
});

/**
 * RVOL Badge - Memoized
 */
export const RvolBadge = memo(function RvolBadge({ 
    rvol, 
    isConfirmed,
}: { 
    rvol: number | null; 
    isConfirmed?: boolean;
}) {
    if (rvol === null) {
        return <Tag color="default">-</Tag>;
    }
    
    let color: string;
    let icon: React.ReactNode = null;
    
    if (rvol >= 2.0) {
        color = "green";
        icon = <FireOutlined />;
    } else if (rvol >= 1.5) {
        color = "lime";
    } else if (rvol >= 1.0) {
        color = "default";
    } else {
        color = "orange";
    }
    
    const tooltipContent = (
        <div className="text-xs">
            <div className="font-semibold">Relative Volume</div>
            <div>RVOL: {rvol.toFixed(2)}x TB 20 phiên</div>
            <div>{isConfirmed ? "Xác nhận dòng tiền" : "Chưa xác nhận"}</div>
        </div>
    );
    
    return (
        <Tooltip title={tooltipContent}>
            <Tag color={color} icon={icon} className="text-xs cursor-help font-mono">
                {rvol.toFixed(1)}x
            </Tag>
        </Tooltip>
    );
});

// ===========================================
// Column Definitions
// ===========================================

/**
 * Create table columns for signals table
 */
export function createSignalColumns(): ColumnsType<StockSignalRow> {
    return [
        {
            title: <HeaderWithTip label="Mã CK" tip="Mã chứng khoán" />,
            dataIndex: "symbol",
            key: "symbol",
            width: 80,
            fixed: "left",
            render: (_, record) => (
                <StockSymbol 
                    symbol={record.symbol}
                    price={record.price}
                    refPrice={record.refPrice}
                    ceiling={record.ceiling}
                    floor={record.floor}
                />
            ),
        },
        {
            title: <HeaderWithTip label="Giá" tip="Giá hiện tại (nghìn VND)" />,
            dataIndex: "price",
            key: "price",
            width: 75,
            align: "right",
            render: (price: number, record) => {
                const position = getPricePosition(price, record.refPrice, record.ceiling, record.floor);
                const colorVar = record.refPrice > 0 ? getPositionColorHex(position) : getPriceColorHex(record.change);
                return (
                    <span className="font-mono font-semibold" style={{ color: colorVar }}>
                        {price > 0 ? (price / 1000).toFixed(2) : "-"}
                    </span>
                );
            },
        },
        {
            title: <HeaderWithTip label={"+/-"} tip="% thay đổi so với tham chiếu" />,
            key: "change",
            width: 80,
            align: "right",
            sorter: (a, b) => a.changePercent - b.changePercent,
            render: (_, record) => {
                const position = getPricePosition(record.price, record.refPrice, record.ceiling, record.floor);
                const colorVar = record.refPrice > 0 ? getPositionColorHex(position) : getPriceColorHex(record.change);
                const icon = record.change > 0 ? <ArrowUpOutlined /> : record.change < 0 ? <ArrowDownOutlined /> : null;
                return (
                    <Space size={2}>
                        {icon && <span style={{ color: colorVar }}>{icon}</span>}
                        <span className="font-mono text-xs" style={{ color: colorVar }}>
                            {record.changePercent.toFixed(2)}%
                        </span>
                    </Space>
                );
            },
        },
        {
            title: <HeaderWithTip label="KL" tip="Khối lượng giao dịch (nghìn)" />,
            dataIndex: "volume",
            key: "volume",
            width: 70,
            align: "right",
            render: (volume: number) => (
                <Text className="font-mono text-xs">
                    {volume > 0 ? (volume / 1000).toFixed(0) + "K" : "-"}
                </Text>
            ),
        },
        {
            title: <HeaderWithTip label="Tín Hiệu" tip="Tín hiệu tổng hợp 3 lớp" />,
            key: "signal",
            width: 115,
            align: "center",
            filters: [
                { text: "MUA MẠNH", value: "STRONG_BUY" },
                { text: "MUA", value: "BUY" },
                { text: "TRUNG LẬP", value: "NEUTRAL" },
                { text: "BÁN", value: "SELL" },
                { text: "BÁN MẠNH", value: "STRONG_SELL" },
            ],
            onFilter: (value, record) => record.signal?.overall === value,
            render: (_, record) => {
                if (record.isLoadingHistory) {
                    return <Spin size="small" />;
                }
                if (!record.signal) {
                    return <Tag color="default">N/A</Tag>;
                }
                
                // Special warning for floor stocks with buy signals
                if (record.isAtFloor && (record.signal.overall === "BUY" || record.signal.overall === "STRONG_BUY")) {
                    return (
                        <Tooltip title="Cổ phiếu đang nằm sàn - Cần xác nhận đảo chiều mạnh">
                            <Tag color="cyan" icon={<StopOutlined />} className="font-semibold cursor-help">
                                SÀN
                            </Tag>
                        </Tooltip>
                    );
                }
                
                const badge = getSignalBadge(record.signal.overall);
                return (
                    <Tooltip title={record.signal.summary}>
                        <Tag 
                            color={badge.color} 
                            icon={badge.icon}
                            className="font-semibold cursor-help"
                        >
                            {badge.text}
                        </Tag>
                    </Tooltip>
                );
            },
        },
        {
            title: <HeaderWithTip label="Xu Hướng" tip="Regime thị trường (Trend/Sideway)" />,
            key: "regime",
            width: 95,
            align: "center",
            filters: [
                { text: "Uptrend Mạnh", value: "UPTREND_STRONG" },
                { text: "Uptrend Yếu", value: "UPTREND_WEAK" },
                { text: "Downtrend", value: "DOWNTREND" },
                { text: "Sideway", value: "SIDEWAY" },
                { text: "Nằm Sàn", value: "FLOOR_PRICE" },
            ],
            onFilter: (value, record) => record.marketRegime === value,
            render: (_, record) => {
                if (record.isLoadingHistory) return <Spin size="small" />;
                if (!record.marketRegime) return <Tag color="default">-</Tag>;
                return (
                    <RegimeBadge 
                        regime={record.marketRegime} 
                        adx={record.signal?.layer1.adx}
                        priceVsMa200={record.signal?.layer1.priceVsMa200}
                    />
                );
            },
        },
        {
            title: <HeaderWithTip label="Chiến Thuật" tip="Setup chiến thuật (Trend/Mean Rev)" />,
            key: "strategy",
            width: 100,
            align: "center",
            filters: [
                { text: "Trend Following", value: "TREND_FOLLOWING" },
                { text: "Mean Reversion", value: "MEAN_REVERSION" },
                { text: "Chờ Setup", value: "NO_SETUP" },
            ],
            onFilter: (value, record) => record.strategy === value,
            render: (_, record) => {
                if (record.isLoadingHistory) return <Spin size="small" />;
                if (!record.strategy) return <Tag color="default">-</Tag>;
                return (
                    <StrategyBadge 
                        strategy={record.strategy}
                        confidence={record.signal?.layer2.confidence}
                        reason={record.signal?.layer2.reason}
                    />
                );
            },
        },
        {
            title: <HeaderWithTip label="RVOL" tip="Relative Volume 20 phiên" />,
            key: "rvol",
            width: 65,
            align: "center",
            sorter: (a, b) => (a.rvol ?? 0) - (b.rvol ?? 0),
            render: (_, record) => {
                if (record.isLoadingHistory) return <Spin size="small" />;
                return (
                    <RvolBadge 
                        rvol={record.rvol}
                        isConfirmed={record.signal?.layer3.isConfirmed}
                    />
                );
            },
        },

        {
            title: <HeaderWithTip label="RSI" tip="Trạng thái RSI" />,
            key: "rsi",
            width: 40,
            align: "center",
            render: (_, record) => {
                const rsi = record.signal?.indicators.find((s: IndicatorSignal) => s.indicator === "RSI");
                if (!rsi) return <Tag color="default">-</Tag>;
                return <IndicatorBadge name="RSI" signal={rsi.signal} value={rsi.value} />;
            },
        },
        {
            title: <HeaderWithTip label="MACD" tip="Trạng thái MACD" />,
            key: "macd",
            width: 40,
            align: "center",
            render: (_, record) => {
                const macd = record.signal?.indicators.find((s: IndicatorSignal) => s.indicator === "MACD");
                if (!macd) return <Tag color="default">-</Tag>;
                return <IndicatorBadge name="MACD" signal={macd.signal} value={macd.value} />;
            },
        },
        {
            title: <HeaderWithTip label="BB" tip="Trạng thái Bollinger Bands" />,
            key: "bb",
            width: 40,
            align: "center",
            render: (_, record) => {
                const bb = record.signal?.indicators.find((s: IndicatorSignal) => s.indicator === "BB");
                if (!bb) return <Tag color="default">-</Tag>;
                return <IndicatorBadge name="Bollinger Bands" signal={bb.signal} value={bb.value} />;
            },
        },

        // ===== Enhanced Signal Columns =====
        {
            title: <HeaderWithTip label="MTF" tip="Đồng thuận đa khung thời gian" />,
            key: "mtf",
            width: 45,
            align: "center",
            render: (_, record) => {
                const mtf = record.enhanced?.multiTimeframe;
                if (!mtf) return <Tag color="default">-</Tag>;
                const color = mtf.isAligned ? "green" : mtf.confidenceAdjust === -1 ? "red" : "default";
                const icon = mtf.isAligned ? <CheckCircleOutlined /> : mtf.confidenceAdjust === -1 ? <CloseCircleOutlined /> : <MinusOutlined />;
                return (
                    <Tooltip title={
                        <div className="text-xs">
                            <div className="font-semibold">Multi-Timeframe</div>
                            <div>{mtf.reason}</div>
                        </div>
                    }>
                        <Tag color={color} icon={icon} className="text-xs px-1 py-0 cursor-help">
                            {mtf.isAligned ? "✓" : "✗"}
                        </Tag>
                    </Tooltip>
                );
            },
        },
        {
            title: <HeaderWithTip label="PK" tip="Phân kỳ RSI/MACD" />,
            key: "divergence",
            width: 55,
            align: "center",
            filters: [
                { text: "PK Tăng", value: "bullish" },
                { text: "PK Giảm", value: "bearish" },
                { text: "Không PK", value: "none" },
            ],
            onFilter: (value, record) => {
                if (value === "none") return !record.enhanced?.divergence?.hasDivergence;
                return record.enhanced?.divergence?.strongest === value;
            },
            render: (_, record) => {
                const div = record.enhanced?.divergence;
                if (!div || !div.hasDivergence) return <Tag color="default">-</Tag>;
                const color = div.strongest === "bullish" ? "green" : "red";
                const label = div.strongest === "bullish" ? "Tăng" : "Giảm";
                return (
                    <Tooltip title={
                        <div className="text-xs">
                            <div className="font-semibold">Phân Kỳ</div>
                            <div>{div.reason}</div>
                        </div>
                    }>
                        <Tag color={color} className="text-xs px-1 py-0 cursor-help font-semibold">
                            {label}
                        </Tag>
                    </Tooltip>
                );
            },
        },
        {
            title: <HeaderWithTip label="S/R" tip="Vị trí hỗ trợ/kháng cự" />,
            key: "sr",
            width: 60,
            align: "center",
            filters: [
                { text: "Gần hỗ trợ", value: "near_support" },
                { text: "Gần kháng cự", value: "near_resistance" },
                { text: "Giữa vùng", value: "mid_range" },
            ],
            onFilter: (value, record) => record.enhanced?.srProximity?.zone === value,
            sorter: (a, b) => (a.enhanced?.srProximity?.riskReward ?? 0) - (b.enhanced?.srProximity?.riskReward ?? 0),
            render: (_, record) => {
                const sr = record.enhanced?.srProximity;
                if (!sr) return <Tag color="default">-</Tag>;
                const color = sr.zone === "near_support" ? "green" 
                    : sr.zone === "near_resistance" ? "red" 
                    : sr.zone === "mid_range" ? "blue" 
                    : "default";
                const zoneShort: Record<string, string> = {
                    near_support: "HT",
                    near_resistance: "KC",
                    mid_range: "Giữa",
                    above_all: "Trên",
                    below_all: "Dưới",
                };
                return (
                    <Tooltip title={
                        <div className="text-xs">
                            <div className="font-semibold">Hỗ Trợ / Kháng Cự</div>
                            <div>{sr.reason}</div>
                            <div className="mt-1">Hỗ trợ: {sr.nearestSupport.toFixed(2)}</div>
                            <div>Kháng cự: {sr.nearestResistance.toFixed(2)}</div>
                        </div>
                    }>
                        <Tag color={color} icon={<AimOutlined />} className="text-xs px-1 py-0 cursor-help">
                            {zoneShort[sr.zone] ?? sr.zone}
                        </Tag>
                    </Tooltip>
                );
            },
        },
        {
            title: <HeaderWithTip label="Tuổi" tip="Độ tươi tín hiệu" />,
            key: "age",
            width: 50,
            align: "center",
            sorter: (a, b) => (a.enhanced?.signalAging?.freshness ?? 0) - (b.enhanced?.signalAging?.freshness ?? 0),
            render: (_, record) => {
                const age = record.enhanced?.signalAging;
                if (!age) return <Tag color="default">-</Tag>;
                const color = age.label === "fresh" ? "green" 
                    : age.label === "recent" ? "lime" 
                    : age.label === "aging" ? "orange" 
                    : "red";
                return (
                    <Tooltip title={
                        <div className="text-xs">
                            <div className="font-semibold">Tuổi Tín Hiệu</div>
                            <div>{age.reason}</div>
                        </div>
                    }>
                        <Tag color={color} icon={<ClockCircleOutlined />} className="text-xs px-1 py-0 cursor-help">
                            {age.freshness}%
                        </Tag>
                    </Tooltip>
                );
            },
        },
        {
            title: <HeaderWithTip label="Điểm" tip="Điểm rủi ro/hiệu quả" />,
            key: "score",
            width: 55,
            align: "center",
            sorter: (a, b) => (a.enhanced?.riskRanking?.score ?? 0) - (b.enhanced?.riskRanking?.score ?? 0),
            defaultSortOrder: "descend",
            render: (_, record) => {
                const rank = record.enhanced?.riskRanking;
                if (!rank) return <Tag color="default">-</Tag>;
                const gradeColor: Record<string, string> = {
                    A: "green", B: "lime", C: "blue", D: "orange", F: "red",
                };
                return (
                    <Tooltip title={
                        <div className="text-xs">
                            <div className="font-semibold">Risk-Adjusted Score: {rank.score}/100</div>
                            <div>{rank.reason}</div>
                            <div className="mt-1">Đồng thuận: {rank.factors.consensus}%</div>
                            <div>RVOL: {rank.factors.volumeScore}%</div>
                            <div>Biến động: {rank.factors.volatilityScore}%</div>
                            <div>Xu hướng: {rank.factors.trendScore}%</div>
                            <div>S/R: {rank.factors.srScore}%</div>
                        </div>
                    }>
                        <Tag color={gradeColor[rank.grade] ?? "default"} icon={<SafetyCertificateOutlined />} className="text-xs px-1 py-0 cursor-help font-bold">
                            {rank.score}
                        </Tag>
                    </Tooltip>
                );
            },
        },
        {
            title: <HeaderWithTip label="Stop" tip="Trailing stop theo ATR" />,
            key: "stop",
            width: 75,
            align: "center",
            render: (_, record) => {
                const stop = record.enhanced?.trailingStop;
                if (!stop) return <Tag color="default">-</Tag>;
                const rec = stop[stop.recommended];
                const recLabel = stop.recommended === "conservative" ? "BT" 
                    : stop.recommended === "aggressive" ? "NĐ" : "TC";
                const recColor = stop.recommended === "conservative" ? "blue" 
                    : stop.recommended === "aggressive" ? "red" : "orange";
                return (
                    <Tooltip title={
                        <div className="text-xs">
                            <div className="font-semibold">Trailing Stop (ATR: {stop.atrPercent.toFixed(1)}%)</div>
                            <div>{stop.reason}</div>
                            <div className="mt-1" style={{ color: '#60a5fa' }}>Bảo thủ (3×ATR): {stop.conservative.price.toFixed(2)} (-{stop.conservative.distance.toFixed(1)}%)</div>
                            <div style={{ color: '#fb923c' }}>Tiêu chuẩn (2×ATR): {stop.standard.price.toFixed(2)} (-{stop.standard.distance.toFixed(1)}%)</div>
                            <div style={{ color: '#f87171' }}>Năng động (1.5×ATR): {stop.aggressive.price.toFixed(2)} (-{stop.aggressive.distance.toFixed(1)}%)</div>
                        </div>
                    }>
                        <Tag color={recColor} className="text-xs px-1 py-0 cursor-help font-mono">
                            {recLabel} {rec.distance.toFixed(1)}%
                        </Tag>
                    </Tooltip>
                );
            },
        },
    ];
}

// ===========================================
// Main Table Component
// ===========================================

interface SignalTableProps {
    data: StockSignalRow[];
    loading?: boolean;
}

/**
 * Memoized Signal Table Component
 */
export const SignalTable = memo(function SignalTable({ data, loading }: SignalTableProps) {
    const columns = useMemo(() => createSignalColumns(), []);

    return (
        <Table
            columns={columns}
            dataSource={data}
            rowKey="symbol"
            pagination={{ 
                pageSize: 50, 
                showSizeChanger: true, 
                showTotal: (total, range) => `${range[0]}-${range[1]} / ${total} cổ phiếu`,
                pageSizeOptions: ["50", "100", "200"],
            }}
            size="small"
            tableLayout="fixed"
            scroll={{ x: 1600, y: 450 }}
            loading={loading}
            showSorterTooltip={false}
            rowClassName={(record) => {
                if (record.isAtFloor) return "bg-cyan-50 dark:bg-cyan-900/10";
                if (!record.signal) return "";
                if (record.signal.overall === "STRONG_BUY") return "bg-green-50 dark:bg-green-900/10";
                if (record.signal.overall === "STRONG_SELL") return "bg-red-50 dark:bg-red-900/10";
                return "";
            }}
        />
    );
});

export default SignalTable;
