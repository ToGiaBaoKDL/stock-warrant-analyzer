"use client";

import { useState, useMemo, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
  WarningOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  SortAscendingOutlined,
  DollarOutlined,
  NumberOutlined,
  StockOutlined
} from "@ant-design/icons";
import Link from "next/link";
import { useWarrantsByUnderlying, useStockList, useWarrantCalculations } from "@/hooks";
import type { WarrantTableRow, ProfitFilter, SortOption } from "@/hooks";
import { useWarrantStore } from "@/stores";
import {
  isNearExpiration,
  formatVND,
  formatPercent
} from "@/utils";
import type { WarrantItem } from "@/types/api";
import { ExportButtons, MainNav, FeeSettingsButton } from "@/components";
import type { ExportColumn } from "@/utils/exportUtils";

const { Content } = Layout;
const { Text } = Typography;

// Note: WarrantTableRow type is now imported from @/hooks

function WarrantsPageContent() {
  const {
    selectedUnderlying,
    setSelectedUnderlying,
    targetUnderlyingPrice,
    setTargetUnderlyingPrice,
    feeSettings
  } = useWarrantStore();

  const searchParams = useSearchParams();

  // Handle URL param for auto-selecting underlying from What-if page
  useEffect(() => {
    const underlyingParam = searchParams.get('underlying');
    if (underlyingParam && !selectedUnderlying) {
      setSelectedUnderlying(underlyingParam);
    }
  }, [searchParams, selectedUnderlying, setSelectedUnderlying]);

  const [sortBy, setSortBy] = useState<SortOption>("symbol");
  const [filterProfitable, setFilterProfitable] = useState<ProfitFilter>("all");
  const [quantity, setQuantity] = useState<number>(1000);

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

  // Use extracted hook for all warrant calculations
  const underlyingPrice = warrantsData?.underlying?.current_price || 0;
  const { tableData, bestBreakEvenWarrant } = useWarrantCalculations({
    warrants: warrantsData?.warrants,
    underlyingPrice,
    targetUnderlyingPrice,
    feeSettings,
    quantity,
    filterProfitable,
    sortBy,
  });

  // Table columns
  const columns: ColumnsType<WarrantTableRow> = [
    {
      title: "Mã CW",
      dataIndex: "symbol",
      key: "symbol",
      width: 110,
      render: (symbol: string, record: WarrantTableRow) => (
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
      width: 80,
      align: "right",
      sorter: (a, b) => a.change_percent - b.change_percent,
      render: (changePercent: number) => (
        <Text className={`font-medium ${changePercent > 0 ? "text-green-600" : changePercent < 0 ? "text-red-600" : "text-gray-500"}`}>
          {changePercent > 0 ? "+" : ""}{changePercent.toFixed(2)}%
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
      render: (breakEven: number) => (
        <Text>{formatVND(breakEven)}</Text>
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
      render: (percent: number, record: WarrantTableRow) => (
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
      render: (date: string, record: WarrantTableRow) => {
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
      <MainNav>
        <FeeSettingsButton />
      </MainNav>

      <Content className="p-6 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Filter Toolbar */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 sticky top-16 z-10">
            <div className="flex flex-col gap-4">
              {/* Top Row: Inputs & Actions */}
              <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-end">
                {/* Inputs Group */}
                <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto flex-1">
                  <div className="w-full sm:w-80">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      Cổ phiếu mẹ
                    </div>
                    <Select
                      showSearch
                      placeholder="Chọn mã..."
                      value={selectedUnderlying}
                      onChange={setSelectedUnderlying}
                      options={underlyingOptions}
                      className="w-full"
                      size="large"
                      filterOption={(input, option) =>
                        (option?.value as string)?.toUpperCase().includes(input.toUpperCase()) ?? false
                      }
                    />
                  </div>

                  <div className="w-full sm:w-22">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      Giá kỳ vọng
                    </div>
                    <InputNumber
                      size="large"
                      placeholder={warrantsData?.underlying ? `${formatVND(warrantsData.underlying.current_price)}` : "Nhập giá..."}
                      value={targetUnderlyingPrice}
                      onChange={setTargetUnderlyingPrice}
                      className="w-full"
                      min={0}
                      step={100}
                      formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                      parser={(value) => Number(value?.replace(/,/g, ""))}
                    />
                  </div>

                  <div className="w-full sm:w-40">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      Khối lượng
                    </div>
                    <InputNumber
                      size="large"
                      placeholder="Min Volume"
                      value={quantity}
                      onChange={(v) => v && setQuantity(v)}
                      className="w-full"
                      min={100}
                      step={100}
                      formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                      parser={(value) => Number(value?.replace(/,/g, ""))}
                    />
                  </div>
                </div>

                {/* Right Side: Current Price & Actions */}
                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
                  {warrantsData?.underlying && (
                    <div className="px-4 py-2 bg-gray-50 rounded-lg border border-gray-100 flex flex-col items-end mr-2">
                      <span className="text-[10px] text-gray-400 font-medium uppercase">Hiện tại</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-800">{formatVND(warrantsData.underlying.current_price)}</span>
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${(warrantsData.underlying.change ?? 0) >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                          {(warrantsData.underlying.change_percent ?? 0) > 0 ? "+" : ""}{formatPercent(warrantsData.underlying.change_percent ?? 0)}
                        </span>
                      </div>
                    </div>
                  )}

                  <Button
                    icon={<ReloadOutlined spin={isFetching} />}
                    onClick={() => refetch()}
                    size="large"
                    className="!flex items-center"
                  />

                  <ExportButtons
                    data={tableData as unknown as Record<string, unknown>[]}
                    columns={[
                      { key: "symbol", title: "Mã CW" },
                      { key: "issuer_name", title: "TCPH" },
                      { key: "current_price", title: "Giá CW" },
                      { key: "volume", title: "KL GD" },
                      { key: "exercise_price", title: "Giá TH" },
                      { key: "conversion_ratio", title: "Tỷ lệ CĐ" },
                      { key: "breakEven", title: "Break-even" },
                      { key: "days_to_maturity", title: "Ngày còn lại" },
                      { key: "estimatedProfit", title: "LN ước tính" },
                    ]}
                    filename={`warrant_screener_${selectedUnderlying || "all"}`}
                    size="large"
                  />
                </div>
              </div>

              {selectedUnderlying && warrantsData && warrantsData.warrants.length > 0 && !isInitialLoading && (
                <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row gap-4 items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-400 font-medium">Bộ lọc:</span>
                    <Segmented
                      size="middle"
                      options={[
                        { value: "all", label: "Tất cả" },
                        { value: "profitable", label: "Có lãi" },
                        { value: "unprofitable", label: "Lỗ" },
                      ]}
                      value={filterProfitable}
                      onChange={(value) => setFilterProfitable(value as typeof filterProfitable)}
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-400 font-medium">Sắp xếp:</span>
                    <Segmented
                      size="middle"
                      options={[
                        { value: "symbol", label: "Mã CW" },
                        { value: "breakEven", label: "Break-even" },
                        { value: "margin", label: "Biên LN" },
                        { value: "expiry", label: "Đáo hạn" },
                      ]}
                      value={sortBy}
                      onChange={(value) => setSortBy(value as SortOption)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

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
                    rowClassName={() => "hover:bg-slate-50"}
                    size="middle"
                  />
                </div>
              </Card>

              {/* Formula Info Cards */}
              <Card className="mb-6" styles={{ body: { padding: 24 } }}>
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12} lg={6}>
                    <div className="bg-[#F5F4EF] rounded-lg p-4 h-full">
                      <Text className="text-xs text-gray-500 block mb-1">Lợi nhuận xanh</Text>
                      <Text strong className="font-mono text-sm block mb-2">CW có lãi</Text>
                      <Text type="secondary" className="text-xs">Ô lợi nhuận được tô màu xanh</Text>
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
                      <Text strong className="font-mono text-sm block mb-2">{feeSettings.buyFeePercent}% + {feeSettings.sellFeePercent}% + {feeSettings.sellTaxPercent}%</Text>
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

// Wrapper with Suspense for useSearchParams
export default function WarrantsPage() {
  return (
    <Suspense fallback={
      <Layout className="min-h-screen" style={{ background: '#F5F4EF' }}>
        <MainNav />
        <Content className="p-4 lg:p-6">
          <div className="max-w-7xl mx-auto">
            <Card className="animate-pulse">
              <div className="h-64 bg-gray-200 rounded" />
            </Card>
          </div>
        </Content>
      </Layout>
    }>
      <WarrantsPageContent />
    </Suspense>
  );
}
