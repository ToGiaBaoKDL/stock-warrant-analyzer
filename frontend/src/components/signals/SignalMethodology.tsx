/**
 * Signal Methodology Component
 * 
 * Displays the formula, weights, and scoring methodology
 * as a clean dropdown/collapsible section with proper dark mode support
 */

import React from "react";
import { Collapse, Typography, Space, Tag, theme } from "antd";
import { InfoCircleOutlined, CalculatorOutlined, WarningOutlined, CheckCircleOutlined, CloseCircleOutlined, QuestionCircleOutlined } from "@ant-design/icons";
import { SIGNAL_COLORS, type SignalStrength } from "@/utils/indicators";

const { Text, Paragraph } = Typography;
const { useToken } = theme;

// Reusable styled components for dark mode compatibility
const CodeBlock = ({ children }: { children: React.ReactNode }) => {
    const { token } = useToken();
    return (
        <div 
            className="p-3 rounded-lg font-mono text-xs leading-relaxed"
            style={{ 
                backgroundColor: token.colorFillSecondary,
                border: `1px solid ${token.colorBorderSecondary}`,
            }}
        >
            {children}
        </div>
    );
};

const InfoBox = ({ 
    children, 
    type = "info" 
}: { 
    children: React.ReactNode; 
    type?: "info" | "warning" | "success" | "error";
}) => {
    const { token } = useToken();
    const colors = {
        info: { bg: token.colorInfoBg, border: token.colorInfoBorder },
        warning: { bg: token.colorWarningBg, border: token.colorWarningBorder },
        success: { bg: token.colorSuccessBg, border: token.colorSuccessBorder },
        error: { bg: token.colorErrorBg, border: token.colorErrorBorder },
    };
    return (
        <div 
            className="p-3 rounded-lg text-sm"
            style={{ 
                backgroundColor: colors[type].bg,
                border: `1px solid ${colors[type].border}`,
            }}
        >
            {children}
        </div>
    );
};

const ScoringList = ({ items }: { items: { condition: string; result: string; color?: "green" | "red" }[] }) => {
    const { token } = useToken();
    return (
        <ul className="mt-2 space-y-1.5 ml-4 text-sm" style={{ color: token.colorTextSecondary }}>
            {items.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                    <Text code className="text-xs whitespace-nowrap">{item.condition}</Text>
                    <span>→</span>
                    <Text style={{ color: item.color === "green" ? token.colorSuccess : item.color === "red" ? token.colorError : token.colorTextSecondary }}>
                        {item.result}
                    </Text>
                </li>
            ))}
        </ul>
    );
};

