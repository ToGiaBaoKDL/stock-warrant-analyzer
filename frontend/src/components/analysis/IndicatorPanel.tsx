"use client";

import React from "react";
import { Typography, Switch, InputNumber, Select, ColorPicker } from "antd";
import type { Color } from "antd/es/color-picker";
import type { MAType } from "@/utils/indicators";

const { Text } = Typography;

export interface IndicatorSettings {
    // Moving Averages
    showMA1: boolean;
    ma1Period: number;
    ma1Type: MAType;
    ma1Color: string;
    showMA2: boolean;
    ma2Period: number;
    ma2Type: MAType;
    ma2Color: string;
    // Bollinger Bands
    showBB: boolean;
    bbPeriod: number;
    bbStdDev: number;
    // Volume
    showVolume: boolean;
    volumeMAPeriod: number;
    // MACD
    showMACD: boolean;
    macdFast: number;
    macdSlow: number;
    macdSignal: number;
    // RSI
    showRSI: boolean;
    rsiPeriod: number;
    // Ichimoku
    showIchimoku: boolean;
    ichimokuTenkan: number;
    ichimokuKijun: number;
    ichimokuSenkouB: number;
}

export const DEFAULT_INDICATORS: IndicatorSettings = {
    showMA1: false,
    ma1Period: 20,
    ma1Type: "SMA",
    ma1Color: "#2196F3",
    showMA2: false,
    ma2Period: 50,
    ma2Type: "SMA",
    ma2Color: "#FF9800",
    showBB: false,
    bbPeriod: 20,
    bbStdDev: 2,
    showVolume: false,
    volumeMAPeriod: 20,
    showMACD: false,
    macdFast: 12,
    macdSlow: 26,
    macdSignal: 9,
    showRSI: false,
    rsiPeriod: 14,
    showIchimoku: false,
    ichimokuTenkan: 9,
    ichimokuKijun: 26,
    ichimokuSenkouB: 52,
};

interface IndicatorPanelProps {
    indicators: IndicatorSettings;
    onChange: (key: keyof IndicatorSettings, value: unknown) => void;
}

/**
 * Indicator Settings Panel Component
 */
