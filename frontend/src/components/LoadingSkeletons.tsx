"use client";

import { Skeleton, Card, Row, Col, Space } from "antd";

/**
 * Loading skeleton for price cards
 */
export function PriceCardSkeleton() {
  return (
    <Card className="border-0 shadow-card h-full">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <Skeleton.Input active size="small" style={{ width: 80 }} />
          <div className="mt-3">
            <Skeleton.Input active size="large" style={{ width: 120 }} />
          </div>
        </div>
        <Skeleton.Avatar active size={48} shape="square" />
      </div>
    </Card>
  );
}

/**
 * Loading skeleton for stock detail page
 */
export function StockDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Price cards */}
      <Row gutter={[16, 16]}>
        {[1, 2, 3, 4].map((i) => (
          <Col key={i} xs={24} sm={12} lg={6}>
            <PriceCardSkeleton />
          </Col>
        ))}
      </Row>
      
      {/* Trading info card */}
      <Card className="border-0 shadow-card">
        <Skeleton.Input active size="small" style={{ width: 150, marginBottom: 16 }} />
        <Row gutter={[24, 24]}>
          {[1, 2, 3, 4].map((i) => (
            <Col key={i} xs={12} sm={6}>
              <div className="text-center p-4 rounded-xl bg-gray-50">
                <Skeleton.Input active size="small" style={{ width: 60 }} />
                <div className="mt-2">
                  <Skeleton.Input active style={{ width: 80 }} />
                </div>
              </div>
            </Col>
          ))}
        </Row>
      </Card>
      
      {/* Calculator section */}
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          <Card className="border-0 shadow-card">
            <Skeleton active paragraph={{ rows: 3 }} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card className="border-0 shadow-card">
            <Skeleton active paragraph={{ rows: 3 }} />
          </Card>
        </Col>
      </Row>
    </div>
  );
}

/**
 * Loading skeleton for warrant table
 */
export function WarrantTableSkeleton() {
  return (
    <Card className="border-0 shadow-card">
      <div className="flex flex-col gap-6 w-full">
        {/* Table header */}
        <div className="flex gap-4">
          {[150, 80, 100, 80, 100, 120, 140, 120].map((w, i) => (
            <Skeleton.Input key={i} active size="small" style={{ width: w }} />
          ))}
        </div>
        
        {/* Table rows */}
        {[1, 2, 3, 4, 5].map((row) => (
          <div key={row} className="flex gap-4 py-3 border-b border-gray-100">
            {[150, 80, 100, 80, 100, 120, 140, 120].map((w, i) => (
              <Skeleton.Input key={i} active size="small" style={{ width: w }} />
            ))}
          </div>
        ))}
      </div>
    </Card>
  );
}

/**
 * Loading skeleton for summary stats
 */
export function StatsSkeleton() {
  return (
    <Row gutter={[16, 16]}>
      {[1, 2, 3, 4].map((i) => (
        <Col key={i} xs={12} md={6}>
          <Card size="small" className="text-center">
            <Skeleton.Input active size="small" style={{ width: 60, marginBottom: 8 }} />
            <br />
            <Skeleton.Input active size="large" style={{ width: 80 }} />
          </Card>
        </Col>
      ))}
    </Row>
  );
}

/**
 * Loading skeleton for calculator form
 */
export function CalculatorFormSkeleton() {
  return (
    <Card className="border-0 shadow-card">
      <Skeleton.Input active size="small" style={{ width: 150, marginBottom: 16 }} />
      <Row gutter={[24, 16]}>
        {[1, 2, 3].map((i) => (
          <Col key={i} xs={24} sm={12} lg={6}>
            <Skeleton.Input active size="small" style={{ width: 80, marginBottom: 8 }} />
            <br />
            <Skeleton.Input active size="large" style={{ width: "100%" }} />
          </Col>
        ))}
        <Col xs={24} sm={12} lg={6}>
          <div className="p-4 rounded-xl bg-gray-50 text-center">
            <Skeleton.Input active size="small" style={{ width: 80 }} />
            <div className="mt-2">
              <Skeleton.Input active size="large" style={{ width: 120 }} />
            </div>
          </div>
        </Col>
      </Row>
    </Card>
  );
}

/**
 * Full page loading skeleton
 */
export function PageLoadingSkeleton({ title }: { title?: string }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header skeleton */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Skeleton.Avatar active size={32} />
              <Skeleton.Input active style={{ width: 150 }} />
            </div>
            <Skeleton.Button active />
          </div>
        </div>
      </div>
      
      {/* Content skeleton */}
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {title && (
          <Skeleton.Input active size="large" style={{ width: 200, marginBottom: 24 }} />
        )}
        <StockDetailSkeleton />
      </div>
    </div>
  );
}

export default {
  PriceCardSkeleton,
  StockDetailSkeleton,
  WarrantTableSkeleton,
  StatsSkeleton,
  CalculatorFormSkeleton,
  PageLoadingSkeleton,
};
