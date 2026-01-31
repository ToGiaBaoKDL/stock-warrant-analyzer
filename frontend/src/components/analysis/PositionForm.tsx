"use client";

import { InputNumber, Button, Tooltip, Divider } from "antd";
import { PlusOutlined, DeleteOutlined, CalculatorOutlined, ThunderboltOutlined } from "@ant-design/icons";
import { formatVND } from "@/utils";
import type { StockPosition } from "@/hooks";

interface PositionFormProps {
  position: StockPosition | null;
  currentPrice: number | undefined;
  isWarrant: boolean;
  onInitPosition: () => void;
  onUpdatePosition: (updates: Partial<StockPosition>) => void;
  totalCost: number;
  principal: number;
  feeSettings: {
    buyFeePercent: number;
  };
}

export function PositionForm({
  position,
  currentPrice,
  isWarrant,
  onInitPosition,
  onUpdatePosition,
  totalCost,
  principal,
  feeSettings,
}: PositionFormProps) {
  if (!position) {
    return (
      <div className="text-center py-8">
        <CalculatorOutlined className="text-4xl text-gray-300 dark:text-gray-600 mb-3" />
        <p className="text-gray-500 dark:text-gray-400 mb-4 text-sm">
          Thêm vị thế để tính toán lợi nhuận
        </p>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={onInitPosition}
          disabled={!currentPrice}
        >
          Thêm vị thế
        </Button>
      </div>
    );
  }

  const buyFee = (principal * feeSettings.buyFeePercent) / 100;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide font-medium">
            Giá mua
          </label>
          <InputNumber
            value={position.buyPrice}
            onChange={(v) => v && onUpdatePosition({ buyPrice: v })}
            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
            parser={(value) => Number(value?.replace(/,/g, ""))}
            className="w-full"
            min={0}
            step={100}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide font-medium">
            Số lượng
          </label>
          <InputNumber
            value={position.quantity}
            onChange={(v) => v && onUpdatePosition({ quantity: v })}
            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
            parser={(value) => Number(value?.replace(/,/g, ""))}
            className="w-full"
            min={isWarrant ? 100 : 1}
            step={isWarrant ? 100 : 10}
          />
        </div>
      </div>

      <Divider className="!my-3" />

      {/* Cost Breakdown */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 space-y-2 text-sm">
        <div className="flex justify-between text-gray-600 dark:text-gray-400">
          <span>Giá trị vốn:</span>
          <span>{formatVND(principal)}</span>
        </div>
        <div className="flex justify-between text-gray-600 dark:text-gray-400">
          <span>Phí mua ({feeSettings.buyFeePercent}%):</span>
          <span className="text-red-500">+{formatVND(buyFee)}</span>
        </div>
        <div className="flex justify-between font-semibold pt-2 border-t border-gray-200 dark:border-gray-700">
          <span>Tổng chi phí:</span>
          <span>{formatVND(totalCost)}</span>
        </div>
      </div>
    </div>
  );
}

interface QuickPresetsProps {
  position: StockPosition | null;
  presets: { label: string; factor: number }[];
  onAddPreset: (factor: number) => void;
  underlyingPresets?: { label: string; price: number; underlyingPrice: number }[];
  onAddUnderlyingPreset?: (price: number) => void;
}

export function QuickPresets({
  position,
  presets,
  onAddPreset,
  underlyingPresets,
  onAddUnderlyingPreset,
}: QuickPresetsProps) {
  if (!position) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <ThunderboltOutlined />
        <span className="font-medium">Quick presets</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {presets.map((preset) => (
          <Tooltip key={preset.label} title={`${formatVND(Math.round(position.buyPrice * preset.factor))}`}>
            <Button
              size="small"
              onClick={() => onAddPreset(preset.factor)}
              className="!px-2 !py-0.5 text-xs"
            >
              {preset.label}
            </Button>
          </Tooltip>
        ))}
      </div>

      {underlyingPresets && underlyingPresets.length > 0 && onAddUnderlyingPreset && (
        <>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mt-3">
            <span className="font-medium text-xs">Dựa trên giá CP mẹ</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {underlyingPresets.map((preset) => (
              <Tooltip key={preset.label} title={`CP: ${formatVND(preset.underlyingPrice)} → CW: ${formatVND(preset.price)}`}>
                <Button
                  size="small"
                  onClick={() => onAddUnderlyingPreset(preset.price)}
                  className="!px-2 !py-0.5 text-xs bg-orange-50 dark:bg-orange-900/20 hover:!bg-orange-100 dark:hover:!bg-orange-900/30"
                >
                  {preset.label}
                </Button>
              </Tooltip>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

interface ScenarioInputProps {
  newSellPrice: number | null;
  setNewSellPrice: (price: number | null) => void;
  onAddScenario: () => void;
  onClearScenarios: () => void;
  hasScenarios: boolean;
}

export function ScenarioInput({
  newSellPrice,
  setNewSellPrice,
  onAddScenario,
  onClearScenarios,
  hasScenarios,
}: ScenarioInputProps) {
  return (
    <div className="flex gap-2">
      <InputNumber
        placeholder="Giá bán..."
        value={newSellPrice}
        onChange={setNewSellPrice}
        formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
        parser={(value) => Number(value?.replace(/,/g, ""))}
        min={0}
        step={100}
        className="flex-1"
        onPressEnter={onAddScenario}
      />
      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={onAddScenario}
        disabled={!newSellPrice || newSellPrice <= 0}
      >
        Thêm
      </Button>
      {hasScenarios && (
        <Tooltip title="Xóa tất cả kịch bản">
          <Button
            icon={<DeleteOutlined />}
            onClick={onClearScenarios}
            danger
          />
        </Tooltip>
      )}
    </div>
  );
}
