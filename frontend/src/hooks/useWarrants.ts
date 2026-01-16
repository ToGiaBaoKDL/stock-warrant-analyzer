import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { apiClient, endpoints } from "@/lib/api-client";
import { queryKeys, pollingIntervals } from "@/lib/query-client";
import type { WarrantDetailResponse, WarrantsByUnderlyingResponse, WarrantListResponse } from "@/types/api";

/**
 * Hook to fetch warrant information with polling
 */
export function useWarrantInfo(symbol: string | null, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.warrants.info(symbol || ""),
    queryFn: async () => {
      if (!symbol) throw new Error("Symbol is required");
      const response = await apiClient.get<WarrantDetailResponse>(
        endpoints.warrants.detail(symbol)
      );
      return response.data;
    },
    enabled: enabled && !!symbol,
    refetchInterval: pollingIntervals.warrantData,
    staleTime: pollingIntervals.warrantData,
    placeholderData: keepPreviousData,
  });
}

/**
 * Hook to fetch all warrants for an underlying stock
 * Note: Does NOT use keepPreviousData to ensure loading state shows when changing underlying
 */
export function useWarrantsByUnderlying(
  underlyingSymbol: string | null,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: queryKeys.warrants.byUnderlying(underlyingSymbol || ""),
    queryFn: async () => {
      if (!underlyingSymbol) throw new Error("Underlying symbol is required");
      const response = await apiClient.get<WarrantsByUnderlyingResponse>(
        endpoints.warrants.byUnderlying(underlyingSymbol)
      );
      return response.data;
    },
    enabled: enabled && !!underlyingSymbol,
    refetchInterval: pollingIntervals.warrantData,
    staleTime: pollingIntervals.warrantData,
  });
}

/**
 * Hook to fetch all warrants with optional filters
 */
export function useWarrantList(params?: {
  exchange?: string;
  underlying?: string;
  issuer?: string;
  search?: string;
  limit?: number;
}, enabled: boolean = true) {
  return useQuery({
    queryKey: ['warrants-list', params],
    queryFn: async () => {
      const response = await apiClient.get<WarrantListResponse>(
        endpoints.warrants.list(params)
      );
      return response.data;
    },
    enabled,
    refetchInterval: pollingIntervals.warrantData,
    staleTime: pollingIntervals.warrantData,
  });
}
