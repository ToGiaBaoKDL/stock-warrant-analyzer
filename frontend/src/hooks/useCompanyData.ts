/**
 * Company Data Hooks
 * 
 * React Query hooks for fetching company profile, subsidiaries, leadership,
 * shareholders, and capital/dividend data.
 */

import { useQuery } from "@tanstack/react-query";
import { apiClient, endpoints } from "@/lib/api-client";
import type {
    CompanyProfile,
    SubCompany,
    LeadershipMember,
    ShareholderDetail,
    ShareholderSummary,
    CapAndDividend
} from "@/types/company";

// ============================================
// Stale Times
// ============================================

const STALE_TIME_1H = 60 * 60 * 1000; // 1 hour
const STALE_TIME_30M = 30 * 60 * 1000; // 30 minutes

// ============================================
// Company Profile Hook
// ============================================

export function useCompanyProfile(symbol: string | null) {
    return useQuery<CompanyProfile>({
        queryKey: ["company-profile", symbol],
        queryFn: async () => {
            if (!symbol) throw new Error("Symbol is required");
            const response = await apiClient.get<CompanyProfile>(
                endpoints.company.profile(symbol)
            );
            return response.data;
        },
        enabled: !!symbol,
        staleTime: STALE_TIME_1H,
        refetchOnWindowFocus: false,
    });
}

// ============================================
// Subsidiaries Hook
// ============================================

export function useSubCompanies(symbol: string | null) {
    return useQuery<SubCompany[]>({
        queryKey: ["sub-companies", symbol],
        queryFn: async () => {
            if (!symbol) throw new Error("Symbol is required");
            const response = await apiClient.get<SubCompany[]>(
                endpoints.company.subsidiaries(symbol)
            );
            return response.data;
        },
        enabled: !!symbol,
        staleTime: STALE_TIME_1H,
        refetchOnWindowFocus: false,
    });
}

// ============================================
// Leadership Hook
// ============================================

export function useLeadership(symbol: string | null) {
    return useQuery<LeadershipMember[]>({
        queryKey: ["leadership", symbol],
        queryFn: async () => {
            if (!symbol) throw new Error("Symbol is required");
            const response = await apiClient.get<LeadershipMember[]>(
                endpoints.company.leadership(symbol)
            );
            return response.data;
        },
        enabled: !!symbol,
        staleTime: STALE_TIME_1H,
        refetchOnWindowFocus: false,
    });
}

// ============================================
// Shareholders Hook
// ============================================

export function useShareholders(symbol: string | null) {
    return useQuery<ShareholderDetail[]>({
        queryKey: ["shareholders", symbol],
        queryFn: async () => {
            if (!symbol) throw new Error("Symbol is required");
            const response = await apiClient.get<ShareholderDetail[]>(
                endpoints.company.shareholders(symbol)
            );
            return response.data;
        },
        enabled: !!symbol,
        staleTime: STALE_TIME_30M,
        refetchOnWindowFocus: false,
    });
}

// ============================================
// Shareholder Summary Hook (for pie chart)
// ============================================

export function useShareholderSummary(symbol: string | null) {
    return useQuery<ShareholderSummary>({
        queryKey: ["shareholder-summary", symbol],
        queryFn: async () => {
            if (!symbol) throw new Error("Symbol is required");
            const response = await apiClient.get<ShareholderSummary>(
                endpoints.company.shareholderSummary(symbol)
            );
            return response.data;
        },
        enabled: !!symbol,
        staleTime: STALE_TIME_30M,
        refetchOnWindowFocus: false,
    });
}

// ============================================
// Capital & Dividend Hook
// ============================================

export function useCapDividend(symbol: string | null) {
    return useQuery<CapAndDividend>({
        queryKey: ["cap-dividend", symbol],
        queryFn: async () => {
            if (!symbol) throw new Error("Symbol is required");
            const response = await apiClient.get<CapAndDividend>(
                endpoints.company.capDividend(symbol)
            );
            return response.data;
        },
        enabled: !!symbol,
        staleTime: STALE_TIME_1H,
        refetchOnWindowFocus: false,
    });
}
