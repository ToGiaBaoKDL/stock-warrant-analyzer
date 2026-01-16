import { QueryClient } from "@tanstack/react-query";

// Default stale time for queries (10 seconds for near real-time data)
const DEFAULT_STALE_TIME = 10 * 1000;

// Default cache time (5 minutes)
const DEFAULT_GC_TIME = 5 * 60 * 1000;

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
        
        // Refetch on window focus for real-time data
        refetchOnWindowFocus: true,
        
        // Don't refetch on reconnect by default
        refetchOnReconnect: true,
        
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

// Polling intervals (in milliseconds)
export const pollingIntervals = {
  // Real-time market data: 10 seconds
  marketData: 10 * 1000,
  
  // Warrant data: 30 seconds
  warrantData: 30 * 1000,
  
  // Stock list: 5 minutes (rarely changes)
  stockList: 5 * 60 * 1000,
};
