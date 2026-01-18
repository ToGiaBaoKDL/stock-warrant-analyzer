"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Layout,
  Card,
  Typography,
  Alert,
  Row,
  Col,
  Tag,
  Space,
  Table,
  InputNumber,
  Button,
  Tooltip,
  Divider,
  Select,
  Collapse,
  Popconfirm
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  DollarOutlined,
  SwapOutlined,
  CalculatorOutlined,
  RightOutlined,
  ReloadOutlined,
  SearchOutlined,
  InfoCircleOutlined,
  FireOutlined,
  BulbOutlined,
  WarningOutlined,
  QuestionCircleOutlined,
  ThunderboltOutlined,
  LineChartOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useStockPrice, useWarrantInfo, useWarrantsByUnderlying, useStockList, useWarrantList } from "@/hooks";
import { useStockStore, useWarrantStore } from "@/stores";
import { StockDetailSkeleton, MainNav, FeeSettingsButton, useScenarioColumns } from "@/components";
import type { ScenarioRow } from "@/types";
import {
  calculateProfitLoss,
  calculateBreakEven,
  formatVND,
  formatPercent,
  DEFAULT_BUY_FEE_PERCENT,
  DEFAULT_SELL_FEE_PERCENT,
  DEFAULT_SELL_TAX_PERCENT,
  isNearExpiration
} from "@/utils";

const { Content } = Layout;
const { Title, Text } = Typography;


// Helper to detect if code is a warrant
function isWarrantCode(code: string): boolean {
  return code.startsWith("C") && code.length > 5;
}

