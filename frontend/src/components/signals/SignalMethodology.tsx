/**
 * Signal Methodology Component
 *
 * Hiển thị phương pháp hệ thống Phễu 3 Lớp.
 * Quyết định dựa hoàn toàn trên pipeline (Regime → Setup → Volume).
 * Không sử dụng điểm trung gian.
 */

import React from "react";
import { Collapse, Typography, Space, Tag, theme } from "antd";
import { InfoCircleOutlined, CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import { SIGNAL_COLORS } from "@/utils/indicators";

const { Text } = Typography;
const { useToken } = theme;

const CodeBlock = ({ children }: { children: React.ReactNode }) => {
    const { token } = useToken();
    return (
        <div
            className="p-3 rounded-lg text-xs leading-relaxed"
            style={{
                backgroundColor: token.colorFillSecondary,
                border: `1px solid ${token.colorBorderSecondary}`,
                fontFamily: "var(--font-inter), 'Inter', sans-serif",
                letterSpacing: "0.01em",
            }}
        >
            {children}
        </div>
    );
};

const InfoBox = ({
    children,
    type = "info",
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

const RuleList = ({ items }: { items: { condition: string; result: string; color?: "green" | "red" }[] }) => {
    const { token } = useToken();
    return (
        <ul className="mt-2 space-y-1.5 ml-4 text-sm" style={{ color: token.colorTextSecondary }}>
            {items.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                    <Text code className="text-xs whitespace-nowrap">{item.condition}</Text>
                    <span>&rarr;</span>
                    <Text style={{
                        color: item.color === "green" ? token.colorSuccess
                            : item.color === "red" ? token.colorError
                            : token.colorTextSecondary
                    }}>
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
                            <Text strong>Phương Pháp: Hệ Thống Phễu 3 Lớp (3-Layer Funnel)</Text>
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
                                        label: <Text strong>Tổng Quan Hệ Thống</Text>,
                                        children: (
                                            <Space direction="vertical" className="w-full" size="middle">
                                                <Text style={{ color: token.colorTextSecondary }}>
                                                    Hệ thống sử dụng <Text strong>pipeline 3 lớp lọc</Text> để loại bỏ
                                                    tín hiệu nhiễu và false positive. Tín hiệu phải vượt qua cả 3 lớp
                                                    mới được xem là đáng tin cậy.
                                                </Text>

                                                <CodeBlock>
                                                    <div style={{ color: token.colorText }}>
                                                        <Text strong style={{ color: token.colorText }}>Pipeline:</Text>
                                                        <div className="mt-2" style={{ color: token.colorText }}>
                                                            Layer 1: Market Regime (EMA50, MA200, ADX)
                                                        </div>
                                                        <div style={{ color: token.colorText }}>
                                                            &nbsp;&nbsp;&rarr; Layer 2: Setup (Trend Following / Mean Reversion)
                                                        </div>
                                                        <div style={{ color: token.colorText }}>
                                                            &nbsp;&nbsp;&nbsp;&nbsp;&rarr; Layer 3: Volume Confirmation (RVOL)
                                                        </div>
                                                        <div className="mt-1" style={{ color: token.colorTextTertiary }}>
                                                            Mỗi lớp là bộ lọc. Không có setup = NEUTRAL. Có setup nhưng thiếu volume = giảm bậc.
                                                        </div>
                                                    </div>
                                                </CodeBlock>

                                                <div>
                                                    <Text strong style={{ color: token.colorText }}>
                                                        Quyết định cuối cùng (không dùng điểm):
                                                    </Text>
                                                    <div className="mt-2 space-y-1.5">
                                                        {([
                                                            { tag: "STRONG BUY", color: SIGNAL_COLORS.STRONG_BUY, desc: "Confidence strong + Volume xác nhận + Uptrend hoặc Sideway" },
                                                            { tag: "BUY", color: SIGNAL_COLORS.BUY, desc: "Confidence strong (chưa volume), hoặc moderate + volume xác nhận" },
                                                            { tag: "NEUTRAL", color: SIGNAL_COLORS.NEUTRAL, desc: "Không có setup, volume yếu, vi phạm Golden Rule, hoặc nằm sàn" },
                                                            { tag: "SELL", color: SIGNAL_COLORS.SELL, desc: "Mean Reversion SELL trong Downtrend/Sideway" },
                                                            { tag: "STRONG SELL", color: SIGNAL_COLORS.STRONG_SELL, desc: "SELL strong + Volume xác nhận + Downtrend/Sideway" },
                                                        ] as const).map(({ tag, color, desc }) => (
                                                            <div key={tag} className="flex items-center gap-2">
                                                                <Tag style={{ borderColor: color, color }} className="m-0">{tag}</Tag>
                                                                <Text>{desc}</Text>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                <InfoBox type="warning">
                                                    <Text style={{ color: token.colorWarning }}>
                                                        <strong>Golden Rules:</strong> Uptrend chỉ tìm MUA (tín hiệu bán = NEUTRAL).
                                                        Downtrend: BUY chỉ khi Mean Reversion strong + volume xác nhận.
                                                        Nằm Sàn: BUY chỉ khi Mean Reversion strong + volume xác nhận.
                                                        Không SELL ở Sàn hoặc Uptrend.
                                                    </Text>
                                                </InfoBox>
                                            </Space>
                                        ),
                                    },
                                    {
                                        key: "layer1",
                                        label: (
                                            <Space>
                                                <Text strong style={{ color: token.colorText }}>Layer 1: Market Regime</Text>
                                                <Tag color="green" className="m-0 text-xs">Xu Hướng</Tag>
                                            </Space>
                                        ),
                                        children: (
                                            <Space direction="vertical" className="w-full" size="small">
                                                <Text style={{ color: token.colorTextSecondary }} className="text-sm">
                                                    Xác định &quot;luật chơi&quot; TRƯỚC KHI phân tích tín hiệu. Dùng EMA50, MA200, ADX.
                                                </Text>

                                                <CodeBlock>
                                                    <div style={{ color: token.colorText }}>
                                                        1. Nằm Sàn: &nbsp;&nbsp;&nbsp;&nbsp;Giá &lt;= Giá sàn <span style={{ color: token.colorTextTertiary }}>(kiểm tra trước)</span>
                                                        <br />
                                                        2. Uptrend Mạnh: Giá &gt; MA200 &amp; EMA50 &gt; MA200 &amp; ADX &gt;= 25
                                                        <br />
                                                        3. Uptrend Yếu: &nbsp;Giá &gt; MA200 &amp; EMA50 &gt; MA200 &amp; ADX &lt; 25
                                                        <br />
                                                        4. Downtrend: &nbsp;&nbsp;&nbsp;Giá &lt; MA200
                                                        <br />
                                                        5. Sideway: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Tất cả trường hợp còn lại
                                                        <br />
                                                        <span style={{ color: token.colorTextTertiary }}>Nếu không đủ dữ liệu MA200 &rarr; mặc định Sideway</span>
                                                    </div>
                                                </CodeBlock>

                                                <RuleList items={[
                                                    { condition: "ADX >= 25", result: "Xu hướng mạnh - Uptrend Strong (nếu giá > MA200)", color: "green" },
                                                    { condition: "ADX < 25", result: "Xu hướng yếu - Uptrend Weak (nếu giá > MA200)" },
                                                    { condition: "Giá < MA200", result: "Downtrend (ADX không ảnh hưởng)", color: "red" },
                                                    { condition: "Còn lại", result: "Sideway" },
                                                ]} />
                                            </Space>
                                        ),
                                    },
                                    {
                                        key: "layer2",
                                        label: (
                                            <Space>
                                                <Text strong style={{ color: token.colorText }}>Layer 2: Setup</Text>
                                                <Tag color="blue" className="m-0 text-xs">Chiến Thuật</Tag>
                                            </Space>
                                        ),
                                        children: (
                                            <Space direction="vertical" className="w-full" size="small">
                                                <Text style={{ color: token.colorTextSecondary }} className="text-sm">
                                                    Chọn chiến thuật dựa trên Market Regime. Mỗi regime có logic riêng.
                                                    Layer 2 trả về <Text code>direction</Text> (BUY/SELL/NONE) và{" "}
                                                    <Text code>confidence</Text> (strong/moderate/weak).
                                                </Text>

                                                <div>
                                                    <Text strong style={{ color: token.colorPrimary }}>A. Trend Following (Đánh theo xu hướng)</Text>
                                                    <Text className="text-sm block mt-1" style={{ color: token.colorTextSecondary }}>
                                                        Áp dụng khi: Uptrend (Mạnh hoặc Yếu). Tìm điểm pullback để mua.
                                                        MACD hỗ trợ = MACD &gt; Signal Line hoặc Histogram &gt; 0.
                                                    </Text>
                                                    <RuleList items={[
                                                        { condition: "RSI 35-55 + MACD hỗ trợ", result: "BUY, confidence moderate", color: "green" },
                                                        { condition: "+ Uptrend Mạnh + Golden Cross gần đây", result: "BUY, confidence strong", color: "green" },
                                                        { condition: "RSI < 35 trong uptrend", result: "NO_SETUP - Trend có thể gãy, chờ xác nhận" },
                                                        { condition: "RSI > 70 trong uptrend", result: "NO_SETUP - Quá cao, chờ pullback" },
                                                        { condition: "Không thỏa điều kiện trên", result: "NO_SETUP - Chưa có setup rõ ràng" },
                                                    ]} />
                                                </div>

                                                <div className="mt-3">
                                                    <Text strong style={{ color: "var(--color-ceiling)" }}>B. Mean Reversion (Bắt đáy/đỉnh cực đoan)</Text>
                                                    <Text className="text-sm block mt-1" style={{ color: token.colorTextSecondary }}>
                                                        Áp dụng khi: Downtrend / Sideway / Nằm Sàn. SELL chỉ trong Downtrend/Sideway (không ở Sàn).
                                                    </Text>
                                                    <RuleList items={[
                                                        { condition: "Giá < BB Lower VÀ RSI < 25", result: "BUY, confidence moderate", color: "green" },
                                                        { condition: "+ Độ lệch > 2σ hoặc RSI < 20", result: "BUY, confidence strong", color: "green" },
                                                        { condition: "Giá > BB Upper VÀ RSI > 70", result: "SELL, confidence strong (chỉ Downtrend/Sideway)", color: "red" },
                                                        { condition: "Chỉ 1 trong 2 điều kiện", result: "NO_SETUP - chưa đủ tín hiệu" },
                                                    ]} />
                                                </div>
                                            </Space>
                                        ),
                                    },
                                    {
                                        key: "layer3",
                                        label: (
                                            <Space>
                                                <Text strong style={{ color: token.colorText }}>Layer 3: Volume Confirmation</Text>
                                                <Tag color="gold" className="m-0 text-xs">Xác Nhận</Tag>
                                            </Space>
                                        ),
                                        children: (
                                            <Space direction="vertical" className="w-full" size="small">
                                                <Text style={{ color: token.colorTextSecondary }} className="text-sm">
                                                    Xác nhận dòng tiền thông minh (Smart Money). Tín hiệu kỹ thuật
                                                    KHÔNG CÓ volume xác nhận chỉ là nhiễu.
                                                </Text>

                                                <CodeBlock>
                                                    <div style={{ color: token.colorText }}>
                                                        RVOL = Volume hôm nay / Trung bình Volume 20 phiên
                                                        <br />
                                                        <span style={{ color: token.colorTextTertiary }}>
                                                            Relative Volume đo mức độ tham gia của Smart Money
                                                        </span>
                                                    </div>
                                                </CodeBlock>

                                                <RuleList items={[
                                                    { condition: "RVOL >= 2.0", result: "Dòng tiền rất mạnh - Xác nhận rõ ràng", color: "green" },
                                                    { condition: "RVOL 1.5-2.0", result: "Xác nhận mạnh - Signal đáng tin", color: "green" },
                                                    { condition: "RVOL 1.0-1.5", result: "Bình thường - Xác nhận setup mạnh" },
                                                    { condition: "RVOL < 1.0", result: "Yếu - Chưa xác nhận", color: "red" },
                                                    { condition: "RVOL < 0.7", result: "Rất yếu - Signal không đáng tin", color: "red" },
                                                ]} />

                                                <InfoBox type="info">
                                                    <Text style={{ color: token.colorTextSecondary }}>
                                                        <strong>Quy tắc xác nhận:</strong> Setup &quot;strong&quot; chỉ cần RVOL &gt;= 1.0.
                                                        Setup &quot;moderate&quot; cần RVOL &gt;= 1.2 (ngưỡng mặc định).
                                                        RVOL &gt;= 1.5 được tính là &quot;strong&quot; volume.
                                                    </Text>
                                                </InfoBox>
                                            </Space>
                                        ),
                                    },
                                    {
                                        key: "disclaimer",
                                        label: (
                                            <Text strong style={{ color: token.colorWarning }}>Lưu Ý Quan Trọng</Text>
                                        ),
                                        children: (
                                            <Space direction="vertical" className="w-full" size="middle">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <InfoBox type="success">
                                                        <div className="flex items-start gap-2">
                                                            <CheckCircleOutlined style={{ color: token.colorSuccess, marginTop: 2 }} />
                                                            <div>
                                                                <Text strong style={{ color: token.colorSuccess }}>Nên làm:</Text>
                                                                <ul className="mt-1 text-xs space-y-0.5 ml-4" style={{ color: token.colorTextSecondary }}>
                                                                    <li>Ưu tiên STRONG BUY/SELL (có volume xác nhận)</li>
                                                                    <li>Trend Following trong Uptrend, Mean Reversion khi oversold</li>
                                                                    <li>Kiểm tra RVOL - Tín hiệu thiếu volume chỉ là nhiễu</li>
                                                                    <li>Đặt stop-loss trước khi vào lệnh</li>
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
                                                                    <li>Mua cổ phiếu nằm sàn khi không có volume xác nhận</li>
                                                                    <li>Mean Reversion BUY khi RSI &gt;= 25 (chưa đủ cực đoan)</li>
                                                                    <li>Bỏ qua Market Regime - Layer 1 quyết định luật chơi</li>
                                                                    <li>BUY trong Downtrend khi chưa có setup strong + volume</li>
                                                                </ul>
                                                            </div>
                                                        </div>
                                                    </InfoBox>
                                                </div>

                                                <InfoBox type="warning">
                                                    <Text className="text-xs" style={{ color: token.colorTextSecondary }}>
                                                        <strong style={{ color: token.colorWarning }}>Disclaimer:</strong> Hệ thống dựa trên
                                                        phân tích kỹ thuật từ dữ liệu lịch sử và không đảm bảo kết quả tương lai.
                                                        Nên kết hợp phân tích cơ bản, tin tức và tham khảo ý kiến chuyên gia tài chính.
                                                    </Text>
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
