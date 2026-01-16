import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { apiClient, endpoints } from "@/lib/api-client";
import { queryKeys, pollingIntervals } from "@/lib/query-client";
import type { StockItem, StockListResponse } from "@/types/api";

/**
 * Hook to fetch current stock price with polling
 */
export function useStockPrice(symbol: string | null, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.marketData.price(symbol || ""),
    queryFn: async () => {
      if (!symbol) throw new Error("Symbol is required");
      const response = await apiClient.get<{ stock: StockItem }>(
        endpoints.stocks.detail(symbol)
      );
      return response.data;
    },
    enabled: enabled && !!symbol,
    refetchInterval: pollingIntervals.marketData,
    staleTime: pollingIntervals.marketData,
    placeholderData: keepPreviousData,
  });
}

/**
 * Hook to fetch stock list
 * Used for stock selector dropdown with all available stocks
 */
export function useStockList(params?: { exchange?: string; search?: string }) {
  return useQuery({
    queryKey: queryKeys.stocks.list(params),
    queryFn: async () => {
      const response = await apiClient.get<StockListResponse>(
        endpoints.stocks.list(params)
      );
      return response.data;
    },
    // Stock list rarely changes, cache for 5 minutes
    staleTime: pollingIntervals.stockList,
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    placeholderData: keepPreviousData,
  });
}
