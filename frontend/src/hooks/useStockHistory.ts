/**
 * Hook for fetching stock/warrant price history (for Sparklines)
 * 
 * Supports multiple resolutions:
 * - "1"  : 1-minute bars (default, best for sparklines)
 * - "5"  : 5-minute bars
 * - "15" : 15-minute bars
 * - "30" : 30-minute bars
 * - "60" : 1-hour bars
 * - "1D" : Daily bars
 */

import { useQuery } from "@tanstack/react-query";
import { apiClient, endpoints } from "@/lib/api-client";

// Response type from /api/market/history/{symbol}
export interface ChartHistoryResponse {
    t: number[];  // timestamps
    o: number[];  // open
    h: number[];  // high
    l: number[];  // low
    c: number[];  // close
    v: number[];  // volume
}

// Available resolutions
export type ChartResolution = "1" | "5" | "15" | "30" | "60" | "1D";

export interface UseStockHistoryOptions {
    /** Resolution (default: "1" = 1-minute) */
    resolution?: ChartResolution;
    /** Number of days (optional, uses backend smart default if not provided) */
    days?: number;
    /** Whether to enable the query */
    enabled?: boolean;
}

/**
 * Fetch price history for sparklines or charts
 * 
 * @param symbol - Stock or warrant symbol
 * @param options - Resolution, days, and enabled settings
 */
export function useStockHistory(
    symbol: string | null,
    options: UseStockHistoryOptions = {}
) {
    const { resolution = "1", days, enabled = true } = options;

    return useQuery<ChartHistoryResponse>({
        queryKey: ["stock-history", symbol, resolution, days],
        queryFn: async () => {
            if (!symbol) throw new Error("Symbol is required");
            const response = await apiClient.get<ChartHistoryResponse>(
                endpoints.market.history(symbol, { resolution, days })
            );
            return response.data;
        },
        enabled: enabled && !!symbol,
        staleTime: 10 * 60 * 1000, // 10 minutes (same as backend cache)
        refetchOnWindowFocus: false,
        placeholderData: (previousData, previousQuery) => previousData,
        retry: false, // Don't retry 404s for symbols without data
    });
}

export default useStockHistory;
