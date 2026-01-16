"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  Layout, 
  Card, 
  Typography, 
  Select, 
  Tag,
  Empty,
  Row,
  Col,
  Divider
} from "antd";
import { 
  SearchOutlined,
  CalculatorOutlined,
  ArrowLeftOutlined,
  FireOutlined,
  LineChartOutlined
} from "@ant-design/icons";
import Link from "next/link";
import { useStockList, useWarrantsByUnderlying } from "@/hooks";

const { Content } = Layout;
const { Title, Text } = Typography;

export default function AnalysisLandingPage() {
  const router = useRouter();
  
  const { data: stockListData } = useStockList();
  const { data: warrantsData } = useWarrantsByUnderlying(null, false);

  // Build options from stocks and warrants
  const selectOptions = useMemo(() => {
    const options: Array<{value: string; label: string; type: string}> = [];
    
    // Add stocks
    if (stockListData?.stocks) {
      stockListData.stocks.forEach(s => {
        options.push({
          value: s.symbol,
          label: s.name,
          type: "stock"
        });
      });
    }
    
    // Add warrants
    if (warrantsData?.warrants) {
      warrantsData.warrants.forEach(w => {
        options.push({
          value: w.symbol,
          label: w.underlying_symbol,
          type: "warrant"
        });
      });
    }
    
    return options;
  }, [stockListData, warrantsData]);

  const handleSelect = (value: string) => {
    router.push(`/analysis/${value}`);
  };

  return (
    <Layout className="min-h-screen bg-gradient-soft">
      {/* Header */}
      <div className="bg-[#191919] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2 text-white hover:text-[#CC785C] transition-colors">
                <ArrowLeftOutlined />
              </Link>
              <div className="w-7 h-7 rounded bg-[#CC785C] flex items-center justify-center mr-1">
                <CalculatorOutlined className="text-white text-sm" />
              </div>
              <Title level={4} className="!mb-0 !text-white">What-if Calculator</Title>
            </div>
          </div>
        </div>
      </div>

      <Content className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl mx-auto">
            {/* Main Selection Card */}
            <Card className="border-0 shadow-card mt-12">
              <div className="text-center mb-8">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#CC785C] to-[#b5654a] flex items-center justify-center">
                  <CalculatorOutlined className="text-white text-3xl" />
                </div>
                <Title level={2} className="!mb-2">Mô phỏng lợi nhuận What-if</Title>
                <Text type="secondary" className="text-lg">
                  Tính toán và phân tích lợi nhuận cho cổ phiếu và chứng quyền
                </Text>
              </div>

              <Divider />

              {/* Search & Select */}
              <div className="mb-6">
                <Text strong className="block mb-3">Chọn mã cổ phiếu hoặc chứng quyền</Text>
                <Select
                  showSearch
                  placeholder="Tìm kiếm mã..."
                  value={null}
                  onChange={handleSelect}
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
                  className="w-full"
                  size="large"
                  suffixIcon={<SearchOutlined />}
                  filterOption={(input, option: any) => {
                    const search = input.toUpperCase();
                    return (
                      option?.value?.toUpperCase().includes(search) ||
                      option?.searchText?.includes(input.toLowerCase())
                    );
                  }}
                />
              </div>

              {/* Quick access suggestions */}
              <div className="mt-6">
                <Text type="secondary" className="block mb-3">Gợi ý phổ biến</Text>
                <Row gutter={[12, 12]}>
                  {['VNM', 'HPG', 'VCB', 'ACB', 'FPT', 'VIC'].map(symbol => (
                    <Col key={symbol} xs={8} sm={6} md={4}>
                      <Card
                        hoverable
                        size="small"
                        className="text-center"
                        onClick={() => handleSelect(symbol)}
                      >
                        <div className="font-semibold text-[#191919]">{symbol}</div>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </div>
            </Card>

            {/* Feature Cards */}
            <div className="mt-8">
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <Card size="small" className="h-full">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                        <LineChartOutlined className="text-blue-500" />
                      </div>
                      <div>
                        <Text strong className="block mb-1">Cổ phiếu</Text>
                        <Text type="secondary" className="text-sm">
                          Mô phỏng lợi nhuận với nhiều kịch bản giá bán khác nhau
                        </Text>
                      </div>
                    </div>
                  </Card>
                </Col>
                <Col xs={24} sm={12}>
                  <Card size="small" className="h-full">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                        <FireOutlined className="text-orange-500" />
                      </div>
                      <div>
                        <Text strong className="block mb-1">Chứng quyền</Text>
                        <Text type="secondary" className="text-sm">
                          Tính toán break-even và kịch bản dựa trên giá CP mẹ
                        </Text>
                      </div>
                    </div>
                  </Card>
                </Col>
              </Row>
            </div>
          </div>
        </div>
      </Content>
    </Layout>
  );
}
