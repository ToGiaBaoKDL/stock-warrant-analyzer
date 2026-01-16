"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Layout, Typography, Card, Row, Col, Input, Skeleton, Tabs, Table, Space, Tag, Button, Select, Tooltip } from "antd";
import { 
  StockOutlined, 
  SearchOutlined,
  ReloadOutlined
} from "@ant-design/icons";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiClient, endpoints } from "@/lib/api-client";
import { queryKeys, pollingIntervals } from "@/lib/query-client";
import type { StockItem, StockListResponse, WarrantListResponse, WarrantItem, ExchangeSummary } from "@/types/api";
import { formatVND, formatPercent, formatVolume } from "@/utils";

const { Content, Footer } = Layout;
const { Title, Text } = Typography;

// Price change color
const getPriceColor = (change: number) => {
  if (change > 0) return "text-green-600";
  if (change < 0) return "text-red-600";
  return "text-yellow-600";
};

// Exchange tab component
const ExchangeTab = ({ exchange, label }: { exchange: string; label: string }) => {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['stocks', exchange],
    queryFn: async () => {
      const response = await apiClient.get<StockListResponse>(
        endpoints.stocks.byExchange(exchange.toLowerCase())
      );
      return response.data;
    },
    refetchInterval: pollingIntervals.marketData,
    staleTime: 30000,
  });

  const filteredStocks = useMemo(() => {
    if (!data?.stocks) return [];
    let stocks = [...data.stocks];
    
    // Filter by search
    if (search) {
      const searchUpper = search.toUpperCase();
      stocks = stocks.filter(s => 
        s.symbol.includes(searchUpper) || 
        s.name.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    // Sort
    if (sortField) {
      stocks.sort((a, b) => {
        const aVal = a[sortField as keyof StockItem] as number;
        const bVal = b[sortField as keyof StockItem] as number;
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      });
    }
    
    return stocks;
  }, [data?.stocks, search, sortField, sortOrder]);

  const columns = [
    {
      title: 'Mã',
      dataIndex: 'symbol',
      key: 'symbol',
      width: 80,
      fixed: 'left' as const,
      render: (symbol: string) => (
        <Link href={`/analysis/${symbol}`} className="font-semibold text-[#191919] hover:text-[#CC785C]">
          {symbol}
        </Link>
      ),
    },
    {
      title: 'Tên',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
      width: 200,
    },
    {
      title: 'Giá',
      dataIndex: 'current_price',
      key: 'current_price',
      width: 100,
      align: 'right' as const,
      render: (price: number, record: StockItem) => (
        <span className={getPriceColor(record.change)}>
          {formatVND(price)}
        </span>
      ),
    },
    {
      title: '+/-',
      dataIndex: 'change_percent',
      key: 'change_percent',
      width: 80,
      align: 'right' as const,
      sorter: true,
      render: (percent: number) => (
        <span className={getPriceColor(percent)}>
          {percent > 0 ? '+' : ''}{percent.toFixed(2)}%
        </span>
      ),
    },
    {
      title: 'KL',
      dataIndex: 'volume',
      key: 'volume',
      width: 90,
      align: 'right' as const,
      sorter: true,
      render: (vol: number) => formatVolume(vol),
    },
    {
      title: 'Tham chiếu',
      dataIndex: 'ref_price',
      key: 'ref_price',
      width: 90,
      align: 'right' as const,
      render: (price: number) => formatVND(price),
    },
    {
      title: 'Trần',
      dataIndex: 'ceiling',
      key: 'ceiling',
      width: 90,
      align: 'right' as const,
      render: (price: number) => <span className="text-purple-600">{formatVND(price)}</span>,
    },
    {
      title: 'Sàn',
      dataIndex: 'floor',
      key: 'floor',
      width: 90,
      align: 'right' as const,
      render: (price: number) => <span className="text-cyan-600">{formatVND(price)}</span>,
    },
    {
      title: 'NN Mua',
      dataIndex: 'foreign_buy_vol',
      key: 'foreign_buy_vol',
      width: 90,
      align: 'right' as const,
      render: (vol: number) => formatVolume(vol),
    },
    {
      title: 'NN Bán',
      dataIndex: 'foreign_sell_vol',
      key: 'foreign_sell_vol',
      width: 90,
      align: 'right' as const,
      render: (vol: number) => formatVolume(vol),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <Input
          placeholder="Tìm mã hoặc tên..."
          prefix={<SearchOutlined className="text-gray-400" />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 200 }}
          allowClear
        />
        <Select
          placeholder="Sắp xếp"
          style={{ width: 140 }}
          allowClear
          value={sortField}
          onChange={(value) => setSortField(value)}
          options={[
            { value: 'volume', label: 'Khối lượng' },
            { value: 'change_percent', label: '% Thay đổi' },
            { value: 'value', label: 'Giá trị' },
          ]}
        />
        <Button
          icon={<ReloadOutlined spin={isFetching} />}
          onClick={() => refetch()}
        >
          Làm mới
        </Button>
        <Text type="secondary">
          {filteredStocks.length} / {data?.total || 0} mã
        </Text>
      </div>
      
      {/* Table */}
      <Table
        columns={columns}
        dataSource={filteredStocks}
        rowKey="symbol"
        loading={isLoading}
        size="small"
        scroll={{ x: 1000, y: 500 }}
        pagination={{
          pageSize: 50,
          showSizeChanger: true,
          pageSizeOptions: ['20', '50', '100'],
          showTotal: (total) => `${total} mã`,
        }}
        onChange={(_, __, sorter) => {
          if (!Array.isArray(sorter) && sorter.field) {
            setSortField(sorter.field as string);
            setSortOrder(sorter.order === 'ascend' ? 'asc' : 'desc');
          }
        }}
      />
    </div>
  );
};

// Warrant tab component
const WarrantTab = () => {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [underlyingFilter, setUnderlyingFilter] = useState<string | null>(null);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['warrants'],
    queryFn: async () => {
      const response = await apiClient.get<WarrantListResponse>(
        endpoints.warrants.list()
      );
      return response.data;
    },
    refetchInterval: pollingIntervals.marketData,
    staleTime: 30000,
  });

  const underlyingOptions = useMemo(() => {
    if (!data?.underlying) return [];
    return Object.keys(data.underlying).map(symbol => ({
      value: symbol,
      label: symbol,
    }));
  }, [data?.underlying]);

  const filteredWarrants = useMemo(() => {
    if (!data?.warrants) return [];
    let warrants = [...data.warrants];
    
    // Filter by search
    if (search) {
      const searchUpper = search.toUpperCase();
      warrants = warrants.filter(w => 
        w.symbol.includes(searchUpper) || 
        w.underlying_symbol.includes(searchUpper)
      );
    }
    
    // Filter by underlying
    if (underlyingFilter) {
      warrants = warrants.filter(w => w.underlying_symbol === underlyingFilter);
    }
    
    // Sort
    if (sortField) {
      warrants.sort((a, b) => {
        const aVal = a[sortField as keyof WarrantItem] as number;
        const bVal = b[sortField as keyof WarrantItem] as number;
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      });
    }
    
    return warrants;
  }, [data?.warrants, search, underlyingFilter, sortField, sortOrder]);

  const columns = [
    {
      title: 'Mã CW',
      dataIndex: 'symbol',
      key: 'symbol',
      width: 100,
      fixed: 'left' as const,
      render: (symbol: string) => (
        <Link href={`/warrant/${symbol}`} className="font-semibold text-[#191919] hover:text-[#CC785C]">
          {symbol}
        </Link>
      ),
    },
    {
      title: 'CP Mẹ',
      dataIndex: 'underlying_symbol',
      key: 'underlying_symbol',
      width: 80,
      render: (symbol: string) => (
        <Link href={`/analysis/${symbol}`} className="text-blue-600 hover:underline">
          {symbol}
        </Link>
      ),
    },
    {
      title: 'TCPH',
      dataIndex: 'issuer_name',
      key: 'issuer_name',
      width: 80,
      ellipsis: true,
    },
    {
      title: 'Giá CW',
      dataIndex: 'current_price',
      key: 'current_price',
      width: 80,
      align: 'right' as const,
      render: (price: number, record: WarrantItem) => (
        <span className={getPriceColor(record.change)}>
          {formatVND(price)}
        </span>
      ),
    },
    {
      title: '+/-',
      dataIndex: 'change_percent',
      key: 'change_percent',
      width: 70,
      align: 'right' as const,
      sorter: true,
      render: (percent: number) => (
        <span className={getPriceColor(percent)}>
          {percent > 0 ? '+' : ''}{percent.toFixed(2)}%
        </span>
      ),
    },
    {
      title: 'KL',
      dataIndex: 'volume',
      key: 'volume',
      width: 80,
      align: 'right' as const,
      sorter: true,
      render: (vol: number) => formatVolume(vol),
    },
    {
      title: 'Giá TH',
      dataIndex: 'exercise_price',
      key: 'exercise_price',
      width: 80,
      align: 'right' as const,
      render: (price: number) => formatVND(price),
    },
    {
      title: 'Tỷ lệ',
      dataIndex: 'exercise_ratio',
      key: 'exercise_ratio',
      width: 70,
      align: 'right' as const,
      render: (ratio: number) => ratio.toFixed(2),
    },
    {
      title: 'Ngày ĐH',
      dataIndex: 'maturity_date',
      key: 'maturity_date',
      width: 100,
    },
    {
      title: 'Còn lại',
      dataIndex: 'days_to_maturity',
      key: 'days_to_maturity',
      width: 80,
      align: 'right' as const,
      sorter: true,
      render: (days: number) => (
        <Tag color={days <= 30 ? 'red' : days <= 60 ? 'orange' : 'green'}>
          {days} ngày
        </Tag>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <Input
          placeholder="Tìm mã CW hoặc CP mẹ..."
          prefix={<SearchOutlined className="text-gray-400" />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 200 }}
          allowClear
        />
        <Select
          placeholder="Lọc theo CP mẹ"
          style={{ width: 120 }}
          allowClear
          value={underlyingFilter}
          onChange={(value) => setUnderlyingFilter(value)}
          options={underlyingOptions}
          showSearch
        />
        <Select
          placeholder="Sắp xếp"
          style={{ width: 140 }}
          allowClear
          value={sortField}
          onChange={(value) => setSortField(value)}
          options={[
            { value: 'volume', label: 'Khối lượng' },
            { value: 'change_percent', label: '% Thay đổi' },
            { value: 'days_to_maturity', label: 'Ngày còn lại' },
          ]}
        />
        <Button
          icon={<ReloadOutlined spin={isFetching} />}
          onClick={() => refetch()}
        >
          Làm mới
        </Button>
        <Button type="primary" onClick={() => router.push('/warrants')}>
          Screener chi tiết
        </Button>
        <Text type="secondary">
          {filteredWarrants.length} / {data?.total || 0} CW
        </Text>
      </div>
      
      {/* Table */}
      <Table
        columns={columns}
        dataSource={filteredWarrants}
        rowKey="symbol"
        loading={isLoading}
        size="small"
        scroll={{ x: 1000, y: 500 }}
        pagination={{
          pageSize: 50,
          showSizeChanger: true,
          pageSizeOptions: ['20', '50', '100'],
          showTotal: (total) => `${total} CW`,
        }}
        onChange={(_, __, sorter) => {
          if (!Array.isArray(sorter) && sorter.field) {
            setSortField(sorter.field as string);
            setSortOrder(sorter.order === 'ascend' ? 'asc' : 'desc');
          }
        }}
      />
    </div>
  );
};

