import { QueryClient } from "@tanstack/react-query";

// Default stale time for queries (30 seconds for better caching)
const DEFAULT_STALE_TIME = 30 * 1000;

// Default cache time (10 minutes - increased for better performance)
const DEFAULT_GC_TIME = 10 * 60 * 1000;

// Create and configure QueryClient
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data is considered fresh for 10 seconds
        staleTime: DEFAULT_STALE_TIME,
        
        // Keep data in cache for 5 minutes
        gcTime: DEFAULT_GC_TIME,
        
        // Retry failed requests up to 3 times
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        
        // Refetch on window focus only for critical real-time data
        refetchOnWindowFocus: false,
        
        // Don't refetch on reconnect by default (will be enabled per-query if needed)
        refetchOnReconnect: false,
        
        // Enable refetching in background
        refetchOnMount: true,
      },
      mutations: {
        // Retry mutations once on failure
        retry: 1,
      },
    },
  });
}

// Query key factory for consistent keys
export const queryKeys = {
  // Market data
  marketData: {
    all: ["marketData"] as const,
    price: (symbol: string) => ["marketData", "price", symbol] as const,
  },
  
  // Warrants
  warrants: {
    all: ["warrants"] as const,
    info: (symbol: string) => ["warrants", "info", symbol] as const,
    byUnderlying: (symbol: string) => ["warrants", "underlying", symbol] as const,
  },
  
  // Stocks
  stocks: {
    all: ["stocks"] as const,
    list: (params?: { exchange?: string; search?: string }) => 
      ["stocks", "list", params] as const,
    popular: () => ["stocks", "popular"] as const,
  },
};

// Polling intervals (in milliseconds) - Optimized for performance
export const pollingIntervals = {
  // Market data: 30 seconds (reduced from 10s for better performance)
  marketData: 30 * 1000,
  
  // Warrant data: 1 minute (reduced from 30s)
  warrantData: 60 * 1000,
  
  // Stock list: 10 minutes (rarely changes)
  stockList: 10 * 60 * 1000,
};
