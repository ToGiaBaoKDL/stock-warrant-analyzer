"use client";

import React from "react";
import { Row, Col, Card, Typography, Tag, Tooltip } from "antd";
import { formatVND, isNearExpiration } from "@/utils";
import type { WarrantTableRow } from "@/hooks";

const { Text } = Typography;

interface WarrantStatsProps {
  tableData: WarrantTableRow[];
  bestBreakEvenWarrant: WarrantTableRow | null;
}

export const WarrantStats = React.memo(function WarrantStats({ tableData, bestBreakEvenWarrant }: WarrantStatsProps) {
  const profitableCount = tableData.filter(w => w.isProfitable).length;
  const nearExpiryCount = tableData.filter(w => isNearExpiration(w.days_to_maturity)).length;

  return (
    <Row gutter={[16, 16]} className="mb-4">
      <Col xs={12} sm={6}>
        <Card className="shadow-sm border-0" styles={{ body: { padding: 16 } }}>
          <div className="text-center">
            <Text className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Tổng số CW</Text>
            <span className="text-2xl font-semibold">{tableData.length}</span>
          </div>
        </Card>
      </Col>
      <Col xs={12} sm={6}>
        <Card className="shadow-sm border-0 bg-green-50 dark:bg-green-900/10" styles={{ body: { padding: 16 } }}>
          <div className="text-center">
            <Text className="text-xs text-gray-500 dark:text-gray-400 block mb-1">CW có lãi</Text>
            <span className="text-2xl font-semibold text-green-600 dark:text-green-400">
              {profitableCount}
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400">/{tableData.length}</span>
            </span>
          </div>
        </Card>
      </Col>
      <Col xs={12} sm={6}>
        <Card className="shadow-sm border-0 bg-orange-50 dark:bg-orange-900/10" styles={{ body: { padding: 16 } }}>
          <div className="text-center">
            <Text className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Sắp đáo hạn (&lt;14 ngày)</Text>
            <span className="text-2xl font-semibold text-orange-600 dark:text-orange-400">
              {nearExpiryCount}
            </span>
          </div>
        </Card>
      </Col>
      <Col xs={12} sm={6}>
        <Tooltip title={bestBreakEvenWarrant ? `CW ${bestBreakEvenWarrant.symbol}` : undefined}>
          <Card className="shadow-sm border-0 bg-blue-50 dark:bg-blue-900/10" styles={{ body: { padding: 16 } }}>
            <div className="text-center">
              <Text className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                Break-even thấp nhất{" "}
                {bestBreakEvenWarrant && (
                  <Tag color="blue" className="ml-1 text-xs">{bestBreakEvenWarrant.symbol}</Tag>
                )}
              </Text>
              <span className="text-xl font-semibold text-blue-600 dark:text-blue-400">
                {formatVND(bestBreakEvenWarrant?.breakEven || 0)}
              </span>
            </div>
          </Card>
        </Tooltip>
      </Col>
    </Row>
  );
});