export default function Home() {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState("");
  const [activeTab, setActiveTab] = useState("hose");

  // Fetch exchange summary
  const { data: summaryData } = useQuery({
    queryKey: ['exchange-summary'],
    queryFn: async () => {
      const response = await apiClient.get<ExchangeSummary[]>(
        endpoints.market.exchangeSummary()
      );
      return response.data;
    },
    refetchInterval: 60000,
  });

  // Fetch warrant count
  const { data: warrantData } = useQuery({
    queryKey: ['warrants-count'],
    queryFn: async () => {
      const response = await apiClient.get<WarrantListResponse>(
        endpoints.warrants.list({ limit: 1 })
      );
      return response.data;
    },
    refetchInterval: 60000,
  });

  const handleSearch = (value: string) => {
    const trimmed = value.trim().toUpperCase();
    if (!trimmed) return;
    
    // Check if it's a warrant (starts with C)
    if (trimmed.startsWith('C') && trimmed.length > 4) {
      router.push(`/warrant/${trimmed}`);
    } else {
      router.push(`/analysis/${trimmed}`);
    }
  };

  const getSummary = (exchange: string) => {
    return summaryData?.find(s => s.exchange === exchange.toUpperCase());
  };

  const tabItems = [
    {
      key: 'hose',
      label: (
        <span className="flex items-center gap-2">
          HOSE
          <Tag color="blue">{getSummary('HOSE')?.total_stocks || '...'}</Tag>
        </span>
      ),
      children: <ExchangeTab exchange="hose" label="HOSE" />,
    },
    {
      key: 'hnx',
      label: (
        <span className="flex items-center gap-2">
          HNX
          <Tag color="orange">{getSummary('HNX')?.total_stocks || '...'}</Tag>
        </span>
      ),
      children: <ExchangeTab exchange="hnx" label="HNX" />,
    },
    {
      key: 'upcom',
      label: (
        <span className="flex items-center gap-2">
          UPCOM
          <Tag color="purple">{getSummary('UPCOM')?.total_stocks || '...'}</Tag>
        </span>
      ),
      children: <ExchangeTab exchange="upcom" label="UPCOM" />,
    },
    {
      key: 'cw',
      label: (
        <span className="flex items-center gap-2">
          Chứng quyền
          <Tag color="red">{warrantData?.total || '...'}</Tag>
        </span>
      ),
      children: <WarrantTab />,
    },
  ];

  return (
    <Layout className="min-h-screen" style={{ background: '#F5F4EF' }}>
      {/* Header */}
      <header className="bg-[#191919] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#CC785C] flex items-center justify-center">
              <StockOutlined className="text-white text-sm" />
            </div>
            <span className="text-white font-medium">Stock & Warrant Analyzer</span>
          </div>
          
          {/* Search in header */}
          <div className="hidden md:block flex-1 max-w-md mx-8">
            <Input.Search
              placeholder="Nhập mã cổ phiếu hoặc CW..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onSearch={handleSearch}
              allowClear
            />
          </div>
          
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/warrants" className="text-gray-300 hover:text-white text-sm">
              CW Screener
            </Link>
            <Link href="/analysis" className="text-gray-300 hover:text-white text-sm">
              Analysis
            </Link>
          </nav>
        </div>
      </header>
      
      <Content className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Market Summary Cards */}
          <Row gutter={[16, 16]} className="mb-6">
            {['HOSE', 'HNX', 'UPCOM'].map(exchange => {
              const summary = getSummary(exchange);
              return (
                <Col key={exchange} xs={24} sm={8}>
                  <Card size="small" className="h-full">
                    <div className="flex justify-between items-center">
                      <div>
                        <Text type="secondary" className="text-xs">{exchange}</Text>
                        <div className="text-lg font-semibold">{summary?.total_stocks || '...'} mã</div>
                      </div>
                      <div className="text-right">
                        <div className="flex gap-2 text-xs">
                          <span className="text-green-600">▲ {summary?.advances || 0}</span>
                          <span className="text-yellow-600">- {summary?.unchanged || 0}</span>
                          <span className="text-red-600">▼ {summary?.declines || 0}</span>
                        </div>
                        <Text type="secondary" className="text-xs">
                          KL: {formatVolume(summary?.total_volume || 0)}
                        </Text>
                      </div>
                    </div>
                  </Card>
                </Col>
              );
            })}
          </Row>

          {/* Main Tabs */}
          <Card styles={{ body: { padding: '16px 24px' } }}>
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={tabItems}
              size="large"
            />
          </Card>
        </div>
      </Content>
      
      {/* Footer */}
      <Footer className="text-center bg-white border-t border-gray-100 py-4">
        <Text type="secondary" className="text-sm">
          Dữ liệu từ SSI iBoard API • Cập nhật realtime
        </Text>
      </Footer>
    </Layout>
  );
}
