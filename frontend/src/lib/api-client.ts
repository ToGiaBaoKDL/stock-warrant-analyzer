import axios from "axios";
import type { AxiosInstance, AxiosError } from "axios";

// API Base URL - adjust for production
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

// Create axios instance with default config
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError) => {
    if (error.response) {
      const status = error.response.status;

      if (status === 404) {
        console.error("Resource not found:", error.config?.url);
      } else if (status === 500) {
        console.error("Server error:", error.message);
      }
    } else if (error.request) {
      console.error("Network error - no response received");
    }

    return Promise.reject(error);
  }
);

// API endpoint helpers
export const endpoints = {
  // Stocks
  stocks: {
    list: (params?: { exchange?: string; search?: string; limit?: number }) => {
      const query = new URLSearchParams();
      if (params?.exchange) query.append('exchange', params.exchange);
      if (params?.search) query.append('search', params.search);
      if (params?.limit) query.append('limit', params.limit.toString());
      return `/stocks/${query.toString() ? '?' + query.toString() : ''}`;
    },
    byExchange: (exchange: string, params?: { sort_by?: string; sort_order?: string; limit?: number }) => {
      const query = new URLSearchParams();
      if (params?.sort_by) query.append('sort_by', params.sort_by);
      if (params?.sort_order) query.append('sort_order', params.sort_order);
      if (params?.limit) query.append('limit', params.limit.toString());
      return `/stocks/exchange/${exchange}${query.toString() ? '?' + query.toString() : ''}`;
    },
    price: (symbol: string) => `/stocks/price/${symbol}`,
    detail: (symbol: string) => `/stocks/${symbol}`,
    summary: () => `/market/exchange-summary`,
    popular: () => `/stocks/popular`,
  },

  // Warrants
  warrants: {
    list: (params?: {
      exchange?: string;
      underlying?: string;
      issuer?: string;
      search?: string;
      sort_by?: string;
      sort_order?: string;
      limit?: number;
      min_days?: number;
      max_days?: number;
      min_volume?: number;
    }) => {
      const query = new URLSearchParams();
      if (params?.exchange) query.append('exchange', params.exchange);
      if (params?.underlying) query.append('underlying', params.underlying);
      if (params?.issuer) query.append('issuer', params.issuer);
      if (params?.search) query.append('search', params.search);
      if (params?.sort_by) query.append('sort_by', params.sort_by);
      if (params?.sort_order) query.append('sort_order', params.sort_order);
      if (params?.limit) query.append('limit', params.limit.toString());
      if (params?.min_days) query.append('min_days', params.min_days.toString());
      if (params?.max_days) query.append('max_days', params.max_days.toString());
      if (params?.min_volume) query.append('min_volume', params.min_volume.toString());
      return `/warrants/${query.toString() ? '?' + query.toString() : ''}`;
    },
    byUnderlying: (symbol: string, params?: { sort_by?: string; sort_order?: string }) => {
      const query = new URLSearchParams();
      if (params?.sort_by) query.append('sort_by', params.sort_by);
      if (params?.sort_order) query.append('sort_order', params.sort_order);
      return `/warrants/underlying/${symbol}${query.toString() ? '?' + query.toString() : ''}`;
    },
    detail: (symbol: string) => `/warrants/${symbol}`,
    underlyingList: () => `/warrants/underlying-list`,
    issuers: () => `/warrants/issuers`,
    statistics: () => `/warrants/statistics`,
  },

  // Market
  market: {
    overview: () => `/market/overview`,
    topVolume: (params?: { exchange?: string; limit?: number }) => {
      const query = new URLSearchParams();
      if (params?.exchange) query.append('exchange', params.exchange);
      if (params?.limit) query.append('limit', params.limit.toString());
      return `/market/top-volume${query.toString() ? '?' + query.toString() : ''}`;
    },
    topGainers: (params?: { exchange?: string; limit?: number }) => {
      const query = new URLSearchParams();
      if (params?.exchange) query.append('exchange', params.exchange);
      if (params?.limit) query.append('limit', params.limit.toString());
      return `/market/top-gainers${query.toString() ? '?' + query.toString() : ''}`;
    },
    topLosers: (params?: { exchange?: string; limit?: number }) => {
      const query = new URLSearchParams();
      if (params?.exchange) query.append('exchange', params.exchange);
      if (params?.limit) query.append('limit', params.limit.toString());
      return `/market/top-losers${query.toString() ? '?' + query.toString() : ''}`;
    },
    warrantTopVolume: (limit?: number) =>
      `/market/warrant-top-volume${limit ? '?limit=' + limit : ''}`,
    warrantExpiringSoon: (maxDays?: number, limit?: number) => {
      const query = new URLSearchParams();
      if (maxDays) query.append('max_days', maxDays.toString());
      if (limit) query.append('limit', limit.toString());
      return `/market/warrant-expiring-soon${query.toString() ? '?' + query.toString() : ''}`;
    },
    exchangeSummary: () => `/market/exchange-summary`,
  },
};

export default apiClient;
