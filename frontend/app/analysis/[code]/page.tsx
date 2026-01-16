"use client";

import { use, useState, useMemo, useEffect } from "react";
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
import type { ColumnsType } from "antd/es/table";
import { 
  ArrowLeftOutlined,
  PlusOutlined,
  DeleteOutlined,
  DollarOutlined,
  LineChartOutlined,
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
  TrophyOutlined,
  FallOutlined,
  RiseOutlined,
  SyncOutlined
} from "@ant-design/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStockPrice, useWarrantInfo, useWarrantsByUnderlying, useStockList } from "@/hooks";
import { useStockStore } from "@/stores";
import { StockDetailSkeleton } from "@/components";
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

interface ScenarioRow {
  id: string;
  sellPrice: number;
  grossRevenue: number;
  sellFee: number;
  sellTax: number;
  netRevenue: number;
  profit: number;
  profitPercent: number;
  isProfit: boolean;
  // For stocks: break-even price
  breakEvenPrice?: number;
}

// Helper to detect if code is a warrant
function isWarrantCode(code: string): boolean {
  return code.startsWith("C") && code.length > 5;
}

export default function AnalysisPage({ 
  params 
}: { 
  params: Promise<{ code: string }> 
}) {
  const { code } = use(params);
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
    
    // Make sure current code is in options (in case it's not in stock list or warrants)
    if (!options.find(o => o.value === symbolCode)) {
      options.push({
        value: symbolCode,
        label: symbolCode,
        type: isWarrant ? "warrant" : "stock"
      });
    }
    
    return options;
  }, [stockListData, relatedWarrants, symbolCode, isWarrant]);

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
        position.buyFeePercent,
        scenario.sellFeePercent,
        scenario.taxPercent
      );
      
      // For stocks: calculate break-even at this sell price level
      // Break-even = (Giá mua * SL + Phí mua + Phí bán + Thuế bán) / SL
      const principal = position.buyPrice * position.quantity;
      const buyFee = (principal * position.buyFeePercent) / 100;
      const sellFee = (scenario.sellPrice * position.quantity * scenario.sellFeePercent) / 100;
      const sellTax = (scenario.sellPrice * position.quantity * scenario.taxPercent) / 100;
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
  }, [position, scenarios, isWarrant]);

  // Calculate total cost
  const totalCost = useMemo(() => {
    if (!position) return 0;
    const principal = position.buyPrice * position.quantity;
    const buyFee = (principal * position.buyFeePercent) / 100;
    return principal + buyFee;
  }, [position]);
  
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

  // Table columns for WARRANTS (CW)
  const warrantColumns: ColumnsType<ScenarioRow> = [
    {
      title: "Giá bán",
      dataIndex: "sellPrice",
      key: "sellPrice",
      width: 130,
      render: (price: number, record) => (
        <InputNumber
          value={price}
          onChange={(value) => value && updateScenario(record.id, { sellPrice: value })}
          formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
          parser={(value) => Number(value?.replace(/,/g, ""))}
          min={0}
          className="w-full"
          size="small"
        />
      ),
    },
    {
      title: "Doanh thu",
      dataIndex: "grossRevenue",
      key: "grossRevenue",
      align: "right",
      render: (value: number) => (
        <Text className="text-slate-600">{formatVND(value)}</Text>
      ),
    },
    {
      title: (
        <Tooltip title="Phí bán 0.15%">
          <span>Phí bán <InfoCircleOutlined className="text-gray-400" /></span>
        </Tooltip>
      ),
      dataIndex: "sellFee",
      key: "sellFee",
      align: "right",
      render: (value: number) => <Text type="danger">-{formatVND(value)}</Text>,
    },
    {
      title: (
        <Tooltip title="Thuế bán 0.1%">
          <span>Thuế <InfoCircleOutlined className="text-gray-400" /></span>
        </Tooltip>
      ),
      dataIndex: "sellTax",
      key: "sellTax",
      align: "right",
      render: (value: number) => <Text type="danger">-{formatVND(value)}</Text>,
    },
    {
      title: "Thu ròng",
      dataIndex: "netRevenue",
      key: "netRevenue",
      align: "right",
      render: (value: number) => <Text strong>{formatVND(value)}</Text>,
    },
    {
      title: "Lợi nhuận",
      dataIndex: "profit",
      key: "profit",
      align: "right",
      render: (value: number, record) => (
        <div className={`px-2 py-1 rounded ${record.isProfit ? "bg-green-50" : "bg-red-50"}`}>
          <Text strong className={record.isProfit ? "text-green-600" : "text-red-600"}>
            {value >= 0 ? "+" : ""}{formatVND(value)}
          </Text>
        </div>
      ),
    },
    {
      title: "ROI",
      dataIndex: "profitPercent",
      key: "profitPercent",
      align: "right",
      width: 140,
      render: (value: number, record) => {
        const absValue = Math.abs(value);
        const barWidth = Math.min(absValue, 100); // Cap at 100% for visual
        return (
          <div className="space-y-1">
            <div className="flex items-center justify-end gap-2">
              <Tag color={record.isProfit ? "success" : "error"} className="font-semibold m-0">
                {formatPercent(value)}
              </Tag>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
              <div 
                className={`h-1.5 rounded-full transition-all ${record.isProfit ? "bg-green-500" : "bg-red-500"}`}
                style={{ width: `${barWidth}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      title: "",
      key: "action",
      width: 50,
      render: (_, record) => (
        <Tooltip title="Xóa kịch bản">
          <Button 
            type="text" 
            danger 
            icon={<DeleteOutlined />} 
            size="small"
            onClick={() => removeScenario(record.id)}
            className="hover:bg-red-50"
          />
        </Tooltip>
      ),
    },
  ];

  // Table columns for STOCKS (CP) - different from warrants
  const stockColumns: ColumnsType<ScenarioRow> = [
    {
      title: "Giá bán",
      dataIndex: "sellPrice",
      key: "sellPrice",
      width: 130,
      render: (price: number, record) => (
        <InputNumber
          value={price}
          onChange={(value) => value && updateScenario(record.id, { sellPrice: value })}
          formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
          parser={(value) => Number(value?.replace(/,/g, ""))}
          min={0}
          className="w-full"
          size="small"
        />
      ),
    },
    {
      title: (
        <Tooltip title="Giá cần đạt để hòa vốn (đã tính phí)">
          <span>Hòa vốn <InfoCircleOutlined className="text-gray-400" /></span>
        </Tooltip>
      ),
      dataIndex: "breakEvenPrice",
      key: "breakEvenPrice",
      align: "right",
      render: (value: number) => (
        <Text type="secondary">{formatVND(value)}</Text>
      ),
    },
    {
      title: "Doanh thu",
      dataIndex: "grossRevenue",
      key: "grossRevenue",
      align: "right",
      render: (value: number) => (
        <Text className="text-slate-600">{formatVND(value)}</Text>
      ),
    },
    {
      title: (
        <Tooltip title={`Phí: ${DEFAULT_SELL_FEE_PERCENT}% + Thuế: ${DEFAULT_SELL_TAX_PERCENT}%`}>
          <span>Phí + Thuế <InfoCircleOutlined className="text-gray-400" /></span>
        </Tooltip>
      ),
      key: "fees",
      align: "right",
      render: (_, record) => (
        <Text type="danger">-{formatVND(record.sellFee + record.sellTax)}</Text>
      ),
    },
    {
      title: "Thu ròng",
      dataIndex: "netRevenue",
      key: "netRevenue",
      align: "right",
      render: (value: number) => <Text strong>{formatVND(value)}</Text>,
    },
    {
      title: "Lợi nhuận",
      dataIndex: "profit",
      key: "profit",
      align: "right",
      render: (value: number, record) => (
        <div className={`px-2 py-1 rounded ${record.isProfit ? "bg-green-50" : "bg-red-50"}`}>
          <Text strong className={record.isProfit ? "text-green-600" : "text-red-600"}>
            {value >= 0 ? "+" : ""}{formatVND(value)}
          </Text>
        </div>
      ),
    },
    {
      title: "ROI",
      dataIndex: "profitPercent",
      key: "profitPercent",
      align: "right",
      width: 140,
      render: (value: number, record) => {
        const absValue = Math.abs(value);
        const barWidth = Math.min(absValue, 100); // Cap at 100% for visual
        return (
          <div className="space-y-1">
            <div className="flex items-center justify-end gap-2">
              <Tag color={record.isProfit ? "success" : "error"} className="font-semibold m-0">
                {formatPercent(value)}
              </Tag>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
              <div 
                className={`h-1.5 rounded-full transition-all ${record.isProfit ? "bg-green-500" : "bg-red-500"}`}
                style={{ width: `${barWidth}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      title: "",
      key: "action",
      width: 50,
      render: (_, record) => (
        <Tooltip title="Xóa kịch bản">
          <Button 
            type="text" 
            danger 
            icon={<DeleteOutlined />} 
            size="small"
            onClick={() => removeScenario(record.id)}
            className="hover:bg-red-50"
          />
        </Tooltip>
      ),
    },
  ];

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
        <div className="bg-[#191919] sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <Link href="/" className="flex items-center gap-2 text-white hover:text-[#CC785C] transition-colors">
                  <ArrowLeftOutlined />
                  <span className="hidden sm:inline">Trang chủ</span>
                </Link>
                {/* <Divider className="h-6 bg-gray-600 !mx-3" style={{ borderLeft: '1px solid #4B5563' }} /> */}
                <Title level={4} className="!mb-0 !text-white">{symbolCode}</Title>
              </div>
            </div>
          </div>
        </div>
        <Content className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <StockDetailSkeleton />
          </div>
        </Content>
      </Layout>
    );
  }

  if (error || (!stockData && !warrantData)) {
    return (
      <Layout className="min-h-screen bg-gradient-soft">
        <div className="bg-[#191919] sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <Link href="/" className="flex items-center text-white hover:text-[#CC785C] transition-colors">
                  <ArrowLeftOutlined />
                </Link>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#CC785C] flex items-center justify-center shadow-md">
                    <LineChartOutlined className="text-white text-lg" />
                  </div>
                  <Title level={4} className="!mb-0 !text-white">{symbolCode}</Title>
                </div>
              </div>
            </div>
          </div>
        </div>
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
      <div className="bg-[#191919] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center text-white hover:text-[#CC785C] transition-colors">
                <ArrowLeftOutlined />
              </Link>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md ${
                  isWarrant 
                    ? nearExpiration ? "bg-orange-500" : "bg-[#CC785C]"
                    : "bg-[#CC785C]"
                }`}>
                  {isWarrant ? <FireOutlined className="text-white text-lg" /> : <LineChartOutlined className="text-white text-lg" />}
                </div>
                <Title level={4} className="!mb-0 !text-white">{symbolCode}</Title>
                {isWarrant && nearExpiration && (
                  <Tag color="warning" className="font-medium">
                    <WarningOutlined className="mr-1" />
                    Sắp đáo hạn
                  </Tag>
                )}
              </div>
            </div>
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
              className="w-60 hidden lg:block"
              suffixIcon={<SearchOutlined className="text-gray-400" />}
              filterOption={(input, option: any) => {
                const search = input.toUpperCase();
                return (
                  option?.value?.toUpperCase().includes(search) ||
                  option?.searchText?.includes(input.toLowerCase())
                );
              }}
            />
          </div>
        </div>
      </div>

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
                {/* Position Info Row - Fixed layout */}
                <Row gutter={[16, 16]} align="stretch">
                  <Col xs={24} sm={12} lg={6}>
                    <div className="mb-2">
                      <Text type="secondary" className="text-sm">
                        <DollarOutlined className="mr-1" />
                        Giá mua (VND)
                      </Text>
                    </div>
                    <InputNumber
                      size="large"
                      value={position.buyPrice}
                      onChange={(v) => v && setPosition({ ...position, buyPrice: v })}
                      className="w-full"
                      min={0}
                      formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                      parser={(value) => Number(value?.replace(/,/g, ""))}
                    />
                  </Col>
                  <Col xs={24} sm={12} lg={6}>
                    <div className="mb-2">
                      <Text type="secondary" className="text-sm">
                        <SwapOutlined className="mr-1" />
                        Số lượng
                      </Text>
                    </div>
                    <InputNumber
                      size="large"
                      value={position.quantity}
                      onChange={(v) => v && setPosition({ ...position, quantity: v })}
                      className="w-full"
                      min={0}
                      step={100}
                      formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                      parser={(value) => Number(value?.replace(/,/g, ""))}
                    />
                  </Col>
                  <Col xs={24} sm={12} lg={6}>
                    <div className="mb-2">
                      <Text type="secondary" className="text-sm">
                        Phí mua
                        <Tooltip title="Phí giao dịch mặc định 0.15%">
                          <InfoCircleOutlined className="ml-1" />
                        </Tooltip>
                      </Text>
                    </div>
                    <Space.Compact className="w-full">
                      <InputNumber
                        size="large"
                        value={position.buyFeePercent}
                        onChange={(v) => v !== null && setPosition({ ...position, buyFeePercent: v })}
                        className="w-full"
                        min={0}
                        max={1}
                        step={0.01}
                      />
                      <Button size="large" className="!cursor-default !bg-gray-50 !text-gray-600">%</Button>
                    </Space.Compact>
                  </Col>
                  <Col xs={24} sm={12} lg={6}>
                    <div className="mb-2">
                      <Text type="secondary" className="text-sm">Tổng chi phí</Text>
                    </div>
                    <div className="p-3 rounded-xl bg-primary-50 h-[40px] flex items-center justify-center">
                      <Text strong className="text-primary-600 text-lg">{formatVND(totalCost)}</Text>
                      {principal > 0 && (
                        <Text type="secondary" className="text-xs ml-2">
                          (phí: {formatVND(totalCost - principal)})
                        </Text>
                      )}
                    </div>
                  </Col>
                </Row>

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

                <Divider />

                {/* Scenario Summary Stats */}
                {scenarioStats && (
                  <div className="mb-6">
                    <Row gutter={[16, 16]}>
                      <Col xs={24} sm={12} lg={6}>
                        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                          <div className="flex items-center gap-2 mb-2">
                            <TrophyOutlined className="text-green-600" />
                            <Text type="secondary" className="text-sm">Lãi tốt nhất</Text>
                          </div>
                          <div className="text-xl font-bold text-green-600">
                            {formatPercent(scenarioStats.best.profitPercent)}
                          </div>
                          <div className="text-sm text-green-700">
                            {formatVND(scenarioStats.best.profit)} @ {formatVND(scenarioStats.best.sellPrice)}
                          </div>
                        </div>
                      </Col>
                      <Col xs={24} sm={12} lg={6}>
                        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
                          <div className="flex items-center gap-2 mb-2">
                            <FallOutlined className="text-red-600" />
                            <Text type="secondary" className="text-sm">Lỗ nặng nhất</Text>
                          </div>
                          <div className="text-xl font-bold text-red-600">
                            {formatPercent(scenarioStats.worst.profitPercent)}
                          </div>
                          <div className="text-sm text-red-700">
                            {formatVND(scenarioStats.worst.profit)} @ {formatVND(scenarioStats.worst.sellPrice)}
                          </div>
                        </div>
                      </Col>
                      <Col xs={24} sm={12} lg={6}>
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                          <div className="flex items-center gap-2 mb-2">
                            <SyncOutlined className="text-blue-600" />
                            <Text type="secondary" className="text-sm">Trung bình</Text>
                          </div>
                          <div className={`text-xl font-bold ${scenarioStats.avgProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {formatPercent(scenarioStats.avgProfitPercent)}
                          </div>
                          <div className="text-sm text-gray-600">
                            {scenarioStats.avgProfit >= 0 ? "+" : ""}{formatVND(Math.round(scenarioStats.avgProfit))}
                          </div>
                        </div>
                      </Col>
                      <Col xs={24} sm={12} lg={6}>
                        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
                          <div className="flex items-center gap-2 mb-2">
                            <RiseOutlined className="text-slate-600" />
                            <Text type="secondary" className="text-sm">Tỷ lệ có lãi</Text>
                          </div>
                          <div className="text-xl font-bold text-slate-700">
                            {scenarioStats.profitableCount}/{scenarioStats.totalCount}
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full transition-all"
                              style={{ width: `${(scenarioStats.profitableCount / scenarioStats.totalCount) * 100}%` }}
                            />
                          </div>
                        </div>
                      </Col>
                    </Row>
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
                      columns={isWarrant ? warrantColumns : stockColumns}
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
