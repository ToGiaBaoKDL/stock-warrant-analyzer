"use client";

import { useState, useMemo } from "react";
import { 
  Layout, 
  Card, 
  Table, 
  Select, 
  InputNumber, 
  Typography, 
  Tag, 
  Space, 
  Spin, 
  Alert,
  Row,
  Col,
  Affix,
  Tooltip,
  Button,
  Segmented,
  Empty,
  Divider
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { 
  ArrowLeftOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  FilterOutlined,
  SortAscendingOutlined,
  DollarOutlined,
  NumberOutlined,
  StockOutlined
} from "@ant-design/icons";
import Link from "next/link";
import { useWarrantsByUnderlying, useStockList } from "@/hooks";
import { useWarrantStore } from "@/stores";
import { 
  calculateBreakEven, 
  isNearExpiration, 
  formatVND, 
  formatPercent,
  DEFAULT_BUY_FEE_PERCENT,
  DEFAULT_SELL_FEE_PERCENT,
  DEFAULT_SELL_TAX_PERCENT
} from "@/utils";
import type { WarrantItem } from "@/types/api";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

interface WarrantTableRow extends WarrantItem {
  breakEven: number;
  isProfitable: boolean;
  profitMargin: number;
  profitMarginPercent: number;
  estimatedProfit: number;
  estimatedProfitPercent: number;
  totalCost: number;
  netRevenue: number;
  leverage: number; // Đòn bẩy = Giá CP / (Giá CW * Tỷ lệ chuyển đổi)
}

export default function WarrantsPage() {
  const { 
    selectedUnderlying, 
    setSelectedUnderlying, 
    targetUnderlyingPrice, 
    setTargetUnderlyingPrice 
  } = useWarrantStore();
  
  const [sortBy, setSortBy] = useState<string>("breakEven");
  const [filterProfitable, setFilterProfitable] = useState<"all" | "profitable" | "unprofitable">("all");
  const [quantity, setQuantity] = useState<number>(1000);
  const [minDaysToMaturity, setMinDaysToMaturity] = useState<number | null>(null);
  
  // Fetch warrants for selected underlying - includes underlying price and change info
  const { data: warrantsData, isLoading: warrantsLoading, isFetching, error: warrantsError, refetch } = 
    useWarrantsByUnderlying(selectedUnderlying, !!selectedUnderlying);

  // Fetch stock list for dropdown
  const { data: stockListData, isLoading: stockListLoading } = useStockList();

  // Build underlying options from API
  const underlyingOptions = useMemo(() => {
    if (!stockListData?.stocks) return [];
    return stockListData.stocks.map((stock) => ({
      value: stock.symbol,
      searchText: `${stock.symbol} ${stock.name}`.toLowerCase(),
      label: (
        <div className="flex items-center gap-2">
          <Tag color="blue" className="text-xs">
            CP
          </Tag>
          {`${stock.symbol} - ${stock.name}`}
        </div>
      ),
    }));
  }, [stockListData]);

  // Calculate break-even and profit for each warrant
  const tableData: WarrantTableRow[] = useMemo(() => {
    if (!warrantsData?.warrants) return [];
    
    // Get underlying price from nested object
    const underlyingPrice = warrantsData.underlying?.current_price || 0;
    const target = targetUnderlyingPrice || underlyingPrice;
    
    let data = warrantsData.warrants.map((warrant) => {
      // Break-even calculation: CP cần đạt để CW hòa vốn nếu exercise
      const breakEvenResult = calculateBreakEven(
        warrant.current_price,
        warrant.conversion_ratio,
        warrant.exercise_price,
        target
      );
      
      /**
       * CORRECT Warrant Profit Calculation using Intrinsic Value method:
       * 
       * Intrinsic Value (at target price) = max(0, (TargetUnderlying - ExercisePrice) / ConversionRatio)
       * 
       * If exercise at maturity:
       * - Settlement = IntrinsicValue per CW * Quantity
       * 
       * If sell CW before maturity (what-if analysis):
       * - Estimated CW Price ≈ IntrinsicValue + TimeValue
       * - TimeValue decays as expiry approaches (simplified: assume same time value ratio)
       * 
       * Best practice: Use intrinsic value change as base, then estimate market price
       */
      
      // Current intrinsic value
      const currentIntrinsicValue = Math.max(0, 
        (underlyingPrice - warrant.exercise_price) / warrant.conversion_ratio
      );
      
      // Target intrinsic value
      const targetIntrinsicValue = Math.max(0, 
        (target - warrant.exercise_price) / warrant.conversion_ratio
      );
      
      // Current time value = Current CW Price - Intrinsic Value
      const currentTimeValue = Math.max(0, warrant.current_price - currentIntrinsicValue);
      
      // Estimate CW price at target underlying price
      // Time value is assumed to remain similar (or decay slightly based on days to maturity)
      // This is a simplification - in reality, time value depends on volatility, time, etc.
      const timeValueFactor = warrant.days_to_maturity > 30 ? 1.0 : 
                             warrant.days_to_maturity > 14 ? 0.8 : 0.5;
      const estimatedSellPrice = Math.max(0, targetIntrinsicValue + (currentTimeValue * timeValueFactor));
      
      // Buy cost
      const buyPrice = warrant.current_price;
      const principal = buyPrice * quantity;
      const buyFee = (principal * DEFAULT_BUY_FEE_PERCENT) / 100;
      const totalCost = principal + buyFee;
      
      // Revenue
      const grossRevenue = estimatedSellPrice * quantity;
      const sellFee = (grossRevenue * DEFAULT_SELL_FEE_PERCENT) / 100;
      const sellTax = (grossRevenue * DEFAULT_SELL_TAX_PERCENT) / 100;
      const netRevenue = grossRevenue - sellFee - sellTax;
      
      // Profit
      const estimatedProfit = netRevenue - totalCost;
      const estimatedProfitPercent = totalCost > 0 ? (estimatedProfit / totalCost) * 100 : 0;
      
      // Đòn bẩy = Giá CP / (Giá CW * Tỷ lệ chuyển đổi)
      const leverage = warrant.current_price > 0 && warrant.conversion_ratio > 0
        ? underlyingPrice / (warrant.current_price * warrant.conversion_ratio)
        : 0;
      
      return {
        ...warrant,
        breakEven: breakEvenResult.breakEvenPrice,
        isProfitable: breakEvenResult.isProfitable,
        profitMargin: breakEvenResult.profitMargin,
        profitMarginPercent: breakEvenResult.profitMarginPercent,
        estimatedProfit,
        estimatedProfitPercent,
        totalCost,
        netRevenue,
        leverage,
      };
    });
    
    // Apply filter
    if (filterProfitable === "profitable") {
      data = data.filter(w => w.isProfitable);
    } else if (filterProfitable === "unprofitable") {
      data = data.filter(w => !w.isProfitable);
    }
    
    // Apply days to maturity filter
    // Skip CWs with unknown days (days_to_maturity < 0) when filtering
    if (minDaysToMaturity !== null) {
      data = data.filter(w => w.days_to_maturity >= 0 && w.days_to_maturity >= minDaysToMaturity);
    }
    
    // Apply sort
    // For expiry sort, put unknown days (< 0) at the end
    if (sortBy === "breakEven") {
      data.sort((a, b) => a.breakEven - b.breakEven);
    } else if (sortBy === "margin") {
      data.sort((a, b) => b.profitMarginPercent - a.profitMarginPercent);
    } else if (sortBy === "expiry") {
      data.sort((a, b) => {
        // Put unknown days at the end
        if (a.days_to_maturity < 0 && b.days_to_maturity >= 0) return 1;
        if (b.days_to_maturity < 0 && a.days_to_maturity >= 0) return -1;
        return a.days_to_maturity - b.days_to_maturity;
      });
    } else if (sortBy === "volume") {
      data.sort((a, b) => b.volume - a.volume);
    } else if (sortBy === "symbol") {
      data.sort((a, b) => a.symbol.localeCompare(b.symbol));
    }
    
    return data;
  }, [warrantsData, targetUnderlyingPrice, filterProfitable, sortBy, quantity, minDaysToMaturity]);

  // Find best break-even warrant
  const bestBreakEvenWarrant = useMemo(() => {
    if (tableData.length === 0) return null;
    return tableData.reduce((best, current) => 
      current.breakEven < best.breakEven ? current : best
    , tableData[0]);
  }, [tableData]);

  // Table columns
  const columns: ColumnsType<WarrantTableRow> = [
    {
      title: "Mã CW",
      dataIndex: "symbol",
      key: "symbol",
      width: 110,
      render: (symbol: string, record) => (
        <Link href={`/analysis/${symbol}`}>
          <div className="flex flex-col gap-0.5">
            <Text strong className="text-[#CC785C] hover:text-[#b5654a]">{symbol}</Text>
            {record.days_to_maturity >= 0 && isNearExpiration(record.days_to_maturity) && (
              <Tag color="warning" icon={<WarningOutlined />} className="text-[10px] px-1 py-0 leading-tight w-fit">
                Sắp hết
              </Tag>
            )}
          </div>
        </Link>
      ),
    },
    {
      title: (
        <Tooltip title="Tổ chức phát hành">
          <span>TCPH</span>
        </Tooltip>
      ),
      dataIndex: "issuer_name",
      key: "issuer_name",
      width: 80,
      render: (issuer: string, record: WarrantTableRow) => (
        <Tooltip title={issuer || "Chưa có dữ liệu từ SSI"}>
          {issuer ? (
            <Tag color="blue" className="text-xs">{issuer}</Tag>
          ) : (
            <Tag color="default" className="text-xs">N/A</Tag>
          )}
        </Tooltip>
      ),
    },
    {
      title: (
        <Tooltip title="Giá hiện tại của chứng quyền trên thị trường">
          <span>Giá CW</span>
        </Tooltip>
      ),
      dataIndex: "current_price",
      key: "current_price",
      width: 90,
      align: "right",
      render: (price: number) => (
        <Text strong>{formatVND(price)}</Text>
      ),
    },
    {
      title: (
        <Tooltip title="Khối lượng giao dịch">
          <span>KL GD</span>
        </Tooltip>
      ),
      dataIndex: "volume",
      key: "volume",
      width: 90,
      align: "right",
      sorter: (a, b) => a.volume - b.volume,
      render: (volume: number) => (
        <Text className="text-slate-600">
          {volume >= 1000000 
            ? `${(volume / 1000000).toFixed(1)}M`
            : volume >= 1000 
              ? `${(volume / 1000).toFixed(0)}K`
              : volume.toLocaleString()}
        </Text>
      ),
    },
    {
      title: (
        <Tooltip title="Thay đổi so với phiên trước">
          <span>+/-</span>
        </Tooltip>
      ),
      dataIndex: "change_percent",
      key: "change_percent",
      width: 70,
      align: "right",
      sorter: (a, b) => a.change_percent - b.change_percent,
      render: (changePercent: number) => (
        <Text className={`font-medium ${changePercent > 0 ? "text-green-600" : changePercent < 0 ? "text-red-600" : "text-gray-500"}`}>
          {changePercent > 0 ? "+" : ""}{changePercent.toFixed(1)}%
        </Text>
      ),
    },
    {
      title: (
        <Tooltip title="Tỷ lệ chuyển đổi (1 CW = 1/N cổ phiếu)">
          <span>Tỷ lệ CĐ <InfoCircleOutlined className="text-gray-400" /></span>
        </Tooltip>
      ),
      dataIndex: "conversion_ratio",
      key: "conversion_ratio",
      width: 90,
      align: "center",
      render: (ratio: number, record: WarrantTableRow) => {
        // Check if data is incomplete (default ratio = 1 and no exercise price)
        const hasData = record.exercise_price > 0 || ratio !== 1;
        return (
          <Tooltip title={!hasData ? "Chưa có dữ liệu từ SSI" : `${ratio}:1`}>
            <Tag color={hasData ? "blue" : "default"}>{ratio}:1</Tag>
          </Tooltip>
        );
      },
    },
    {
      title: (
        <Tooltip title="Đòn bẩy = Giá CP / (Giá CW × Tỷ lệ CĐ). Đòn bẩy cao = lợi nhuận/rủi ro lớn hơn">
          <span>Đòn bẩy <InfoCircleOutlined className="text-gray-400" /></span>
        </Tooltip>
      ),
      dataIndex: "leverage",
      key: "leverage",
      width: 110,
      align: "center",
      sorter: (a, b) => a.leverage - b.leverage,
      render: (leverage: number) => (
        <Tag color={leverage >= 10 ? "red" : leverage >= 5 ? "orange" : "green"}>
          {leverage.toFixed(1)}x
        </Tag>
      ),
    },
    {
      title: (
        <Tooltip title="Giá thực hiện">
          <span>Giá TH</span>
        </Tooltip>
      ),
      dataIndex: "exercise_price",
      key: "exercise_price",
      width: 95,
      align: "right",
      render: (price: number) => (
        <Tooltip title={price === 0 ? "Chưa có dữ liệu từ SSI" : ""}>
          <Text className={price === 0 ? "text-gray-400" : ""}>
            {price > 0 ? formatVND(price) : "N/A"}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: (
        <Tooltip title="Giá cổ phiếu mẹ cần đạt để hòa vốn khi exercise CW">
          <span>Break-even <InfoCircleOutlined className="text-gray-400" /></span>
        </Tooltip>
      ),
      dataIndex: "breakEven",
      key: "breakEven",
      width: 130,
      align: "right",
      sorter: (a, b) => a.breakEven - b.breakEven,
      render: (breakEven: number, record) => (
        <div className={`px-2 py-1 rounded ${record.isProfitable ? "bg-green-50" : "bg-red-50"}`}>
          <Text 
            strong 
            className={record.isProfitable ? "text-green-600" : "text-red-600"}
          >
            {formatVND(breakEven)}
          </Text>
        </div>
      ),
    },
    {
      title: (
        <Tooltip title={`Lợi nhuận ước tính với ${quantity.toLocaleString()} CW dựa trên Giá trị nội tại: (Giá kỳ vọng - Giá TH) / Tỷ lệ + Time Value`}>
          <span>Lợi nhuận <InfoCircleOutlined className="text-gray-400" /></span>
        </Tooltip>
      ),
      dataIndex: "estimatedProfit",
      key: "estimatedProfit",
      width: 140,
      align: "right",
      render: (profit: number) => (
        <div className={`px-2 py-1 rounded ${profit >= 0 ? "bg-green-50" : "bg-red-50"}`}>
          <Text strong className={profit >= 0 ? "text-green-600" : "text-red-600"}>
            {profit >= 0 ? "+" : ""}{formatVND(profit)}
          </Text>
        </div>
      ),
    },
    {
      title: (
        <Tooltip title="Tỷ suất sinh lợi (ROI) ước tính">
          <span>ROI <InfoCircleOutlined className="text-gray-400" /></span>
        </Tooltip>
      ),
      dataIndex: "estimatedProfitPercent",
      key: "estimatedProfitPercent",
      width: 95,
      align: "right",
      render: (percent: number) => (
        <Tag color={percent >= 0 ? "success" : "error"} className="font-semibold">
          {formatPercent(percent)}
        </Tag>
      ),
    },
    {
      title: (
        <Tooltip title="Chênh lệch % giữa Giá kỳ vọng và Break-even. Dương = có lãi, Âm = lỗ">
          <span>Biên LN <InfoCircleOutlined className="text-gray-400" /></span>
        </Tooltip>
      ),
      dataIndex: "profitMarginPercent",
      key: "profitMarginPercent",
      width: 120,
      align: "right",
      sorter: (a, b) => a.profitMarginPercent - b.profitMarginPercent,
      render: (percent: number, record) => (
        <Space>
          {record.isProfitable ? (
            <CheckCircleOutlined className="text-green-500" />
          ) : (
            <WarningOutlined className="text-red-500" />
          )}
          <Text strong className={record.isProfitable ? "text-green-600" : "text-red-600"}>
            {formatPercent(percent)}
          </Text>
        </Space>
      ),
    },
    {
      title: (
        <Tooltip title="Ngày đáo hạn của chứng quyền và số ngày còn lại">
          <span>Đáo hạn</span>
        </Tooltip>
      ),
      dataIndex: "maturity_date",
      key: "maturity_date",
      width: 120,
      sorter: (a, b) => a.days_to_maturity - b.days_to_maturity,
      render: (date: string, record) => {
        const hasValidExpiry = record.days_to_maturity >= 0;
        return (
          <div className="flex flex-col">
            {hasValidExpiry ? (
              <>
                <Text>{new Date(date).toLocaleDateString("vi-VN")}</Text>
                <Text 
                  type="secondary" 
                  className={`text-xs ${isNearExpiration(record.days_to_maturity) ? "text-red-500 font-semibold" : ""}`}
                >
                  ({record.days_to_maturity} ngày)
                </Text>
              </>
            ) : (
              <Tooltip title="Chưa có dữ liệu từ SSI">
                <Text className="text-gray-400">N/A</Text>
              </Tooltip>
            )}
          </div>
        );
      },
    },
  ];

  // Show full loading screen when initial load or changing underlying
  const isInitialLoading = warrantsLoading && selectedUnderlying;

  return (
    <Layout className="min-h-screen" style={{ background: '#F5F4EF' }}>
      <Header className="h-14" style={{ background: "#191919" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center h-full">
          <Link href="/" className="text-white mr-4 hover:text-[#CC785C] transition-colors">
            <ArrowLeftOutlined className="text-lg" />
          </Link>
          <div className="w-7 h-7 rounded bg-[#CC785C] flex items-center justify-center mr-3">
            <FilterOutlined className="text-white text-sm" />
          </div>
          <Title level={4} className="!text-white !mb-0 !font-medium">
            Warrant Screener
          </Title>
        </div>
      </Header>

      <Content className="p-6 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Filter Header */}
          <Card className="mb-4 shadow-lg border-0 sticky top-0 z-10 bg-white">
              <Row gutter={[16, 16]} align="bottom" justify="space-between">
                <Col xs={24} md={6}>
                  <div className="mb-2">
                    <Text strong className="text-slate-600">
                      <StockOutlined className="mr-1" /> Cổ phiếu mẹ
                    </Text>
                  </div>
                  <Select
                    showSearch
                    placeholder="Chọn mã cổ phiếu..."
                    value={selectedUnderlying}
                    onChange={setSelectedUnderlying}
                    options={underlyingOptions}
                    className="w-full"
                    size="large"
                    filterOption={(input, option: any) => {
                      const search = input.toUpperCase();
                      return (
                        option?.value?.toUpperCase().includes(search) ||
                        option?.searchText?.includes(input.toLowerCase())
                      );
                    }}
                  />
                </Col>
                
                <Col xs={12} md={3}>
                  <div className="mb-2">
                    <Text strong className="text-slate-600">
                      <DollarOutlined className="mr-1" /> Giá kỳ vọng
                    </Text>
                  </div>
                  <InputNumber
                    size="large"
                    placeholder={warrantsData?.underlying ? `Hiện tại: ${formatVND(warrantsData.underlying.current_price)}` : "Nhập giá mục tiêu"}
                    value={targetUnderlyingPrice}
                    onChange={(value) => setTargetUnderlyingPrice(value)}
                    className="w-full"
                    min={0}
                    step={100}
                    formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                    parser={(value) => Number(value?.replace(/,/g, ""))}
                  />
                </Col>
                
                <Col xs={12} md={3}>
                  <div className="mb-2">
                    <Text strong className="text-slate-600">
                      <NumberOutlined className="mr-1" /> Khối lượng
                    </Text>
                  </div>
                  <InputNumber
                    size="large"
                    placeholder="Số lượng CW"
                    value={quantity}
                    onChange={(value) => value && setQuantity(value)}
                    className="w-full"
                    min={100}
                    step={100}
                    formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                    parser={(value) => Number(value?.replace(/,/g, ""))}
                  />
                </Col>
                
                <Col xs={24} md={6}>
                  {warrantsData?.underlying && (
                    <div className="bg-slate-50 rounded-lg p-3">
                      <Text type="secondary" className="text-xs block mb-1">Giá hiện tại {selectedUnderlying}</Text>
                      <div className="flex items-baseline gap-2">
                        <Text strong className="text-lg">{formatVND(warrantsData.underlying.current_price)}</Text>
                        <Text className={`text-base font-semibold ${
                          (warrantsData.underlying.change ?? 0) > 0 ? "text-green-600" : 
                          (warrantsData.underlying.change ?? 0) < 0 ? "text-red-600" : "text-gray-500"
                        }`}>
                          {(warrantsData.underlying.change_percent ?? 0) > 0 ? "+" : ""}{formatPercent(warrantsData.underlying.change_percent ?? 0)}
                        </Text>
                      </div>
                    </div>
                  )}
                </Col>
                
                <Col xs={24} md={4}>
                  <Button 
                    icon={<ReloadOutlined spin={isFetching} />} 
                    onClick={() => refetch()}
                    size="large"
                    className="w-full"
                  >
                    Làm mới
                  </Button>
                </Col>
              </Row>
              
              {/* Filter & Sort Options */}
              {selectedUnderlying && warrantsData && warrantsData.warrants.length > 0 && !isInitialLoading && (
                <>
                  <div className="border-t border-slate-100 mt-4 pt-4">
                    <Row gutter={16} align="middle">
                      <Col>
                        <Text type="secondary" className="mr-2">Lọc:</Text>
                        <Segmented
                          options={[
                            { value: "all", label: "Tất cả" },
                            { value: "profitable", label: "✅ Có lãi" },
                            { value: "unprofitable", label: "❌ Lỗ" },
                          ]}
                          value={filterProfitable}
                          onChange={(value) => setFilterProfitable(value as typeof filterProfitable)}
                        />
                      </Col>
                      <Col>
                        <Text type="secondary" className="mr-2 ml-4">Sắp xếp:</Text>
                        <Segmented
                          options={[
                            { value: "symbol", label: "Mã CW" },
                            { value: "breakEven", label: <span><SortAscendingOutlined /> Break-even</span> },
                            { value: "margin", label: "Biên LN" },
                            { value: "volume", label: "Khối lượng" },
                            { value: "expiry", label: "Đáo hạn" },
                          ]}
                          value={sortBy}
                          onChange={(value) => setSortBy(value as string)}
                        />
                      </Col>
                      <Col>
                        <Text type="secondary" className="mr-2 ml-4">Tối thiểu:</Text>
                        <Select
                          value={minDaysToMaturity}
                          onChange={setMinDaysToMaturity}
                          className="w-32"
                          placeholder="Ngày còn lại"
                          allowClear
                          options={[
                            { value: 7, label: "≥ 7 ngày" },
                            { value: 14, label: "≥ 14 ngày" },
                            { value: 30, label: "≥ 30 ngày" },
                            { value: 60, label: "≥ 60 ngày" },
                          ]}
                        />
                      </Col>
                    </Row>
                  </div>
                </>
              )}
            </Card>

          {/* Content */}
          {!selectedUnderlying ? (
            <Card className="text-center py-12">
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <div className="flex flex-col items-center gap-2">
                    <Text strong className="text-lg">Chọn cổ phiếu mẹ để bắt đầu</Text>
                    <Text type="secondary">Sử dụng bộ lọc ở trên để xem danh sách chứng quyền</Text>
                  </div>
                }
              />
            </Card>
          ) : isInitialLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Spin size="large" />
              <Text type="secondary">Đang tải dữ liệu từ SSI...</Text>
            </div>
          ) : warrantsError ? (
            <Alert
              title="Lỗi tải dữ liệu"
              description="Không thể tải danh sách chứng quyền. Vui lòng kiểm tra kết nối và thử lại."
              type="error"
              showIcon
              action={
                <Button 
                  onClick={() => refetch()}
                  className="!bg-[#CC785C] !border-[#CC785C] !text-white hover:!bg-[#b5654a] hover:!border-[#b5654a]"
                >
                  Thử lại
                </Button>
              }
            />
          ) : tableData.length === 0 ? (
            <Alert
              title={filterProfitable === "all" ? "Không tìm thấy chứng quyền" : filterProfitable === "profitable" ? "Không có CW có lãi" : "Không có CW lỗ"}
              description={
                filterProfitable === "all"
                  ? selectedUnderlying 
                    ? `Mã ${selectedUnderlying} hiện chưa có chứng quyền nào được phát hành. Vui lòng chọn mã cổ phiếu khác.`
                    : "Vui lòng chọn mã cổ phiếu để xem danh sách chứng quyền."
                  : filterProfitable === "profitable"
                    ? `Tại mức giá kỳ vọng ${formatVND(targetUnderlyingPrice || warrantsData?.underlying?.current_price || 0)}, không có CW nào cho lãi. Thử nhập giá kỳ vọng cao hơn.`
                    : `Tại mức giá kỳ vọng hiện tại, tất cả các CW đều có lãi.`
              }
              type={filterProfitable === "all" ? "info" : filterProfitable === "profitable" ? "info" : "warning"}
              showIcon
            />
          ) : (
            <>
              {/* Stats Cards - Above Table */}
              <Row gutter={[16, 16]} className="mb-4">
                <Col xs={12} sm={6}>
                  <Card className="shadow-sm border-0" styles={{ body: { padding: 16 } }}>
                    <div className="text-center">
                      <Text className="text-xs text-gray-500 block mb-1">Tổng số CW</Text>
                      <Text strong className="text-2xl">{tableData.length}</Text>
                    </div>
                  </Card>
                </Col>
                <Col xs={12} sm={6}>
                  <Card className="shadow-sm border-0 bg-green-50" styles={{ body: { padding: 16 } }}>
                    <div className="text-center">
                      <Text className="text-xs text-gray-500 block mb-1">CW có lãi</Text>
                      <Text strong className="text-2xl text-green-600">
                        {tableData.filter(w => w.isProfitable).length}
                        <Text type="secondary" className="text-sm font-normal">/{tableData.length}</Text>
                      </Text>
                    </div>
                  </Card>
                </Col>
                <Col xs={12} sm={6}>
                  <Card className="shadow-sm border-0 bg-orange-50" styles={{ body: { padding: 16 } }}>
                    <div className="text-center">
                      <Text className="text-xs text-gray-500 block mb-1">Sắp đáo hạn (&lt;14 ngày)</Text>
                      <Text strong className="text-2xl text-orange-600">
                        {tableData.filter(w => isNearExpiration(w.days_to_maturity)).length}
                      </Text>
                    </div>
                  </Card>
                </Col>
                <Col xs={12} sm={6}>
                  <Tooltip title={bestBreakEvenWarrant ? `CW ${bestBreakEvenWarrant.symbol}` : undefined}>
                    <Card className="shadow-sm border-0 bg-blue-50" styles={{ body: { padding: 16 } }}>
                      <div className="text-center">
                        <Text className="text-xs text-gray-500 block mb-1">
                          Break-even thấp nhất
                          {bestBreakEvenWarrant && (
                            <Tag color="blue" className="ml-1 text-xs">{bestBreakEvenWarrant.symbol}</Tag>
                          )}
                        </Text>
                        <Text strong className="text-xl text-blue-600">
                          {formatVND(bestBreakEvenWarrant?.breakEven || 0)}
                        </Text>
                      </div>
                    </Card>
                  </Tooltip>
                </Col>
              </Row>

              {/* Main Table */}
              <Card className="shadow-sm mb-6 overflow-hidden">
                <div className="relative">
                  <Table
                    columns={columns}
                    dataSource={tableData}
                    rowKey="symbol"
                    scroll={{ x: 1200, y: 500 }}
                    pagination={{ 
                    pageSize: 15,
                    showSizeChanger: true,
                    pageSizeOptions: ["10", "15", "25", "50"],
                    showTotal: (total) => `Tổng ${total} chứng quyền`
                  }}
                  rowClassName={(record) => 
                    record.isProfitable ? "bg-green-50 hover:bg-green-100" : "hover:bg-slate-50"
                  }
                  size="middle"
                  />
                </div>
              </Card>

              {/* Formula Info Cards */}
              <Card className="mb-6" styles={{ body: { padding: 24 } }}>
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12} lg={6}>
                    <div className="bg-[#F5F4EF] rounded-lg p-4 h-full">
                      <Text className="text-xs text-gray-500 block mb-1">Màu nền xanh</Text>
                      <Text strong className="font-mono text-sm block mb-2">CW có lãi</Text>
                      <Text type="secondary" className="text-xs">Break-even &lt; Giá kỳ vọng</Text>
                    </div>
                  </Col>
                  <Col xs={24} sm={12} lg={6}>
                    <div className="bg-[#F5F4EF] rounded-lg p-4 h-full">
                      <Text className="text-xs text-gray-500 block mb-1">Tag Sắp hết</Text>
                      <Text strong className="font-mono text-sm block mb-2">Sắp đáo hạn</Text>
                      <Text type="secondary" className="text-xs">Còn lại ≤ 14 ngày</Text>
                    </div>
                  </Col>
                  <Col xs={24} sm={12} lg={6}>
                    <div className="bg-[#F5F4EF] rounded-lg p-4 h-full">
                      <Text className="text-xs text-gray-500 block mb-1">Công thức lợi nhuận</Text>
                      <Text strong className="font-mono text-sm block mb-2">(Giá KV - Giá TH) / TL + TV</Text>
                      <Text type="secondary" className="text-xs">Giá CW ≈ Intrinsic Value + Time Value</Text>
                    </div>
                  </Col>
                  <Col xs={24} sm={12} lg={6}>
                    <div className="bg-[#F5F4EF] rounded-lg p-4 h-full">
                      <Text className="text-xs text-gray-500 block mb-1">Phí & Thuế</Text>
                      <Text strong className="font-mono text-sm block mb-2">{DEFAULT_BUY_FEE_PERCENT}% + {DEFAULT_SELL_FEE_PERCENT}% + {DEFAULT_SELL_TAX_PERCENT}%</Text>
                      <Text type="secondary" className="text-xs">Phí mua + Phí bán + Thuế bán</Text>
                    </div>
                  </Col>
                </Row>
              </Card>

              {/* Usage Guide */}
              <Card 
                title={
                  <div className="flex items-center gap-2">
                    <InfoCircleOutlined className="text-[#CC785C]" />
                    <span>Hướng dẫn sử dụng Warrant Screener</span>
                  </div>
                }
                className="mb-6"
                styles={{ body: { padding: 24 } }}
              >
                <Row gutter={[24, 16]}>
                  <Col xs={24} md={6}>
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#CC785C] text-white flex items-center justify-center font-medium shrink-0 text-sm">1</div>
                      <div>
                        <Text strong className="block">Chọn cổ phiếu mẹ</Text>
                        <Text type="secondary" className="text-sm">Chọn mã cổ phiếu bạn muốn xem các CW liên quan</Text>
                      </div>
                    </div>
                  </Col>
                  <Col xs={24} md={6}>
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#CC785C] text-white flex items-center justify-center font-medium shrink-0 text-sm">2</div>
                      <div>
                        <Text strong className="block">Nhập giá kỳ vọng</Text>
                        <Text type="secondary" className="text-sm">Dự đoán giá CP mẹ sẽ đạt để tính lợi nhuận CW</Text>
                      </div>
                    </div>
                  </Col>
                  <Col xs={24} md={6}>
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#CC785C] text-white flex items-center justify-center font-medium shrink-0 text-sm">3</div>
                      <div>
                        <Text strong className="block">So sánh Break-even</Text>
                        <Text type="secondary" className="text-sm">Chọn CW có Break-even thấp nhất và còn thời gian đáo hạn</Text>
                      </div>
                    </div>
                  </Col>
                  <Col xs={24} md={6}>
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#CC785C] text-white flex items-center justify-center font-medium shrink-0 text-sm">4</div>
                      <div>
                        <Text strong className="block">Phân tích chi tiết</Text>
                        <Text type="secondary" className="text-sm">Click vào mã CW để xem phân tích What-if chi tiết</Text>
                      </div>
                    </div>
                  </Col>
                </Row>
              </Card>
            </>
          )}
        </div>
      </Content>
    </Layout>
  );
}