export const SignalMethodology = React.memo(function SignalMethodology() {
    const { token } = useToken();
    
    return (
        <Collapse 
            className="mt-3"
            ghost
            expandIconPlacement="end"
            items={[
                {
                    key: "methodology",
                    label: (
                        <Space className="text-sm">
                            <InfoCircleOutlined style={{ color: token.colorPrimary }} />
                            <Text strong>Phương Pháp Tính Điểm & Công Thức</Text>
                        </Space>
                    ),
                    children: (
                        <div style={{ backgroundColor: token.colorBgContainer }} className="rounded-lg p-1">
                            <Collapse 
                                ghost 
                                defaultActiveKey={[]}
                                expandIconPlacement="end"
                                items={[
                                    {
                                        key: "overview",
                                        label: (
                                            <Space>
                                                {/* <CalculatorOutlined style={{ color: token.colorPrimary }} /> */}
                                                <Text strong>Tổng Quan Hệ Thống</Text>
                                            </Space>
                                        ),
                                        children: (
                                            <Space direction="vertical" className="w-full" size="middle">
                                                <Paragraph style={{ color: token.colorTextSecondary, marginBottom: 0 }}>
                                                    Hệ thống sử dụng <Text strong>5 chỉ báo kỹ thuật</Text> với trọng số khác nhau 
                                                    để tính điểm từ <Text strong style={{ color: token.colorError }}>-100</Text> đến{" "}
                                                    <Text strong style={{ color: token.colorSuccess }}>+100</Text>.
                                                </Paragraph>
                                                
                                                <CodeBlock>
                                                    <div style={{ color: token.colorTextSecondary }}>
                                                        <Text strong style={{ color: token.colorText }}>Công thức:</Text>
                                                        <div className="mt-2" style={{ color: token.colorText }}>
                                                            Score = (RSI × 20%) + (MACD × 25%) + (BB × 15%) + (MA × 25%) + (MOM × 15%)
                                                        </div>
                                                    </div>
                                                </CodeBlock>

                                                <div>
                                                    <Text strong style={{ color: token.colorText }}>Ngưỡng phân loại:</Text>
                                                    <div className="mt-2 space-y-1.5">
                                                        <div className="flex items-center gap-2">
                                                            <Tag 
                                                                style={{ 
                                                                    // backgroundColor: SIGNAL_COLORS.STRONG_BUY,
                                                                    borderColor: SIGNAL_COLORS.STRONG_BUY,
                                                                    color: SIGNAL_COLORS.STRONG_BUY
                                                                }}
                                                                className="m-0"
                                                            >
                                                                STRONG BUY
                                                            </Tag>
                                                            <Text>Score ≥ 45 và ≥3 chỉ báo tăng</Text>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Tag 
                                                                style={{ 
                                                                    // backgroundColor: SIGNAL_COLORS.BUY,
                                                                    borderColor: SIGNAL_COLORS.BUY,
                                                                    color: SIGNAL_COLORS.BUY
                                                                }}
                                                                className="m-0"
                                                            >
                                                                BUY
                                                            </Tag>
                                                            <Text>Score ≥ 25 và ≥2 chỉ báo tăng</Text>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Tag 
                                                                style={{ 
                                                                    // backgroundColor: SIGNAL_COLORS.NEUTRAL, 
                                                                    borderColor: SIGNAL_COLORS.NEUTRAL,
                                                                    color: SIGNAL_COLORS.NEUTRAL
                                                                }}
                                                                className="m-0"
                                                            >
                                                                NEUTRAL
                                                            </Tag>
                                                            <Text>|Score| &lt; 25 hoặc tín hiệu trái chiều</Text>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Tag 
                                                                style={{ 
                                                                    // backgroundColor: SIGNAL_COLORS.SELL, 
                                                                    borderColor: SIGNAL_COLORS.SELL,
                                                                    color: SIGNAL_COLORS.SELL
                                                                }}
                                                                className="m-0"
                                                            >
                                                                SELL
                                                            </Tag>
                                                            <Text>Score ≤ -25 và ≥2 chỉ báo giảm</Text>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Tag 
                                                                style={{ 
                                                                    // backgroundColor: SIGNAL_COLORS.STRONG_SELL,
                                                                    borderColor: SIGNAL_COLORS.STRONG_SELL,
                                                                    color: SIGNAL_COLORS.STRONG_SELL
                                                                }}
                                                                className="m-0"
                                                            >
                                                                STRONG SELL
                                                            </Tag>
                                                            <Text>Score ≤ -45 và ≥3 chỉ báo giảm</Text>
                                                        </div>
                                                    </div>
                                                </div>

                                                <InfoBox type="warning">
                                                    <Text style={{ color: token.colorWarning }}>
                                                        {/* <WarningOutlined className="mr-1" /> */}
                                                        <strong>Lưu ý:</strong> Nếu có ≥2 chỉ báo tăng VÀ ≥2 chỉ báo giảm cùng lúc 
                                                        → Kết luận NEUTRAL (tín hiệu trái chiều)
                                                    </Text>
                                                </InfoBox>
                                            </Space>
                                        ),
                                    },
                                    {
                                        key: "rsi",
                                        label: (
                                            <Space>
                                                <Text strong style={{ color: token.colorText }}>RSI</Text>
                                                <Tag color="blue" className="m-0 text-xs">20%</Tag>
                                                <Text type="secondary" className="text-xs">Momentum</Text>
                                            </Space>
                                        ),
                                        children: (
                                            <Space orientation="vertical" className="w-full" size="small">
                                                <Text style={{ color: token.colorTextSecondary }} className="text-sm">
                                                    Relative Strength Index - Đo trạng thái quá mua/quá bán.
                                                </Text>

                                                <CodeBlock>
                                                    <div style={{ color: token.colorText }}>
                                                        RSI = 100 - (100 / (1 + RS))
                                                        <br />
                                                        <span style={{ color: token.colorTextTertiary }}>RS = Avg Gain / Avg Loss | Chu kỳ: 14</span>
                                                    </div>
                                                </CodeBlock>

                                                <ScoringList items={[
                                                    { condition: "RSI < 20", result: "+60 đến +90 điểm", color: "green" },
                                                    { condition: "RSI 20-30", result: "+40 đến +60 điểm", color: "green" },
                                                    { condition: "RSI 30-70", result: "-20 đến +20 điểm (trung lập)" },
                                                    { condition: "RSI 70-80", result: "-40 đến -60 điểm", color: "red" },
                                                    { condition: "RSI > 80", result: "-60 đến -90 điểm", color: "red" },
                                                ]} />
                                            </Space>
                                        ),
                                    },
                                    {
                                        key: "macd",
                                        label: (
                                            <Space>
                                                <Text strong style={{ color: token.colorText }}>MACD</Text>
                                                <Tag color="orange" className="m-0 text-xs">25%</Tag>
                                                <Text type="secondary" className="text-xs">Trend</Text>
                                            </Space>
                                        ),
                                        children: (
                                            <Space orientation="vertical" className="w-full" size="small">
                                                <Text style={{ color: token.colorTextSecondary }} className="text-sm">
                                                    Moving Average Convergence Divergence - Xác định xu hướng và động lượng.
                                                </Text>

                                                <CodeBlock>
                                                    <div style={{ color: token.colorText }}>
                                                        MACD = EMA(12) - EMA(26)
                                                        <br />
                                                        Signal = EMA(9) của MACD
                                                        <br />
                                                        <span style={{ color: token.colorTextTertiary }}>Histogram = MACD - Signal</span>
                                                    </div>
                                                </CodeBlock>

                                                <ScoringList items={[
                                                    { condition: "MACD > Signal + Golden Cross", result: "+60 đến +100 điểm", color: "green" },
                                                    { condition: "MACD > Signal (mạnh)", result: "+35 đến +75 điểm", color: "green" },
                                                    { condition: "MACD > Signal (yếu)", result: "+15 điểm" },
                                                    { condition: "MACD < Signal (yếu)", result: "-15 điểm" },
                                                    { condition: "MACD < Signal (mạnh)", result: "-35 đến -75 điểm", color: "red" },
                                                    { condition: "MACD < Signal + Death Cross", result: "-60 đến -100 điểm", color: "red" },
                                                ]} />
                                            </Space>
                                        ),
                                    },
                                    {
                                        key: "bollinger",
                                        label: (
                                            <Space>
                                                <Text strong style={{ color: token.colorText }}>Bollinger</Text>
                                                <Tag color="purple" className="m-0 text-xs">15%</Tag>
                                                <Text type="secondary" className="text-xs">Volatility</Text>
                                            </Space>
                                        ),
                                        children: (
                                            <Space orientation="vertical" className="w-full" size="small">
                                                <Text style={{ color: token.colorTextSecondary }} className="text-sm">
                                                    Bollinger Bands - Đo biến động và vùng quá mua/bán dựa trên %B.
                                                </Text>

                                                <CodeBlock>
                                                    <div style={{ color: token.colorText }}>
                                                        Middle = SMA(20) | Upper/Lower = ±2σ
                                                        <br />
                                                        <span style={{ color: token.colorTextTertiary }}>%B = (Price - Lower) / (Upper - Lower)</span>
                                                    </div>
                                                </CodeBlock>

                                                <ScoringList items={[
                                                    { condition: "%B < 0%", result: "+65 đến +100 điểm (quá bán)", color: "green" },
                                                    { condition: "%B 0-20%", result: "+25 đến +45 điểm", color: "green" },
                                                    { condition: "%B 20-80%", result: "-7 đến +7 điểm (trung lập)" },
                                                    { condition: "%B 80-100%", result: "-25 đến -45 điểm", color: "red" },
                                                    { condition: "%B > 100%", result: "-65 đến -100 điểm (quá mua)", color: "red" },
                                                ]} />
                                            </Space>
                                        ),
                                    },
                                    {
                                        key: "ma",
                                        label: (
                                            <Space>
                                                <Text strong style={{ color: token.colorText }}>MA Trend</Text>
                                                <Tag color="cyan" className="m-0 text-xs">25%</Tag>
                                                <Text type="secondary" className="text-xs">Trend</Text>
                                            </Space>
                                        ),
                                        children: (
                                            <Space orientation="vertical" className="w-full" size="small">
                                                <Text style={{ color: token.colorTextSecondary }} className="text-sm">
                                                    Moving Average Crossover - Xác định xu hướng chính qua MA20/MA50.
                                                </Text>

                                                <CodeBlock>
                                                    <div style={{ color: token.colorText }}>
                                                        MA20 = SMA(20) | MA50 = SMA(50)
                                                        <br />
                                                        <span style={{ color: token.colorTextTertiary }}>Spread = (MA20 - MA50) / MA50 × 100%</span>
                                                    </div>
                                                </CodeBlock>

                                                <ScoringList items={[
                                                    { condition: "Giá > MA20 > MA50 + Rising", result: "+55 đến +100 điểm", color: "green" },
                                                    { condition: "Golden Cross", result: "+15 điểm bonus", color: "green" },
                                                    { condition: "Xu hướng chưa rõ", result: "-25 đến +25 điểm" },
                                                    { condition: "Giá < MA20 < MA50 + Falling", result: "-55 đến -100 điểm", color: "red" },
                                                    { condition: "Death Cross", result: "-15 điểm bonus", color: "red" },
                                                ]} />
                                            </Space>
                                        ),
                                    },
                                    {
                                        key: "momentum",
                                        label: (
                                            <Space>
                                                <Text strong style={{ color: token.colorText }}>Momentum</Text>
                                                <Tag color="magenta" className="m-0 text-xs">15%</Tag>
                                                <Text type="secondary" className="text-xs">Strength</Text>
                                            </Space>
                                        ),
                                        children: (
                                            <Space orientation="vertical" className="w-full" size="small">
                                                <Text style={{ color: token.colorTextSecondary }} className="text-sm">
                                                    Price Momentum - Đo tốc độ thay đổi giá, chuẩn hóa theo ATR.
                                                </Text>

                                                <CodeBlock>
                                                    <div style={{ color: token.colorText }}>
                                                        ROC = (Close - Close[10]) / Close[10] × 100%
                                                        <br />
                                                        <span style={{ color: token.colorTextTertiary }}>Score = (ROC / ATR%) × 18 | Giới hạn ±85</span>
                                                    </div>
                                                </CodeBlock>

                                                <ScoringList items={[
                                                    { condition: "Momentum > +18", result: "Tín hiệu tăng", color: "green" },
                                                    { condition: "Momentum -18 đến +18", result: "Trung lập" },
                                                    { condition: "Momentum < -18", result: "Tín hiệu giảm", color: "red" },
                                                    { condition: "Consistent (3 periods)", result: "±10 điểm bonus" },
                                                ]} />
                                            </Space>
                                        ),
                                    },
                                    {
                                        key: "disclaimer",
                                        label: (
                                            <Space>
                                                {/* <WarningOutlined style={{ color: token.colorWarning }} /> */}
                                                <Text strong style={{ color: token.colorWarning }}>Lưu Ý Quan Trọng</Text>
                                            </Space>
                                        ),
                                        children: (
                                            <Space orientation="vertical" className="w-full" size="middle">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <InfoBox type="success">
                                                        <div className="flex items-start gap-2">
                                                            <CheckCircleOutlined style={{ color: token.colorSuccess, marginTop: 2 }} />
                                                            <div>
                                                                <Text strong style={{ color: token.colorSuccess }}>Nên làm:</Text>
                                                                <ul className="mt-1 text-xs space-y-0.5 ml-4" style={{ color: token.colorTextSecondary }}>
                                                                    <li>Kết hợp phân tích cơ bản</li>
                                                                    <li>Xem xét tin tức và thanh khoản</li>
                                                                    <li>Đặt stop-loss hợp lý</li>
                                                                    <li>Ưu tiên ≥4/5 chỉ báo cùng chiều</li>
                                                                </ul>
                                                            </div>
                                                        </div>
                                                    </InfoBox>
                                                    
                                                    <InfoBox type="error">
                                                        <div className="flex items-start gap-2">
                                                            <CloseCircleOutlined style={{ color: token.colorError, marginTop: 2 }} />
                                                            <div>
                                                                <Text strong style={{ color: token.colorError }}>Không nên:</Text>
                                                                <ul className="mt-1 text-xs space-y-0.5 ml-4" style={{ color: token.colorTextSecondary }}>
                                                                    <li>All-in vào 1 cổ phiếu</li>
                                                                    <li>Bỏ qua tín hiệu NEUTRAL</li>
                                                                    <li>Giao dịch cổ phiếu kém thanh khoản</li>
                                                                    <li>Mua khi có tin xấu dù điểm tốt</li>
                                                                </ul>
                                                            </div>
                                                        </div>
                                                    </InfoBox>
                                                </div>

                                                <InfoBox type="warning">
                                                    <div className="flex items-start gap-2">
                                                        {/* <QuestionCircleOutlined style={{ color: token.colorWarning, marginTop: 2 }} /> */}
                                                        <Text className="text-xs" style={{ color: token.colorTextSecondary }}>
                                                            <strong style={{ color: token.colorWarning }}>Disclaimer:</strong> Chỉ báo kỹ thuật dựa trên dữ liệu lịch sử 
                                                            và không đảm bảo kết quả tương lai. Nên tham khảo ý kiến chuyên gia tài chính.
                                                        </Text>
                                                    </div>
                                                </InfoBox>
                                            </Space>
                                        ),
                                    },
                                ]}
                            />
                        </div>
                    ),
                },
            ]}
        />
    );
});
