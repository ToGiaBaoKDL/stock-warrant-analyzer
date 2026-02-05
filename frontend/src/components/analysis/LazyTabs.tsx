"use client";

import dynamic from "next/dynamic";
import { Spin } from "antd";

// Lazy load heavy analysis tab components with loading fallback
export const CompanyProfileTab = dynamic(
  () => import("./CompanyProfileTab").then((mod) => ({ default: mod.CompanyProfileTab })),
  {
    loading: () => (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    ),
    ssr: false,
  }
);

export const PriceInfoTab = dynamic(
  () => import("./PriceInfoTab").then((mod) => ({ default: mod.PriceInfoTab })),
  {
    loading: () => (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    ),
    ssr: false,
  }
);

export const StockChartTab = dynamic(
  () => import("./StockChartTab").then((mod) => ({ default: mod.StockChartTab })),
  {
    loading: () => (
      <div className="flex justify-center items-center h-96">
        <Spin size="large" />
      </div>
    ),
    ssr: false,
  }
);

export const ShareholdersTab = dynamic(
  () => import("./ShareholdersTab").then((mod) => ({ default: mod.ShareholdersTab })),
  {
    loading: () => (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    ),
    ssr: false,
  }
);

export const LeadershipTab = dynamic(
  () => import("./LeadershipTab").then((mod) => ({ default: mod.LeadershipTab })),
  {
    loading: () => (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    ),
    ssr: false,
  }
);

export const CapDividendTab = dynamic(
  () => import("./CapDividendTab").then((mod) => ({ default: mod.CapDividendTab })),
  {
    loading: () => (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    ),
    ssr: false,
  }
);

export const SubsidiariesTab = dynamic(
  () => import("./SubsidiariesTab").then((mod) => ({ default: mod.SubsidiariesTab })),
  {
    loading: () => (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    ),
    ssr: false,
  }
);
