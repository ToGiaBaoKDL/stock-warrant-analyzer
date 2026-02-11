"use client";

import { useState, useMemo, useEffect, useRef } from "react";
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
  Popconfirm,
  Tabs
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
  QuestionCircleOutlined,
  ThunderboltOutlined,
  LineChartOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useStockPrice, useWarrantInfo, useWarrantsByUnderlying, useStockList, useWarrantList, useStockHistory } from "@/hooks";
import { useStockStore, useWarrantStore } from "@/stores";
import { StockDetailSkeleton, MainNav, FeeSettingsButton, useScenarioColumns } from "@/components";
import type { ScenarioRow } from "@/types";
import {
  calculateProfitLoss,
  calculateBreakEven,
  calculateStockBreakEven,
  calculateExerciseValue,
  calculateCost,
  calculateRevenue,
  formatVND,
  formatPercent,
  DEFAULT_BUY_FEE_PERCENT,
} from "@/utils";
import { AppColors } from "@/utils/theme";
import {
  PriceInfoTab,
  StockChartTab,
  CompanyProfileTab,
  SubsidiariesTab,
  LeadershipTab,
  ShareholdersTab,
  CapDividendTab,
  SignalSummaryRow,
  PriceTargetPanel,
} from "@/components/analysis";

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

  // Fetch 350-day daily history for signal computation (reuses same cache as signal page)
  const { data: historyData, isLoading: historyLoading } = useStockHistory(symbolCode, {
    resolution: "1D",
    days: 350,
  });

  const [newSellPrice, setNewSellPrice] = useState<number | null>(null);
  // Target underlying price for warrant exercise comparison
  const [targetUnderlyingPrice, setTargetUnderlyingPrice] = useState<number | null>(null);
  const lastTargetSymbolRef = useRef<string | null>(null);

  // Initialize target underlying price when switching CW symbol
  useEffect(() => {
    if (!isWarrant || !warrantUnderlying?.current_price) return;
    if (lastTargetSymbolRef.current !== symbolCode) {
      setTargetUnderlyingPrice(warrantUnderlying.current_price);
      lastTargetSymbolRef.current = symbolCode;
    }
  }, [isWarrant, warrantUnderlying?.current_price, symbolCode]);

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
      const breakEvenPrice = calculateStockBreakEven(
        position.buyPrice,
        position.quantity,
        feeSettings.buyFeePercent,
        feeSettings.sellFeePercent,
        feeSettings.sellTaxPercent
      );

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

  // Break-even calculation for warrants
  const breakEvenResult = useMemo(() => {
    if (!isWarrant || !warrantData) return null;
    return calculateBreakEven(
      warrantData.current_price,
      warrantData.conversion_ratio,
      warrantData.exercise_price
    );
  }, [isWarrant, warrantData]);

  // Exercise comparison: compare market sell profit vs exercise profit at target underlying price
  const exerciseComparison = useMemo(() => {
    if (!isWarrant || !warrantData || !warrantUnderlying || !position || !targetUnderlyingPrice) return null;

    const qty = position.quantity;
    const buyPrice = position.buyPrice;
    const exercisePrice = warrantData.exercise_price;
    const convRatio = warrantData.conversion_ratio;

    // --- Exercise-based profit (cash settlement) ---
    const exerciseValuePerCW = Math.max(0, (targetUnderlyingPrice - exercisePrice) / convRatio);
    const grossExercise = exerciseValuePerCW * qty;
    const exerciseRevenue = calculateRevenue(exerciseValuePerCW, qty, feeSettings.sellFeePercent, feeSettings.sellTaxPercent);
    const buyCost = calculateCost(buyPrice, qty, feeSettings.buyFeePercent);
    const exerciseProfit = exerciseRevenue.netRevenue - buyCost.totalCost;
    const exerciseROI = buyCost.totalCost > 0 ? (exerciseProfit / buyCost.totalCost) * 100 : 0;

    // --- Market sell profit (buy CW, sell CW on market) ---
    // Estimate CW market price at target underlying using simple intrinsic + time value model
    const currentIntrinsic = Math.max(0, (warrantUnderlying.current_price - exercisePrice) / convRatio);
    const timeValue = Math.max(0, warrantData.current_price - currentIntrinsic);
    const estimatedCWPrice = Math.max(0, exerciseValuePerCW + timeValue * 0.5); // time value decays
    const marketResult = calculateProfitLoss(
      buyPrice, estimatedCWPrice, qty,
      feeSettings.buyFeePercent, feeSettings.sellFeePercent, feeSettings.sellTaxPercent
    );

    // Break-even
    const breakEven = calculateBreakEven(buyPrice, convRatio, exercisePrice, targetUnderlyingPrice);

    return {
      targetPrice: targetUnderlyingPrice,
      exerciseValuePerCW,
      grossExercise,
      netExercise: exerciseRevenue.netRevenue,
      exerciseProfit,
      exerciseROI,
      estimatedCWPrice,
      marketProfit: marketResult.profit,
      marketROI: marketResult.profitPercent,
      breakEvenPrice: breakEven.breakEvenPrice,
      isProfitable: breakEven.isProfitable,
      totalCost: buyCost.totalCost,
    };
  }, [isWarrant, warrantData, warrantUnderlying, position, targetUnderlyingPrice, feeSettings]);

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
      <Layout className="min-h-screen" style={{ background: 'var(--background)' }}>
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
      <Layout className="min-h-screen" style={{ background: 'var(--background)' }}>
        <MainNav>
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
            className="w-full sm:w-72"
            suffixIcon={<SearchOutlined className="text-gray-400" />}
            optionFilterProp="searchText"
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
            <Title level={4} className="!text-gray-500 dark:!text-gray-400 !font-normal">
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
      <Layout className="min-h-screen" style={{ background: 'var(--background)' }}>
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

  return (
    <Layout className="min-h-screen" style={{ background: 'var(--background)' }}>
      {/* Header */}
      <MainNav>
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
          className="w-full sm:w-72"
          suffixIcon={<SearchOutlined className="text-gray-400" />}
          optionFilterProp="searchText"
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
          {/* Analysis Tabs - Two Column Layout */}
          <Row gutter={[16, 16]}>
            {/* Left Panel: Price Info / Company Tabs */}
            <Col xs={24} lg={10}>
              <Card className="border border-gray-200 dark:border-gray-700 shadow-card h-full">
                {isWarrant ? (
                  // Warrant: Single Price Info Tab (no company info)
                  <PriceInfoTab
                    data={warrantData ?? null}
                    isLoading={warrantLoading}
                    type="warrant"
                  />
                ) : (
                  // Stock: 4 Tabs - Price, Profile, Subsidiaries, Leadership
                  <Tabs
                    defaultActiveKey="price"
                    items={[
                      {
                        key: "price",
                        label: "Giá",
                        children: (
                          <PriceInfoTab
                            data={stockData ?? null}
                            isLoading={stockLoading}
                            type="stock"
                          />
                        ),
                      },
                      {
                        key: "profile",
                        label: "Hồ sơ",
                        children: <CompanyProfileTab symbol={symbolCode} />,
                      },
                      {
                        key: "subsidiaries",
                        label: "Công ty con",
                        children: <SubsidiariesTab symbol={symbolCode} />,
                      },
                      {
                        key: "leadership",
                        label: "Ban lãnh đạo",
                        children: <LeadershipTab symbol={symbolCode} />,
                      },
                    ]}
                  />
                )}
              </Card>
            </Col>

            {/* Right Panel: Chart / Shareholders / Capital Tabs */}
            <Col xs={24} lg={14}>
              <Card className="border border-gray-200 dark:border-gray-700 shadow-card h-full">
                {isWarrant ? (
                  // Warrant: Single Chart Tab
                  <StockChartTab symbol={symbolCode} />
                ) : (
                  // Stock: 3 Tabs - Chart, Shareholders, Cap & Dividend
                  <Tabs
                    defaultActiveKey="chart"
                    items={[
                      {
                        key: "chart",
                        label: "Biểu đồ",
                        children: <StockChartTab symbol={symbolCode} />,
                      },
                      {
                        key: "shareholders",
                        label: "Cổ đông",
                        children: <ShareholdersTab symbol={symbolCode} />,
                      },
                      {
                        key: "cap-dividend",
                        label: "Vốn & Cổ tức",
                        children: <CapDividendTab symbol={symbolCode} />,
                      },
                    ]}
                  />
                )}
              </Card>
            </Col>
          </Row>

          {/* Signal Summary Row */}
          <SignalSummaryRow
            closes={historyData?.c ?? []}
            highs={historyData?.h ?? []}
            lows={historyData?.l ?? []}
            volumes={historyData?.v ?? []}
            floor={
              isWarrant
                ? undefined
                : stockData?.floor && stockData.floor > 0
                  ? stockData.floor / 1000
                  : undefined
            }
            ceiling={
              isWarrant
                ? undefined
                : stockData?.ceiling && stockData.ceiling > 0
                  ? stockData.ceiling / 1000
                  : undefined
            }
            isLoading={historyLoading}
          />

          {/* Price Target Panel (Support/Resistance) */}
          {!isWarrant && historyData?.c && historyData.c.length >= 10 && (
            <PriceTargetPanel
              highs={historyData.h}
              lows={historyData.l}
              closes={historyData.c}
              currentPrice={
                stockData?.current_price
                  ? stockData.current_price / 1000
                  : undefined
              }
            />
          )}

          {/* Position & What-if Combined */}
          <Card
            title={
              <div className="flex items-center gap-2">
                <CalculatorOutlined style={{ color: AppColors.primary }} />
                <span>Mô phỏng lợi nhuận What-if</span>
                <Tag color={isWarrant ? "orange" : "blue"}>{isWarrant ? "Chứng quyền" : "Cổ phiếu"}</Tag>
              </div>
            }
            className="border border-gray-200 dark:border-gray-700 shadow-card"
          >
            {/* Position Input */}
            {!position ? (
              <div className="text-center py-8">
                <div
                  className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${AppColors.primary}1A` }}
                >
                  <CalculatorOutlined className="text-3xl" style={{ color: AppColors.primary }} />
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
                <div className="bg-gray-50/50 dark:bg-white/5 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    {/* Left Group: Inputs */}
                    <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-end w-full sm:w-auto">
                      <div className="w-full sm:w-40">
                        <div className="mb-2">
                          <Text type="secondary" className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
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
                      <div className="w-full sm:w-32">
                        <div className="mb-2">
                          <Text type="secondary" className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
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
                    <div className="!bg-gray-900 dark:!bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-md flex flex-col justify-center items-end text-right w-full sm:w-fit sm:min-w-[200px]">
                      <span className="text-xs font-bold uppercase tracking-wide mb-1 whitespace-nowrap text-gray-300">
                        Tổng vốn đầu tư
                      </span>
                      <div className="flex items-baseline gap-2 justify-end">
                        <span className="font-bold text-2xl whitespace-nowrap text-primary-500">
                          {formatVND(totalCost)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Warrant Exercise Comparison: Giá kỳ vọng CP mẹ */}
                {isWarrant && warrantData && warrantUnderlying && position && (
                  <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/10 dark:to-amber-900/10 rounded-2xl p-4 border border-orange-200 dark:border-orange-800">
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                        <div className="w-full sm:w-52">
                          <div className="mb-2">
                            <Text type="secondary" className="text-sm font-medium uppercase tracking-wide">
                              <FireOutlined className="mr-1 text-orange-500" />
                              Giá kỳ vọng CP mẹ
                            </Text>
                          </div>
                          <InputNumber
                            size="large"
                            placeholder={formatVND(warrantUnderlying.current_price)}
                            value={targetUnderlyingPrice}
                            onChange={setTargetUnderlyingPrice}
                            className="w-full !rounded-xl"
                            min={0}
                            step={100}
                            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                            parser={(value) => Number(value?.replace(/,/g, ""))}
                          />
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { label: "Hiện tại", price: warrantUnderlying.current_price },
                            { label: "+5%", price: Math.round(warrantUnderlying.current_price * 1.05) },
                            { label: "+10%", price: Math.round(warrantUnderlying.current_price * 1.10) },
                            { label: "+15%", price: Math.round(warrantUnderlying.current_price * 1.15) },
                            { label: "Trần", price: warrantUnderlying.ceiling || Math.round(warrantUnderlying.current_price * 1.07) },
                          ].map(p => (
                            <Button
                              key={p.label}
                              size="small"
                              onClick={() => setTargetUnderlyingPrice(p.price)}
                              className="!text-orange-700 dark:!text-orange-400 !border-orange-300 dark:!border-orange-700 hover:!bg-orange-100 dark:hover:!bg-orange-900/30 text-xs"
                            >
                              {p.label} ({formatVND(p.price)})
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Comparison Cards */}
                      {exerciseComparison && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Exercise Profit Card */}
                          <div className={`rounded-xl p-4 border-2 ${exerciseComparison.exerciseProfit >= 0 ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700" : "bg-rose-50 dark:bg-rose-900/20 border-rose-300 dark:border-rose-700"}`}>
                            <div className="flex items-center gap-2 mb-2">
                              <Tag color="orange" className="text-xs">Exercise CW</Tag>
                              <Tooltip title={`Giá trị exercise = max(0, (${formatVND(exerciseComparison.targetPrice)} − ${formatVND(warrantData.exercise_price)}) / ${warrantData.conversion_ratio}) = ${formatVND(exerciseComparison.exerciseValuePerCW)}/CW`}>
                                <InfoCircleOutlined className="text-gray-400 cursor-help" />
                              </Tooltip>
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                                <span>Giá trị exercise/CW:</span>
                                <span className="font-mono">{formatVND(exerciseComparison.exerciseValuePerCW)}</span>
                              </div>
                              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                                <span>Thu ròng exercise:</span>
                                <span className="font-mono">{formatVND(exerciseComparison.netExercise)}</span>
                              </div>
                              <Divider className="!my-1.5" />
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium">Lợi nhuận:</span>
                                <span className={`font-bold text-lg ${exerciseComparison.exerciseProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                                  {exerciseComparison.exerciseProfit >= 0 ? "+" : ""}{formatVND(exerciseComparison.exerciseProfit)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-500">ROI:</span>
                                <span className={`font-semibold ${exerciseComparison.exerciseROI >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                                  {formatPercent(exerciseComparison.exerciseROI)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Market Sell Profit Card */}
                          <div className={`rounded-xl p-4 border-2 ${exerciseComparison.marketProfit >= 0 ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700" : "bg-rose-50 dark:bg-rose-900/20 border-rose-300 dark:border-rose-700"}`}>
                            <div className="flex items-center gap-2 mb-2">
                              <Tag color="blue" className="text-xs">Bán CW trên sàn</Tag>
                              <Tooltip title={`Ước tính giá CW khi CP mẹ = ${formatVND(exerciseComparison.targetPrice)}: ~${formatVND(exerciseComparison.estimatedCWPrice)} (giá trị nội tại + time value giảm)`}>
                                <InfoCircleOutlined className="text-gray-400 cursor-help" />
                              </Tooltip>
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                                <span>Giá CW ước tính:</span>
                                <span className="font-mono">~{formatVND(exerciseComparison.estimatedCWPrice)}</span>
                              </div>
                              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                                <span>Break-even CP mẹ:</span>
                                <span className="font-mono">{formatVND(exerciseComparison.breakEvenPrice)}</span>
                              </div>
                              <Divider className="!my-1.5" />
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium">Lợi nhuận:</span>
                                <span className={`font-bold text-lg ${exerciseComparison.marketProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                                  {exerciseComparison.marketProfit >= 0 ? "+" : ""}{formatVND(exerciseComparison.marketProfit)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-500">ROI:</span>
                                <span className={`font-semibold ${exerciseComparison.marketROI >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                                  {formatPercent(exerciseComparison.marketROI)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Quick Presets */}
                {position.buyPrice > 0 && (
                  <div className="space-y-3">
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-4 flex-wrap">
                        <span className="text-gray-700 dark:text-gray-300">
                          <BulbOutlined className="mr-1" />
                          Thêm nhanh:
                        </span>
                        <Space wrap>
                          {quickPresets.map((preset) => (
                            <Button
                              key={preset.label}
                              size="small"
                              onClick={() => handleQuickPreset(preset.factor)}
                              className={`font-medium shadow-sm ${preset.factor < 1 ? "!text-red-600 dark:!text-red-400 !border-red-200 dark:!border-red-800 hover:!border-red-400 hover:!bg-red-50 dark:hover:!bg-red-900/30" : "!text-green-600 dark:!text-green-400 !border-green-200 dark:!border-green-800 hover:!border-green-400 hover:!bg-green-50 dark:hover:!bg-green-900/30"}`}
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
                              style={{ backgroundColor: AppColors.primary, borderColor: AppColors.primary }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = `${AppColors.primary}CC`;
                                e.currentTarget.style.borderColor = `${AppColors.primary}CC`;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = AppColors.primary;
                                e.currentTarget.style.borderColor = AppColors.primary;
                              }}
                            >
                              Tất cả
                            </Button>
                          </Tooltip>
                        </Space>
                      </div>
                    </div>

                    {/* Underlying-based presets for warrants */}
                    {isWarrant && underlyingPresets.length > 0 && warrantData && (
                      <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 border border-orange-200 dark:border-orange-800">
                        <div className="flex items-center gap-4 flex-wrap">
                          <Tooltip title="Giá CW ước tính khi cổ phiếu mẹ thay đổi">
                            <Text type="secondary" className="dark:!text-gray-300">
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
                                  className="font-medium shadow-sm !border-orange-200 dark:!border-orange-700 hover:!border-orange-400 hover:!bg-orange-50 dark:hover:!bg-orange-900/30 !text-orange-700 dark:!text-orange-400"
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
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <Text strong>Kịch bản giá bán</Text>
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <InputNumber
                      placeholder="Giá bán mới"
                      value={newSellPrice}
                      onChange={setNewSellPrice}
                      min={0}
                      formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                      parser={(value) => Number(value?.replace(/,/g, ""))}
                      className="w-full sm:w-[140px]"
                    />
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={handleAddScenario}
                      disabled={!newSellPrice}
                      style={{
                        backgroundColor: !newSellPrice ? undefined : AppColors.primary,
                        borderColor: !newSellPrice ? undefined : AppColors.primary
                      }}
                      className={!newSellPrice ? "!bg-gray-400 !border-gray-400" : ""}
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
                        <Button danger icon={<DeleteOutlined />} className="dark:!text-red-400 dark:!border-red-700 dark:hover:!bg-red-900/30">Xóa tất cả</Button>
                      </Popconfirm>
                    )}
                  </div>
                </div>

                {scenarios.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 dark:bg-white/5 rounded-xl">
                    <SwapOutlined className="text-gray-400 text-3xl mb-4" />
                    <Text type="secondary" className="block">Nhập giá bán hoặc sử dụng nút thêm nhanh</Text>
                  </div>
                ) : (
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700">
                    <Table
                      columns={scenarioColumns}
                      dataSource={scenarioResults}
                      rowKey="id"
                      pagination={false}
                      rowClassName={(record) => "hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors"}
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
                    <QuestionCircleOutlined style={{ color: "var(--primary-500)" }} />
                    <Text strong>Hướng dẫn sử dụng</Text>
                  </div>
                ),
                children: (
                  <Row gutter={[24, 16]}>
                    <Col xs={24} md={8}>
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full text-white flex items-center justify-center font-medium shrink-0 text-sm" style={{ backgroundColor: "var(--primary-500)" }}>1</div>
                        <div>
                          <Text strong className="block">Tạo vị thế</Text>
                          <Text type="secondary" className="text-sm">Nhập giá mua và số lượng cổ phiếu/chứng quyền</Text>
                        </div>
                      </div>
                    </Col>
                    <Col xs={24} md={8}>
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full text-white flex items-center justify-center font-medium shrink-0 text-sm" style={{ backgroundColor: "var(--primary-500)" }}>2</div>
                        <div>
                          <Text strong className="block">Thêm kịch bản</Text>
                          <Text type="secondary" className="text-sm">Sử dụng nút thêm nhanh hoặc nhập giá bán</Text>
                        </div>
                      </div>
                    </Col>
                    <Col xs={24} md={8}>
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full text-white flex items-center justify-center font-medium shrink-0 text-sm" style={{ backgroundColor: "var(--primary-500)" }}>3</div>
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
        </div>
      </Content>
    </Layout>
  );
}