export const IndicatorPanel: React.FC<IndicatorPanelProps> = ({ indicators, onChange }) => {
    return (
        <div 
            className="p-4 w-72 max-h-96 overflow-y-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
            onClick={(e) => e.stopPropagation()}
        >
            <Text strong className="text-sm">Chỉ báo kỹ thuật</Text>
            
            {/* Moving Average 1 */}
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                    <Text className="font-medium">Moving Average 1</Text>
                    <Switch 
                        size="small" 
                        checked={indicators.showMA1} 
                        onChange={(checked) => onChange("showMA1", checked)} 
                    />
                </div>
                {indicators.showMA1 && (
                    <div className="flex gap-2 items-center mt-2">
                        <Select
                            size="small"
                            value={indicators.ma1Type}
                            onChange={(value) => onChange("ma1Type", value)}
                            options={[
                                { value: "SMA", label: "SMA" },
                                { value: "EMA", label: "EMA" },
                            ]}
                            style={{ width: 70 }}
                        />
                        <InputNumber
                            size="small"
                            min={2}
                            max={200}
                            value={indicators.ma1Period}
                            onChange={(value) => value && onChange("ma1Period", value)}
                            style={{ width: 60 }}
                        />
                        <ColorPicker
                            size="small"
                            value={indicators.ma1Color}
                            onChange={(color: Color) => onChange("ma1Color", color.toHexString())}
                            trigger="click"
                            getPopupContainer={(trigger) => trigger.parentElement || document.body}
                        />
                    </div>
                )}
            </div>

            {/* Moving Average 2 */}
            <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                    <Text className="font-medium">Moving Average 2</Text>
                    <Switch 
                        size="small" 
                        checked={indicators.showMA2} 
                        onChange={(checked) => onChange("showMA2", checked)} 
                    />
                </div>
                {indicators.showMA2 && (
                    <div className="flex gap-2 items-center mt-2">
                        <Select
                            size="small"
                            value={indicators.ma2Type}
                            onChange={(value) => onChange("ma2Type", value)}
                            options={[
                                { value: "SMA", label: "SMA" },
                                { value: "EMA", label: "EMA" },
                            ]}
                            style={{ width: 70 }}
                        />
                        <InputNumber
                            size="small"
                            min={2}
                            max={200}
                            value={indicators.ma2Period}
                            onChange={(value) => value && onChange("ma2Period", value)}
                            style={{ width: 60 }}
                        />
                        <ColorPicker
                            size="small"
                            value={indicators.ma2Color}
                            onChange={(color: Color) => onChange("ma2Color", color.toHexString())}
                            trigger="click"
                            getPopupContainer={(trigger) => trigger.parentElement || document.body}
                        />
                    </div>
                )}
            </div>

            {/* Bollinger Bands */}
            <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                    <Text className="font-medium">Bollinger Bands</Text>
                    <Switch 
                        size="small" 
                        checked={indicators.showBB} 
                        onChange={(checked) => onChange("showBB", checked)} 
                    />
                </div>
                {indicators.showBB && (
                    <div className="flex gap-2 items-center mt-2">
                        <Text className="text-xs text-gray-500 dark:text-gray-400">Period:</Text>
                        <InputNumber
                            size="small"
                            min={2}
                            max={200}
                            value={indicators.bbPeriod}
                            onChange={(value) => value && onChange("bbPeriod", value)}
                            style={{ width: 60 }}
                        />
                        <Text className="text-xs text-gray-500 dark:text-gray-400">σ:</Text>
                        <InputNumber
                            size="small"
                            min={1}
                            max={4}
                            step={0.5}
                            value={indicators.bbStdDev}
                            onChange={(value) => value && onChange("bbStdDev", value)}
                            style={{ width: 60 }}
                        />
                    </div>
                )}
            </div>

            {/* Volume */}
            <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                    <Text className="font-medium">Volume</Text>
                    <Switch 
                        size="small" 
                        checked={indicators.showVolume} 
                        onChange={(checked) => onChange("showVolume", checked)} 
                    />
                </div>
                {indicators.showVolume && (
                    <div className="flex gap-2 items-center mt-2">
                        <Text className="text-xs text-gray-500 dark:text-gray-400">MA Period:</Text>
                        <InputNumber
                            size="small"
                            min={2}
                            max={100}
                            value={indicators.volumeMAPeriod}
                            onChange={(value) => value && onChange("volumeMAPeriod", value)}
                            style={{ width: 60 }}
                        />
                    </div>
                )}
            </div>

            {/* MACD */}
            <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                    <Text className="font-medium">MACD</Text>
                    <Switch 
                        size="small" 
                        checked={indicators.showMACD} 
                        onChange={(checked) => onChange("showMACD", checked)} 
                    />
                </div>
                {indicators.showMACD && (
                    <div className="flex gap-1 items-center mt-2 flex-wrap">
                        <Text className="text-xs text-gray-500 dark:text-gray-400">F:</Text>
                        <InputNumber size="small" min={2} max={50} value={indicators.macdFast}
                            onChange={(v) => v && onChange("macdFast", v)} style={{ width: 50 }} />
                        <Text className="text-xs text-gray-500 dark:text-gray-400">S:</Text>
                        <InputNumber size="small" min={2} max={100} value={indicators.macdSlow}
                            onChange={(v) => v && onChange("macdSlow", v)} style={{ width: 50 }} />
                        <Text className="text-xs text-gray-500 dark:text-gray-400">Sig:</Text>
                        <InputNumber size="small" min={2} max={50} value={indicators.macdSignal}
                            onChange={(v) => v && onChange("macdSignal", v)} style={{ width: 50 }} />
                    </div>
                )}
            </div>

            {/* RSI */}
            <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                    <Text className="font-medium">RSI</Text>
                    <Switch 
                        size="small" 
                        checked={indicators.showRSI} 
                        onChange={(checked) => onChange("showRSI", checked)} 
                    />
                </div>
                {indicators.showRSI && (
                    <div className="flex gap-2 items-center mt-2">
                        <Text className="text-xs text-gray-500 dark:text-gray-400">Period:</Text>
                        <InputNumber size="small" min={2} max={50} value={indicators.rsiPeriod}
                            onChange={(v) => v && onChange("rsiPeriod", v)} style={{ width: 60 }} />
                    </div>
                )}
            </div>

            {/* Ichimoku */}
            <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                    <Text className="font-medium">Ichimoku Cloud</Text>
                    <Switch 
                        size="small" 
                        checked={indicators.showIchimoku} 
                        onChange={(checked) => onChange("showIchimoku", checked)} 
                    />
                </div>
                {indicators.showIchimoku && (
                    <div className="flex gap-1 items-center mt-2 flex-wrap">
                        <Text className="text-xs text-gray-500 dark:text-gray-400">T:</Text>
                        <InputNumber size="small" min={2} max={50} value={indicators.ichimokuTenkan}
                            onChange={(v) => v && onChange("ichimokuTenkan", v)} style={{ width: 45 }} />
                        <Text className="text-xs text-gray-500 dark:text-gray-400">K:</Text>
                        <InputNumber size="small" min={2} max={100} value={indicators.ichimokuKijun}
                            onChange={(v) => v && onChange("ichimokuKijun", v)} style={{ width: 45 }} />
                        <Text className="text-xs text-gray-500 dark:text-gray-400">S:</Text>
                        <InputNumber size="small" min={2} max={200} value={indicators.ichimokuSenkouB}
                            onChange={(v) => v && onChange("ichimokuSenkouB", v)} style={{ width: 45 }} />
                    </div>
                )}
            </div>
        </div>
    );
};