export default function AnalysisPage() {
  const params = useParams<{ code: string }>();
  const code = params?.code || "";
  const symbolCode = code.toUpperCase();
  const router = useRouter();
  const isWarrant = isWarrantCode(symbolCode);

  const {
    setCurrentSymbol,
    setPosition,
    addScenario,
    removeScenario,
    updateScenario,
    clearScenarios,
    symbolDataCache
  } = useStockStore();

  const { feeSettings } = useWarrantStore();

  // Get position and scenarios from cache
  const position = symbolDataCache[symbolCode]?.position || null;
  const scenarios = useMemo(() =>
    symbolDataCache[symbolCode]?.scenarios || [],
    [symbolDataCache, symbolCode]
  );

  // Set current symbol when component mounts or symbol changes
  useEffect(() => {
    setCurrentSymbol(symbolCode);
  }, [symbolCode, setCurrentSymbol]);

  // Fetch stock list for dropdown (all available stocks)
  const { data: stockListData } = useStockList();

  // Fetch data based on type
  const { data: stockResponse, isLoading: stockLoading, error: stockError, refetch: refetchStock } =
    useStockPrice(isWarrant ? null : symbolCode);

  // Extract stock data from response
  const stockData = stockResponse?.stock;

  const { data: warrantResponse, isLoading: warrantLoading, error: warrantError, refetch: refetchWarrant } =
    useWarrantInfo(isWarrant ? symbolCode : null);

  // Extract warrant and underlying from response
  const warrantData = warrantResponse?.warrant;
  const warrantUnderlying = warrantResponse?.underlying;

  // Get warrants for the underlying stock (for selection)
  const underlyingSymbol = isWarrant ? warrantData?.underlying_symbol : symbolCode;
  const { data: relatedWarrants } = useWarrantsByUnderlying(underlyingSymbol || null, !!underlyingSymbol);

  // Fetch ALL warrants for selector
  const { data: allWarrantsData } = useWarrantList();

  const [newSellPrice, setNewSellPrice] = useState<number | null>(null);

  // Build options: stocks from API + warrants from screener results
  // Badge already shows CW/CP, so label only shows symbol - name
  const selectOptions = useMemo(() => {
    const options: Array<{ value: string; label: string; type: "stock" | "warrant" }> = [];

    // Add all stocks from API
    if (stockListData?.stocks) {
      stockListData.stocks.forEach((stock) => {
        options.push({
          value: stock.symbol,
          label: `${stock.symbol} - ${stock.name}`,
          type: "stock"
        });
      });
    }

    // Add related warrants (from warrant screener) as options
    if (relatedWarrants?.warrants) {
      relatedWarrants.warrants.forEach((w) => {
        if (!options.find(o => o.value === w.symbol)) {
          options.push({
            value: w.symbol,
            label: `${w.symbol} - ${w.underlying_symbol}`,
            type: "warrant"
          });
        }
      });
    }

    // Add ALL warrants from warrant list
    if (allWarrantsData?.warrants) {
      allWarrantsData.warrants.forEach((w) => {
        if (!options.find(o => o.value === w.symbol)) {
          options.push({
            value: w.symbol,
            label: `${w.symbol} - ${w.underlying_symbol}`,
            type: "warrant"
          });
        }
      });
    }

    // Make sure current code is in options (in case it's not in stock list or warrants)
    if (!options.find(o => o.value === symbolCode)) {
      options.push({
        value: symbolCode,
        label: symbolCode,
        type: isWarrant ? "warrant" : "stock"
      });
    }

    return options;
  }, [stockListData, relatedWarrants, allWarrantsData, symbolCode, isWarrant]);

  // Quick scenario presets
  const quickPresets = isWarrant
    ? [
      { label: "-20%", factor: 0.8 },
      { label: "-10%", factor: 0.9 },
      { label: "+10%", factor: 1.1 },
      { label: "+20%", factor: 1.2 },
      { label: "+30%", factor: 1.3 },
      { label: "+50%", factor: 1.5 },
      { label: "x2", factor: 2.0 },
      { label: "x3", factor: 3.0 },
    ]
    : [
      { label: "-7%", factor: 0.93 },
      { label: "-3%", factor: 0.97 },
      { label: "+3%", factor: 1.03 },
      { label: "+5%", factor: 1.05 },
      { label: "+7%", factor: 1.07 },
      { label: "+10%", factor: 1.1 },
      { label: "+15%", factor: 1.15 },
      { label: "+20%", factor: 1.2 },
    ];

  // Quick presets based on underlying stock price (for warrants)
  // When underlying changes, CW price changes proportionally based on conversion ratio
  const underlyingPresets = useMemo(() => {
    if (!isWarrant || !warrantData || !warrantUnderlying) return [];

    const underlyingPrice = warrantUnderlying.current_price;
    const conversionRatio = warrantData.conversion_ratio;
    const exercisePrice = warrantData.exercise_price;
    const currentCWPrice = warrantData.current_price;

    // Calculate intrinsic value: (underlying_price - exercise_price) / conversion_ratio
    // When underlying changes by X%, CW price changes differently due to leverage
    const underlyingChanges = [
      { label: "CP -3%", factor: 0.97 },
      { label: "CP +3%", factor: 1.03 },
      { label: "CP +5%", factor: 1.05 },
      { label: "CP +7%", factor: 1.07 },
      { label: "CP +10%", factor: 1.1 },
      { label: "CP trần", factor: 1.07 }, // 7% ceiling
    ];

    return underlyingChanges.map(c => {
      const newUnderlyingPrice = underlyingPrice * c.factor;
      // New intrinsic value
      const newIntrinsicValue = Math.max(0, (newUnderlyingPrice - exercisePrice) / conversionRatio);
      // Estimate new CW price (simplified: assume time value stays similar)
      const timeValue = currentCWPrice - Math.max(0, (underlyingPrice - exercisePrice) / conversionRatio);
      const estimatedCWPrice = Math.round(Math.max(100, newIntrinsicValue + Math.max(0, timeValue)));
      return {
        label: c.label,
        price: estimatedCWPrice,
        underlyingPrice: Math.round(newUnderlyingPrice)
      };
    });
  }, [isWarrant, warrantData, warrantUnderlying]);

  // Current price for display
  const currentPrice = isWarrant ? warrantData?.current_price : stockData?.current_price;
  const isLoading = isWarrant ? warrantLoading : stockLoading;
  const error = isWarrant ? warrantError : stockError;
  const refetch = isWarrant ? refetchWarrant : refetchStock;

  // Handle symbol selection
  const handleSymbolChange = (value: string) => {
    router.push(`/analysis/${value}`);
  };

  // Calculate scenario results with detailed breakdown
  const scenarioResults: ScenarioRow[] = useMemo(() => {
    if (!position) return [];

    return scenarios.map((scenario) => {
      const result = calculateProfitLoss(
        position.buyPrice,
        scenario.sellPrice,
        position.quantity,
        feeSettings.buyFeePercent,
        feeSettings.sellFeePercent,
        feeSettings.sellTaxPercent
      );

      // For stocks: calculate break-even at this sell price level
      // Break-even = (Giá mua * SL + Phí mua + Phí bán + Thuế bán) / SL
      const principal = position.buyPrice * position.quantity;
      const buyFee = (principal * feeSettings.buyFeePercent) / 100;
      const sellFee = (scenario.sellPrice * position.quantity * feeSettings.sellFeePercent) / 100;
      const sellTax = (scenario.sellPrice * position.quantity * feeSettings.sellTaxPercent) / 100;
      const totalCosts = buyFee + sellFee + sellTax;
      const breakEvenPrice = position.quantity > 0 ? (principal + totalCosts) / position.quantity : 0;

      return {
        id: scenario.id,
        sellPrice: scenario.sellPrice,
        grossRevenue: result.revenue.grossRevenue,
        sellFee: result.revenue.sellFee,
        sellTax: result.revenue.sellTax,
        netRevenue: result.revenue.netRevenue,
        profit: result.profit,
        profitPercent: result.profitPercent,
        isProfit: result.isProfit,
        breakEvenPrice: isWarrant ? undefined : breakEvenPrice,
      };
    });
  }, [position, scenarios, isWarrant, feeSettings]);

  // Calculate total cost
  const totalCost = useMemo(() => {
    if (!position) return 0;
    const principal = position.buyPrice * position.quantity;
    const buyFee = (principal * feeSettings.buyFeePercent) / 100;
    return principal + buyFee;
  }, [position, feeSettings]);

  const principal = useMemo(() => {
    if (!position) return 0;
    return position.buyPrice * position.quantity;
  }, [position]);

  // Break-even calculation for warrants
  const breakEvenResult = useMemo(() => {
    if (!isWarrant || !warrantData) return null;
    return calculateBreakEven(
      warrantData.current_price,
      warrantData.conversion_ratio,
      warrantData.exercise_price
    );
  }, [isWarrant, warrantData]);

  // Summary stats for scenarios
  const scenarioStats = useMemo(() => {
    if (scenarioResults.length === 0) return null;

    const profits = scenarioResults.map(s => s.profit);
    const profitPercents = scenarioResults.map(s => s.profitPercent);

    const best = scenarioResults.reduce((max, s) => s.profit > max.profit ? s : max, scenarioResults[0]);
    const worst = scenarioResults.reduce((min, s) => s.profit < min.profit ? s : min, scenarioResults[0]);
    const avgProfit = profits.reduce((a, b) => a + b, 0) / profits.length;
    const avgProfitPercent = profitPercents.reduce((a, b) => a + b, 0) / profitPercents.length;
    const profitableCount = scenarioResults.filter(s => s.isProfit).length;

    return {
      best,
      worst,
      avgProfit,
      avgProfitPercent,
      profitableCount,
      totalCount: scenarioResults.length
    };
  }, [scenarioResults]);

  // Handle position initialization
  const initPosition = () => {
    if (currentPrice) {
      setPosition({
        symbol: symbolCode,
        buyPrice: currentPrice,
        quantity: isWarrant ? 1000 : 100,
        buyFeePercent: DEFAULT_BUY_FEE_PERCENT,
      });
    }
  };

  // Add quick preset scenarios
  const handleQuickPreset = (factor: number) => {
    if (position?.buyPrice) {
      const sellPrice = Math.round(position.buyPrice * factor);
      addScenario(sellPrice);
    }
  };

  // Handle add scenario
  const handleAddScenario = () => {
    if (newSellPrice && newSellPrice > 0) {
      addScenario(newSellPrice);
      setNewSellPrice(null);
    }
  };

  // Use extracted scenario columns hook
  const scenarioColumns = useScenarioColumns(
    isWarrant,
    feeSettings,
    (id, data) => updateScenario(id, data),
    removeScenario
  );

  // Calculate price change
  const priceChange = useMemo(() => {
    if (isWarrant) {
      // For warrants, we don't have previous close, so return 0
      return { change: 0, changePercent: 0, isUp: true };
    }
    if (stockData) {
      return {
        change: stockData.change,
        changePercent: stockData.change_percent,
        isUp: stockData.change >= 0
      };
    }
    return { change: 0, changePercent: 0, isUp: true };
  }, [isWarrant, stockData]);

  if (isLoading) {
    return (
      <Layout className="min-h-screen bg-gradient-soft">
        <MainNav>
          <FeeSettingsButton />
        </MainNav>
        <Content className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <StockDetailSkeleton />
          </div>
        </Content>
      </Layout>
    );
  }

  if (!symbolCode) {
    return (
      <Layout className="min-h-screen" style={{ background: '#F5F4EF' }}>
        <MainNav>
          {/* Symbol selector - Reused from populated state */}
          <Select
            showSearch
            value={null}
            onChange={handleSymbolChange}
            options={selectOptions.map(opt => ({
              value: opt.value,
              searchText: `${opt.value} ${opt.label}`.toLowerCase(),
              label: (
                <div className="flex items-center gap-2">
                  <Tag color={opt.type === "warrant" ? "orange" : "blue"} className="text-xs">
                    {opt.type === "warrant" ? "CW" : "CP"}
                  </Tag>
                  {opt.label}
                </div>
              )
            }))}
            placeholder="Chọn mã CP/CW..."
            className="w-72"
            suffixIcon={<SearchOutlined className="text-gray-400" />}
            filterOption={(input, option) => {
              const search = input.toUpperCase();
              const value = option?.value as string | undefined;
              const searchText = (option as { searchText?: string })?.searchText;
              return (
                value?.toUpperCase().includes(search) ||
                searchText?.includes(input.toLowerCase())
              ) ?? false;
            }}
          />
          <FeeSettingsButton />
        </MainNav>
        <Content className="flex items-center justify-center p-6 h-[calc(100vh-64px)]">
          <div className="text-center text-gray-400">
            <LineChartOutlined className="text-6xl mb-4 opacity-50" />
            <Title level={4} className="!text-gray-500 !font-normal">
              Vui lòng chọn cổ phiếu hoặc chứng quyền
            </Title>
            <Text type="secondary">
              Sử dụng ô tìm kiếm trên thanh tiêu đề để bắt đầu
            </Text>
          </div>
        </Content>
      </Layout>
    );
  }

  // Handle Error/Not Found State (Only when code exists but data not found)
  if (error || (!stockData && !warrantData)) {
    return (
      <Layout className="min-h-screen bg-gradient-soft">
        <MainNav>
          <FeeSettingsButton />
        </MainNav>
        <Content className="p-6">
          <div className="max-w-4xl mx-auto">
            <Alert
              title="Không tìm thấy dữ liệu"
              description={`Không thể tải thông tin cho mã ${symbolCode}. Vui lòng kiểm tra mã và thử lại.`}
              type="error"
              showIcon
              className="shadow-card"
              action={
                <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
                  Thử lại
                </Button>
              }
            />
          </div>
        </Content>
      </Layout>
    );
  }

  const nearExpiration = isWarrant && warrantData ? isNearExpiration(warrantData.days_to_maturity) : false;

  return (
    <Layout className="min-h-screen bg-gradient-soft">
      {/* Header */}
      <MainNav>
        {/* Symbol Badge */}
        <div className="hidden lg:flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1.5">
          <Tag color={isWarrant ? "orange" : "blue"} className="m-0">
            {isWarrant ? "CW" : "CP"}
          </Tag>
          <span className="text-white font-semibold">{symbolCode}</span>
          {isWarrant && nearExpiration && (
            <Tag color="warning" className="m-0 font-medium">
              <WarningOutlined className="mr-1" />
              Sắp đáo hạn
            </Tag>
          )}
        </div>
        {/* Symbol selector */}
        <Select
          showSearch
          value={symbolCode}
          onChange={handleSymbolChange}
          options={selectOptions.map(opt => ({
            value: opt.value,
            searchText: `${opt.value} ${opt.label}`.toLowerCase(),
            label: (
              <div className="flex items-center gap-2">
                <Tag color={opt.type === "warrant" ? "orange" : "blue"} className="text-xs">
                  {opt.type === "warrant" ? "CW" : "CP"}
                </Tag>
                {opt.label}
              </div>
            )
          }))}
          placeholder="Chọn mã khác"
          className="w-72"
          suffixIcon={<SearchOutlined className="text-gray-400" />}
          filterOption={(input, option) => {
            const search = input.toUpperCase();
            const value = option?.value as string | undefined;
            const searchText = (option as { searchText?: string })?.searchText;
            return (
              value?.toUpperCase().includes(search) ||
              searchText?.includes(input.toLowerCase())
            ) ?? false;
          }}
        />
        <FeeSettingsButton />
      </MainNav>

      <Content className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Compact Info Card */}
          <Card className="border-0 shadow-card">
            <Row gutter={[24, 16]} align="middle">
              {/* Stock info - all same font size */}
              {!isWarrant && stockData && (
                <>
                  <Col xs={12} sm={8} lg={4}>
                    <Text type="secondary" className="text-sm block mb-1">Giá hiện tại</Text>
                    <div className="text-lg font-semibold">
                      {formatVND(stockData.current_price)}
                    </div>
                  </Col>
                  <Col xs={12} sm={8} lg={4}>
                    <Text type="secondary" className="text-sm block mb-1">Thay đổi</Text>
                    <div className={`text-lg font-semibold ${priceChange.isUp ? "text-green-600" : priceChange.change < 0 ? "text-red-600" : "text-gray-500"}`}>
                      {priceChange.change > 0 ? "+" : ""}{formatVND(priceChange.change)} ({formatPercent(priceChange.changePercent)})
                    </div>
                  </Col>
                  <Col xs={12} sm={8} lg={4}>
                    <Text type="secondary" className="text-sm block mb-1">Khối lượng</Text>
                    <div className="text-lg font-semibold">
                      {new Intl.NumberFormat("vi-VN").format(stockData.volume)}
                    </div>
                  </Col>
                  <Col xs={12} sm={8} lg={4}>
                    <Text type="secondary" className="text-sm block mb-1">Mở cửa</Text>
                    <div className="text-lg font-semibold">{formatVND(stockData.open_price)}</div>
                  </Col>
                  <Col xs={12} sm={8} lg={4}>
                    <Text type="secondary" className="text-sm block mb-1">Cao nhất</Text>
                    <div className="text-lg font-semibold text-green-600">{formatVND(stockData.high_price)}</div>
                  </Col>
                  <Col xs={12} sm={8} lg={4}>
                    <Text type="secondary" className="text-sm block mb-1">Thấp nhất</Text>
                    <div className="text-lg font-semibold text-red-600">{formatVND(stockData.low_price)}</div>
                  </Col>
                </>
              )}

              {/* Warrant info - all same font size */}
              {isWarrant && warrantData && (
                <>
                  <Col xs={12} sm={8} lg={4}>
                    <Text type="secondary" className="text-sm block mb-1">Giá CW</Text>
                    <div className="text-lg font-semibold">
                      {formatVND(warrantData.current_price)}
                    </div>
                  </Col>
                  <Col xs={12} sm={8} lg={4}>
                    <Text type="secondary" className="text-sm block mb-1">Break-even</Text>
                    <div className="text-lg font-semibold text-green-600">
                      {breakEvenResult ? formatVND(breakEvenResult.breakEvenPrice) : "-"}
                    </div>
                  </Col>
                  <Col xs={12} sm={8} lg={4}>
                    <Text type="secondary" className="text-sm block mb-1">Giá CP mẹ</Text>
                    <Link href={`/analysis/${warrantData.underlying_symbol}`}>
                      <div className="text-lg font-semibold text-blue-600 hover:text-blue-700 cursor-pointer">
                        {formatVND(warrantUnderlying?.current_price || 0)}
                      </div>
                    </Link>
                  </Col>
                  <Col xs={12} sm={8} lg={4}>
                    <Text type="secondary" className="text-sm block mb-1">Tỷ lệ CĐ</Text>
                    <div className="text-lg font-semibold">
                      <Tag color="blue">{warrantData.conversion_ratio}:1</Tag>
                    </div>
                  </Col>
                  <Col xs={12} sm={8} lg={4}>
                    <Text type="secondary" className="text-sm block mb-1">Giá thực hiện</Text>
                    <div className="text-lg font-semibold">{formatVND(warrantData.exercise_price)}</div>
                  </Col>
                  <Col xs={12} sm={8} lg={4}>
                    <Text type="secondary" className="text-sm block mb-1">Còn lại</Text>
                    <div className="text-lg font-semibold">
                      <Tag color={nearExpiration ? "warning" : "default"}>
                        {warrantData.days_to_maturity} ngày
                      </Tag>
                    </div>
                  </Col>
                </>
              )}
            </Row>
          </Card>

          {/* Position & What-if Combined */}
          <Card
            title={
              <div className="flex items-center gap-2">
                <CalculatorOutlined className="text-[#CC785C]" />
                <span>Mô phỏng lợi nhuận What-if</span>
                <Tag color={isWarrant ? "orange" : "blue"}>{isWarrant ? "Chứng quyền" : "Cổ phiếu"}</Tag>
              </div>
            }
            className="border-0 shadow-card"
          >
            {/* Position Input */}
            {!position ? (
              <div className="text-center py-8">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary-50 flex items-center justify-center">
                  <CalculatorOutlined className="text-primary-500 text-3xl" />
                </div>
                <Text type="secondary" className="block mb-4 text-lg">
                  Tạo vị thế để bắt đầu mô phỏng lợi nhuận
                </Text>
                <Button
                  type="primary"
                  size="large"
                  onClick={initPosition}
                  icon={<PlusOutlined />}
                  className="shadow-md"
                >
                  Tạo vị thế với giá {formatVND(currentPrice || 0)}
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Position Info Row - Compact layout */}
                <div className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    {/* Left Group: Inputs */}
                    <div className="flex gap-4 items-end">
                      <div className="w-40">
                        <div className="mb-2">
                          <Text type="secondary" className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                            <DollarOutlined className="mr-1" />
                            Giá mua
                          </Text>
                        </div>
                        <InputNumber
                          size="large"
                          value={position.buyPrice}
                          onChange={(v) => v && setPosition({ ...position, buyPrice: v })}
                          className="w-full !rounded-xl"
                          min={0}
                          formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                          parser={(value) => Number(value?.replace(/,/g, ""))}
                        />
                      </div>
                      <div className="w-32">
                        <div className="mb-2">
                          <Text type="secondary" className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                            <SwapOutlined className="mr-1" />
                            Số lượng
                          </Text>
                        </div>
                        <InputNumber
                          size="large"
                          value={position.quantity}
                          onChange={(v) => v && setPosition({ ...position, quantity: v })}
                          className="w-full !rounded-xl"
                          min={0}
                          step={100}
                          formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                          parser={(value) => Number(value?.replace(/,/g, ""))}
                        />
                      </div>
                    </div>

                    {/* Right Group: Total Cost */}
                    <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex flex-col justify-center items-end text-right w-fit min-w-[200px]">
                      <Text type="secondary" className="text-xs font-medium uppercase tracking-wide mb-1 whitespace-nowrap">
                        Tổng vốn đầu tư
                      </Text>
                      <div className="flex items-baseline gap-2 justify-end">
                        <Text strong className="text-2xl text-primary-600 whitespace-nowrap">
                          {formatVND(totalCost)}
                        </Text>
                        {feeSettings.buyFeePercent > 0 && (
                          <Text type="secondary" className="text-xs whitespace-nowrap">
                            (Phí: {feeSettings.buyFeePercent}%)
                          </Text>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Presets */}
                {position.buyPrice > 0 && (
                  <div className="space-y-3">
                    <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl p-4">
                      <div className="flex items-center gap-4 flex-wrap">
                        <Text type="secondary">
                          <BulbOutlined className="mr-1 text-primary-500" />
                          Thêm nhanh:
                        </Text>
                        <Space wrap>
                          {quickPresets.map((preset) => (
                            <Button
                              key={preset.label}
                              size="small"
                              onClick={() => handleQuickPreset(preset.factor)}
                              className={`font-medium shadow-sm ${preset.factor < 1 ? "text-danger border-red-200 hover:border-red-400 hover:bg-red-50" : "text-success border-green-200 hover:border-green-400 hover:bg-green-50"}`}
                            >
                              {preset.label} ({formatVND(Math.round(position.buyPrice * preset.factor))})
                            </Button>
                          ))}
                          <Tooltip title="Thêm tất cả kịch bản">
                            <Button
                              size="small"
                              type="primary"
                              icon={<ThunderboltOutlined />}
                              onClick={() => quickPresets.forEach(p => handleQuickPreset(p.factor))}
                              className="!bg-[#CC785C] !border-[#CC785C] hover:!bg-[#b5654a] hover:!border-[#b5654a]"
                            >
                              Tất cả
                            </Button>
                          </Tooltip>
                        </Space>
                      </div>
                    </div>

                    {/* Underlying-based presets for warrants */}
                    {isWarrant && underlyingPresets.length > 0 && warrantData && (
                      <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl p-4 border border-orange-200">
                        <div className="flex items-center gap-4 flex-wrap">
                          <Tooltip title="Giá CW ước tính khi cổ phiếu mẹ thay đổi">
                            <Text type="secondary">
                              <FireOutlined className="mr-1 text-orange-500" />
                              Theo CP mẹ ({warrantData.underlying_symbol}):
                            </Text>
                          </Tooltip>
                          <Space wrap>
                            {underlyingPresets.map((preset) => (
                              <Tooltip
                                key={preset.label}
                                title={`${warrantData.underlying_symbol}: ${formatVND(preset.underlyingPrice)}`}
                              >
                                <Button
                                  size="small"
                                  onClick={() => addScenario(preset.price)}
                                  className="font-medium shadow-sm border-orange-200 hover:border-orange-400 hover:bg-orange-50 text-orange-700"
                                >
                                  {preset.label} → {formatVND(preset.price)}
                                </Button>
                              </Tooltip>
                            ))}
                          </Space>
                        </div>
                      </div>
                    )}
                  </div>
                )}


                {/* Scenarios Section */}
                <div className="flex items-center justify-between mb-4">
                  <Text strong>Kịch bản giá bán</Text>
                  <Space>
                    <InputNumber
                      placeholder="Giá bán mới"
                      value={newSellPrice}
                      onChange={setNewSellPrice}
                      min={0}
                      formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                      parser={(value) => Number(value?.replace(/,/g, ""))}
                      style={{ width: 140 }}
                    />
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={handleAddScenario}
                      disabled={!newSellPrice}
                      className="!bg-[#CC785C] !border-[#CC785C] hover:!bg-[#b5654a] hover:!border-[#b5654a] disabled:!bg-gray-200 disabled:!border-gray-200"
                    >
                      Thêm
                    </Button>
                    {scenarios.length > 0 && (
                      <Popconfirm
                        title="Xóa tất cả kịch bản?"
                        onConfirm={clearScenarios}
                        okText="Xóa"
                        cancelText="Hủy"
                      >
                        <Button danger icon={<DeleteOutlined />}>Xóa tất cả</Button>
                      </Popconfirm>
                    )}
                  </Space>
                </div>

                {scenarios.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-xl">
                    <SwapOutlined className="text-gray-400 text-3xl mb-4" />
                    <Text type="secondary" className="block">Nhập giá bán hoặc sử dụng nút thêm nhanh</Text>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-lg border border-gray-100">
                    <Table
                      columns={scenarioColumns}
                      dataSource={scenarioResults}
                      rowKey="id"
                      pagination={false}
                      rowClassName={(record) =>
                        `transition-colors ${record.isProfit ? "bg-green-50 hover:bg-green-100" : "bg-red-50 hover:bg-red-100"}`
                      }
                      size="middle"
                      scroll={{ x: 800, y: 350 }}
                    />
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Usage Guide Collapse */}
          <Collapse
            ghost
            items={[
              {
                key: '1',
                label: (
                  <div className="flex items-center gap-2">
                    <QuestionCircleOutlined className="text-[#CC785C]" />
                    <Text strong>Hướng dẫn sử dụng</Text>
                  </div>
                ),
                children: (
                  <Row gutter={[24, 16]}>
                    <Col xs={24} md={8}>
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#CC785C] text-white flex items-center justify-center font-medium shrink-0 text-sm">1</div>
                        <div>
                          <Text strong className="block">Tạo vị thế</Text>
                          <Text type="secondary" className="text-sm">Nhập giá mua và số lượng cổ phiếu/chứng quyền</Text>
                        </div>
                      </div>
                    </Col>
                    <Col xs={24} md={8}>
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#CC785C] text-white flex items-center justify-center font-medium shrink-0 text-sm">2</div>
                        <div>
                          <Text strong className="block">Thêm kịch bản</Text>
                          <Text type="secondary" className="text-sm">Sử dụng nút thêm nhanh hoặc nhập giá bán</Text>
                        </div>
                      </div>
                    </Col>
                    <Col xs={24} md={8}>
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#CC785C] text-white flex items-center justify-center font-medium shrink-0 text-sm">3</div>
                        <div>
                          <Text strong className="block">Phân tích</Text>
                          <Text type="secondary" className="text-sm">Xem lợi nhuận, phí, thuế chi tiết cho mỗi kịch bản</Text>
                        </div>
                      </div>
                    </Col>
                  </Row>
                )
              }
            ]}
          />

          {/* Link to Warrant Screener (for stocks) */}
          {!isWarrant && (
            <Card className="border-0 shadow-card bg-gradient-to-r from-primary-50 to-blue-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white shadow-md flex items-center justify-center">
                    <FireOutlined className="text-[#CC785C] text-xl" />
                  </div>
                  <div>
                    <Text strong className="text-lg">Chứng quyền {symbolCode}</Text>
                    <br />
                    <Text type="secondary">So sánh và chọn chứng quyền tốt nhất cho {symbolCode}</Text>
                  </div>
                </div>
                <Link href={`/warrants?underlying=${symbolCode}`}>
                  <Button type="primary" icon={<RightOutlined />} size="large" className="shadow-md">
                    Warrant Screener
                  </Button>
                </Link>
              </div>
            </Card>
          )}
        </div>
      </Content>
    </Layout>
  );
}
