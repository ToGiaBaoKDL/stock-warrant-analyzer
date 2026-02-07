import { useMemo } from 'react';
import { useTheme } from 'next-themes';
import { AppColors } from '@/utils/theme';

/**
 * Hook to provide chart colors that adapt to the current theme.
 * Uses next-themes to detect current mode and returns appropriate Lightweight Charts colors.
 */
export const useChartColors = () => {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === "dark";

    return useMemo(() => {
        return {
            background: isDark ? '#1F1F1F' : '#ffffff',
            textColor: isDark ? '#e5e7eb' : '#4b5563', // gray-200 for better visibility
            gridColor: isDark ? '#333333' : '#f8f9fa',
            borderColor: isDark ? '#374151' : '#f0f0f0',
            crosshairLabel: AppColors.primary,

            // Candlestick
            upColor: isDark ? '#4ade80' : '#089981', // Brighter green for dark
            downColor: isDark ? '#f87171' : '#f23645', // Brighter red for dark

            // Area/Line
            lineColor: AppColors.primary,
            areaTopColor: isDark ? 'rgba(204, 120, 92, 0.4)' : 'rgba(204, 120, 92, 0.4)',
            areaBottomColor: isDark ? 'rgba(204, 120, 92, 0.0)' : 'rgba(204, 120, 92, 0.0)',

            // Canvas chart colors (for donut/bar charts)
            canvasLabel: isDark ? '#e5e7eb' : '#4b5563',
            canvasGrid: isDark ? '#374151' : '#e5e7eb',
            progressRail: isDark ? '#374151' : '#e8e8e8',

            // Spinner/Loading
            spinnerColor: AppColors.primary,
        };
    }, [isDark]);
};
