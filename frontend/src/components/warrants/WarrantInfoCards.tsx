"use client";

import React from "react";
import { Row, Col, Card, Typography } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import { AppColors } from "@/utils/theme";
import type { FeeSettings } from "@/stores/useWarrantStore";

const { Text } = Typography;

interface WarrantInfoCardsProps {
  feeSettings: FeeSettings;
}

export const WarrantFormulaCards = React.memo(function WarrantFormulaCards({ feeSettings }: WarrantInfoCardsProps) {
  return (
    <Card className="mt-6 border border-gray-200 dark:border-gray-700" styles={{ body: { padding: 24 } }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <div className="bg-[var(--background)] rounded-lg p-4 h-full">
            <Text className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Lợi nhuận xanh</Text>
            <Text strong className="font-mono text-sm block mb-2">CW có lãi</Text>
            <Text type="secondary" className="text-xs">Ô lợi nhuận được tô màu xanh</Text>
          </div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <div className="bg-[var(--background)] rounded-lg p-4 h-full">
            <Text className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Tag Sắp hết</Text>
            <Text strong className="font-mono text-sm block mb-2">Sắp đáo hạn</Text>
            <Text type="secondary" className="text-xs">Còn lại ≤ 14 ngày</Text>
          </div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <div className="bg-[var(--background)] rounded-lg p-4 h-full">
            <Text className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Công thức lợi nhuận</Text>
            <Text strong className="font-mono text-sm block mb-2">(Giá KV - Giá TH) / TL + TV</Text>
            <Text type="secondary" className="text-xs">Giá CW ≈ Intrinsic Value + Time Value</Text>
          </div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <div className="bg-[var(--background)] rounded-lg p-4 h-full">
            <Text className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Phí & Thuế</Text>
            <Text strong className="font-mono text-sm block mb-2">{feeSettings.buyFeePercent}% + {feeSettings.sellFeePercent}% + {feeSettings.sellTaxPercent}%</Text>
            <Text type="secondary" className="text-xs">Phí mua + Phí bán + Thuế bán</Text>
          </div>
        </Col>
      </Row>
    </Card>
  );
});

export const WarrantUsageGuide = React.memo(function WarrantUsageGuide() {
  const steps = [
    { title: "Chọn cổ phiếu mẹ", desc: "Chọn mã cổ phiếu bạn muốn xem các CW liên quan" },
    { title: "Nhập giá kỳ vọng", desc: "Dự đoán giá CP mẹ sẽ đạt để tính lợi nhuận CW" },
    { title: "So sánh Break-even", desc: "Chọn CW có Break-even thấp nhất và còn thời gian đáo hạn" },
    { title: "Phân tích chi tiết", desc: "Click vào mã CW để xem phân tích What-if chi tiết" },
  ];

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <InfoCircleOutlined style={{ color: AppColors.primary }} />
          <span>Hướng dẫn sử dụng Warrant Screener</span>
        </div>
      }
      className="mt-6 border border-gray-200 dark:border-gray-700"
      styles={{ body: { padding: 24 } }}
    >
      <Row gutter={[24, 16]}>
        {steps.map((step, index) => (
          <Col key={index} xs={24} md={6}>
            <div className="flex gap-3">
              <div
                className="w-8 h-8 rounded-full text-white flex items-center justify-center font-medium shrink-0 text-sm"
                style={{ backgroundColor: AppColors.primary }}
              >
                {index + 1}
              </div>
              <div>
                <Text strong className="block">{step.title}</Text>
                <Text type="secondary" className="text-sm">{step.desc}</Text>
              </div>
            </div>
          </Col>
        ))}
      </Row>
    </Card>
  );
});
