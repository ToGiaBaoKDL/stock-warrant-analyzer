/**
 * Custom hook for trading signals data
 * 
 * Optimized for performance:
 * - Uses same cache keys as homepage for stock data
 * - Memoizes signal calculations
 * - Lazy loads history data only for visible stocks
 */

import { useMemo, useCallback } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import { apiClient, endpoints } from "@/lib";
import { generateTradingSignal, type TradingSignal, type SignalStrength } from "@/utils/indicators";
import { getRefetchInterval } from "@/utils";
import type { ChartHistoryResponse } from "@/hooks/useStockHistory";
import type { StockItem, StockListResponse } from "@/types/api";

// VN30 stocks list
export const VN30_SYMBOLS = new Set([
    "ACB", "BCM", "BID", "BVH", "CTG", "FPT", "GAS", "GVR", "HDB", "HPG",
    "MBB", "MSN", "MWG", "PLX", "POW", "SAB", "SHB", "SSB", "SSI", "STB",
    "TCB", "TPB", "VCB", "VHM", "VIB", "VIC", "VJC", "VNM", "VPB", "VRE"
]);

export type ExchangeType = "HOSE" | "HNX" | "VN30";

export interface StockSignalRow {
    key: string;
    symbol: string;
    name: string;
    exchange: string;
    price: number;
    refPrice: number;
    ceiling: number;
    floor: number;
    change: number;
    changePercent: number;
    volume: number;
    signal: TradingSignal | null;
    isLoadingHistory: boolean;
    historyError: string | null;
}

export interface SignalStats {
    total: number;
    strongBuy: number;
    buy: number;
    neutral: number;
    sell: number;
    strongSell: number;
    loadingHistory: number;
}

interface UseSignalsOptions {
    exchange: ExchangeType;
}

interface UseSignalsResult {
    // Data
    stocks: StockItem[];
    tableData: StockSignalRow[];
    stats: SignalStats;
    
    // Loading states
    isStockLoading: boolean;
    isHistoryLoading: boolean;
    
    // Counts
    hoseCount: number;
    hnxCount: number;
    
    // Actions
    refetch: () => void;
}

/**
 * Hook to fetch and calculate trading signals for stocks
 */
export function useSignals({ exchange }: UseSignalsOptions): UseSignalsResult {
    // Fetch stocks using same cache keys as homepage
    const { data: hoseData, isLoading: hoseLoading, refetch: refetchHose } = useQuery({
        queryKey: ["stocks", "hose"],
        queryFn: async () => {
            const response = await apiClient.get<StockListResponse>(
                endpoints.stocks.byExchange("hose")
            );
            return response.data;
        },
        refetchInterval: getRefetchInterval(60000),
        staleTime: 30000,
    });

    const { data: hnxData, isLoading: hnxLoading, refetch: refetchHnx } = useQuery({
        queryKey: ["stocks", "hnx"],
        queryFn: async () => {
            const response = await apiClient.get<StockListResponse>(
                endpoints.stocks.byExchange("hnx")
            );
            return response.data;
        },
        refetchInterval: getRefetchInterval(60000),
        staleTime: 30000,
    });

    // Get current stocks based on selected exchange
    const currentStocks = useMemo<StockItem[]>(() => {
        if (exchange === "HOSE") {
            return hoseData?.stocks || [];
        } else if (exchange === "HNX") {
            return hnxData?.stocks || [];
        } else {
            // VN30 - filter from HOSE
            return (hoseData?.stocks || []).filter(s => VN30_SYMBOLS.has(s.symbol));
        }
    }, [exchange, hoseData, hnxData]);

    // Fetch chart history for signals calculation
    // Uses longer staleTime since technical indicators don't need real-time updates
    const historyQueries = useQueries({
        queries: currentStocks.map((stock) => ({
            queryKey: ["stock-history", stock.symbol, "1D", 120],
            queryFn: async () => {
                const response = await apiClient.get<ChartHistoryResponse>(
                    endpoints.market.history(stock.symbol, { resolution: "1D", days: 120 })
                );
                return response.data;
            },
            staleTime: 10 * 60 * 1000, // 10 minutes - signals don't need frequent updates
            gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
            enabled: !!stock.symbol,
            retry: 1, // Only retry once for failed requests
        })),
    });

    // Create a map for quick history lookup - memoized
    const historyMap = useMemo(() => {
        const map = new Map<string, { 
            data: ChartHistoryResponse | undefined; 
            isLoading: boolean; 
            error: string | null 
        }>();
        
        currentStocks.forEach((stock, index) => {
            const query = historyQueries[index];
            map.set(stock.symbol, {
                data: query?.data,
                isLoading: query?.isLoading ?? true,
                error: query?.error?.message ?? null,
            });
        });
        
        return map;
    }, [currentStocks, historyQueries]);

    // Process data into table rows - memoized with signal calculation
    const tableData = useMemo<StockSignalRow[]>(() => {
        return currentStocks.map((stock) => {
            const historyInfo = historyMap.get(stock.symbol);
            const historyData = historyInfo?.data;

            let signal: TradingSignal | null = null;
            
            // Calculate signal if we have enough history data (50+ days)
            if (historyData?.c && historyData.c.length >= 50) {
                try {
                    signal = generateTradingSignal(
                        historyData.c,
                        historyData.h,
                        historyData.l,
                        historyData.v
                    );
                } catch {
                    // Ignore calculation errors
                }
            }

            return {
                key: stock.symbol,
                symbol: stock.symbol,
                name: stock.name || stock.symbol,
                exchange: stock.exchange,
                price: stock.current_price,
                refPrice: stock.ref_price,
                ceiling: stock.ceiling,
                floor: stock.floor,
                change: stock.change,
                changePercent: stock.change_percent,
                volume: stock.volume,
                signal,
                isLoadingHistory: historyInfo?.isLoading ?? true,
                historyError: historyInfo?.error ?? null,
            };
        });
    }, [currentStocks, historyMap]);

    // Calculate statistics - memoized
    const stats = useMemo<SignalStats>(() => {
        const withSignals = tableData.filter(r => r.signal);
        return {
            total: tableData.length,
            strongBuy: withSignals.filter(r => r.signal?.overall === "STRONG_BUY").length,
            buy: withSignals.filter(r => r.signal?.overall === "BUY").length,
            neutral: withSignals.filter(r => r.signal?.overall === "NEUTRAL").length,
            sell: withSignals.filter(r => r.signal?.overall === "SELL").length,
            strongSell: withSignals.filter(r => r.signal?.overall === "STRONG_SELL").length,
            loadingHistory: tableData.filter(r => r.isLoadingHistory).length,
        };
    }, [tableData]);

    // Refetch all data
    const refetch = useCallback(() => {
        refetchHose();
        refetchHnx();
        historyQueries.forEach(q => q.refetch());
    }, [refetchHose, refetchHnx, historyQueries]);

    return {
        stocks: currentStocks,
        tableData,
        stats,
        isStockLoading: hoseLoading || hnxLoading,
        isHistoryLoading: stats.loadingHistory > 0,
        hoseCount: hoseData?.stocks?.length || 0,
        hnxCount: hnxData?.stocks?.length || 0,
        refetch,
    };
}

export default useSignals;
