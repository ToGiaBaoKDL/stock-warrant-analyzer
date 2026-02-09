"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Layout,
  Card,
  Table,
  Typography,
  Tag,
  Space,
  Spin,
  Alert,
  Tooltip,
  Button,
  Empty,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  WarningOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { useWarrantsByUnderlying, useStockList, useWarrantCalculations } from "@/hooks";
import type { WarrantTableRow, ProfitFilter, SortOption } from "@/hooks";
import { useWarrantStore } from "@/stores";
import {
  isNearExpiration,
  formatVND,
  formatPercent,
  getPriceColorHex,
  getFullPriceColorHex
} from "@/utils";
import { AppColors } from "@/utils/theme";
import {
  MainNav,
  FeeSettingsButton,
  SparklineCell,
  WarrantFilters,
  WarrantStats,
  WarrantFormulaCards,
  WarrantUsageGuide,
  ProfitBadge,
  DaysRemainingBadge,
} from "@/components";

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
      fixed: "left" as const,
      render: (symbol: string, record: WarrantTableRow) => {
        // Use 5-color system based on CW's own ceiling/floor
        const symbolColor = getFullPriceColorHex(record.current_price, record.ref_price, record.ceiling, record.floor);
        return (
          <Link href={`/analysis/${symbol}`}>
            <div className="flex flex-col gap-0.5">
              <span style={{ color: symbolColor }} className="font-semibold hover:opacity-80">{symbol}</span>
              {record.days_to_maturity >= 0 && isNearExpiration(record.days_to_maturity) && (
                <Tag color="warning" icon={<WarningOutlined />} className="text-[10px] px-1 py-0 leading-tight w-fit">
                  Sắp hết
                </Tag>
              )}
            </div>
          </Link>
        );
      },
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
      render: (price: number, record: WarrantTableRow) => {
        const priceColor = getFullPriceColorHex(price, record.ref_price, record.ceiling, record.floor);
        return (
          <span className="font-semibold font-mono" style={{ color: priceColor }}>{formatVND(price)}</span>
        );
      },
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
        <span className="text-slate-600 dark:text-slate-400">
          {volume >= 1000000
            ? `${(volume / 1000000).toFixed(1)}M`
            : volume >= 1000
              ? `${(volume / 1000).toFixed(0)}K`
              : volume.toLocaleString()}
        </span>
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
      render: (changePercent: number, record: WarrantTableRow) => {
        const color = getPriceColorHex(changePercent);
        const absChange = record.change || 0;
        return (
          <div className="flex flex-col items-end leading-tight">
            <span style={{ color }}>
              {absChange >= 0 ? "+" : ""}{absChange.toLocaleString()}
            </span>
            <span style={{ color }} className="text-xs">
              {changePercent >= 0 ? "+" : ""}{changePercent.toFixed(2)}%
            </span>
          </div>
        );
      },
    },
    {
      title: "Trend",
      dataIndex: "symbol",
      key: "trend",
      width: 90,
      align: "center" as const,
      render: (symbol: string, record: WarrantTableRow) => (
        <SparklineCell symbol={symbol} priceChange={record.change_percent} width={80} height={24} />
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
        <Tooltip title="Giá hòa vốn = (Giá CW × Tỷ lệ CĐ) + Giá TH. Đây là giá CP mẹ cần đạt để không lỗ khi exercise CW đến đáo hạn">
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
        <Tooltip title={`Lợi nhuận exercise với ${quantity.toLocaleString()} CW = max(0, (Giá KV − Giá TH) / Tỷ lệ) × SL − Chi phí mua. Nếu Giá KV ≤ Giá TH → CW hết giá trị, lỗ toàn bộ vốn`}>
          <span>Lợi nhuận <InfoCircleOutlined className="text-gray-400" /></span>
        </Tooltip>
      ),
      dataIndex: "estimatedProfit",
      key: "estimatedProfit",
      width: 140,
      align: "right",
      render: (profit: number) => (
        <div className={`px-2 py-1 rounded border font-bold ${profit >= 0 ? "bg-emerald-50 border-emerald-300 dark:bg-emerald-900/40 dark:border-emerald-700" : "bg-rose-50 border-rose-300 dark:bg-rose-900/40 dark:border-rose-700"}`}>
          <span className={`font-bold ${profit >= 0 ? "text-emerald-800 dark:text-emerald-300" : "text-rose-800 dark:text-rose-300"}`}>
            {profit >= 0 ? "+" : ""}{formatVND(profit)}
          </span>
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
      render: (percent: number) => {
        const isProfit = percent >= 0;
        return <ProfitBadge value={percent} isProfit={isProfit} />;
      },
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
            <CheckCircleOutlined className="text-emerald-600 dark:text-emerald-400" />
          ) : (
            <WarningOutlined className="text-rose-600 dark:text-rose-400" />
          )}
          <span className={`font-bold ${record.isProfitable ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}>
            {formatPercent(percent)}
          </span>
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
      width: 130,
      sorter: (a, b) => a.days_to_maturity - b.days_to_maturity,
      render: (date: string, record: WarrantTableRow) => {
        const hasValidExpiry = record.days_to_maturity >= 0;
        if (!hasValidExpiry) {
          return (
            <Tooltip title="Chưa có dữ liệu từ SSI">
              <span className="text-gray-400">N/A</span>
            </Tooltip>
          );
        }
        const days = record.days_to_maturity;
        return (
          <div className="flex flex-col gap-1">
            <Text className="text-xs">{new Date(date).toLocaleDateString("vi-VN")}</Text>
            <DaysRemainingBadge days={days} />
          </div>
        );
      },
    },
  ];

  // Show full loading screen when initial load or changing underlying
  const isInitialLoading = warrantsLoading && selectedUnderlying;
  const showFilters = !!(selectedUnderlying && warrantsData && warrantsData.warrants.length > 0 && !isInitialLoading);

  return (
    <Layout className="min-h-screen" style={{ background: 'var(--background)' }}>
      <MainNav>
        <FeeSettingsButton />
      </MainNav>

      <Content className="p-6 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Filter Toolbar */}
          <WarrantFilters
            selectedUnderlying={selectedUnderlying}
            setSelectedUnderlying={setSelectedUnderlying}
            underlyingOptions={underlyingOptions}
            targetUnderlyingPrice={targetUnderlyingPrice}
            setTargetUnderlyingPrice={setTargetUnderlyingPrice}
            underlyingInfo={warrantsData?.underlying}
            quantity={quantity}
            setQuantity={setQuantity}
            filterProfitable={filterProfitable}
            setFilterProfitable={setFilterProfitable}
            sortBy={sortBy}
            setSortBy={setSortBy}
            isFetching={isFetching}
            refetch={refetch}
            tableData={tableData}
            showFilters={showFilters}
          />

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
                  style={{ backgroundColor: AppColors.primary, borderColor: AppColors.primary, color: 'white' }}
                  className="hover:!opacity-90"
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
              {/* Stats Cards */}
              <WarrantStats tableData={tableData} bestBreakEvenWarrant={bestBreakEvenWarrant} />

              {/* Main Table */}
              <Card className="shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700">
                <div className="relative">
                  <Table
                    columns={columns}
                    dataSource={tableData}
                    rowKey="symbol"
                    showSorterTooltip={false}
                    scroll={{ x: 1200, y: 500 }}
                    pagination={{
                      pageSize: 15,
                      showSizeChanger: true,
                      pageSizeOptions: ["10", "15", "25", "50"],
                      showTotal: (total) => `Tổng ${total} chứng quyền`
                    }}
                    rowClassName={() => "hover:bg-slate-50 dark:hover:bg-[#2a2a2a]"}
                    size="middle"
                  />
                </div>
              </Card>

              {/* Formula Info Cards */}
              <WarrantFormulaCards feeSettings={feeSettings} />

              {/* Usage Guide */}
              <WarrantUsageGuide />
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
      <Layout className="min-h-screen" style={{ background: 'var(--background)' }}>
        <MainNav />
        <Content className="p-4 lg:p-6">
          <div className="max-w-7xl mx-auto">
            <Card className="animate-pulse">
              <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
            </Card>
          </div>
        </Content>
      </Layout>
    }>
      <WarrantsPageContent />
    </Suspense>
  );
}
