"use client";

import {
  Select,
  InputNumber,
  Button,
  Segmented,
} from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { formatVND, formatPercent } from "@/utils";
import { ExportButtons, FeeSettingsButton } from "@/components";
import type { ProfitFilter, SortOption, WarrantTableRow } from "@/hooks";
import type { UnderlyingInfo } from "@/types/api";

interface UnderlyingOption {
  value: string;
  searchText: string;
  label: React.ReactNode;
}

interface WarrantFiltersProps {
  // Underlying selection
  selectedUnderlying: string | null;
  setSelectedUnderlying: (symbol: string | null) => void;
  underlyingOptions: UnderlyingOption[];
  
  // Target price
  targetUnderlyingPrice: number | null;
  setTargetUnderlyingPrice: (price: number | null) => void;
  underlyingInfo?: UnderlyingInfo | null;
  
  // Quantity
  quantity: number;
  setQuantity: (qty: number) => void;
  
  // Filter & Sort
  filterProfitable: ProfitFilter;
  setFilterProfitable: (filter: ProfitFilter) => void;
  sortBy: SortOption;
  setSortBy: (sort: SortOption) => void;
  
  // Actions
  isFetching: boolean;
  refetch: () => void;
  
  // Export
  tableData: WarrantTableRow[];
  
  // Control visibility of filter/sort
  showFilters: boolean;
}

export function WarrantFilters({
  selectedUnderlying,
  setSelectedUnderlying,
  underlyingOptions,
  targetUnderlyingPrice,
  setTargetUnderlyingPrice,
  underlyingInfo,
  quantity,
  setQuantity,
  filterProfitable,
  setFilterProfitable,
  sortBy,
  setSortBy,
  isFetching,
  refetch,
  tableData,
  showFilters,
}: WarrantFiltersProps) {
  return (
    <div className="!bg-white dark:!bg-[#1f1f1f] p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6 sticky top-16 z-10">
      <div className="flex flex-col gap-4">
        {/* Top Row: Inputs & Actions */}
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-end">
          {/* Inputs Group */}
          <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto flex-1">
            <div className="w-full sm:w-80">
              <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
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
              <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                Giá kỳ vọng
              </div>
              <InputNumber
                size="large"
                placeholder={underlyingInfo ? `${formatVND(underlyingInfo.current_price)}` : "Nhập giá..."}
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
              <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
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
            {underlyingInfo && (
              <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 flex flex-col items-end mr-2">
                <span className="text-[10px] text-gray-400 font-medium uppercase">Hiện tại</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-800 dark:text-gray-100">{formatVND(underlyingInfo.current_price)}</span>
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${(underlyingInfo.change ?? 0) >= 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    }`}>
                    {(underlyingInfo.change_percent ?? 0) > 0 ? "+" : ""}{formatPercent(underlyingInfo.change_percent ?? 0)}
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

        {showFilters && (
          <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">Bộ lọc:</span>
              <Segmented
                size="middle"
                options={[
                  { value: "all", label: "Tất cả" },
                  { value: "profitable", label: "Có lãi" },
                  { value: "unprofitable", label: "Lỗ" },
                ]}
                value={filterProfitable}
                onChange={(value) => setFilterProfitable(value as ProfitFilter)}
              />
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">Sắp xếp:</span>
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
  );
}
