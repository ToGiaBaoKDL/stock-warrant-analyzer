import { useMemo } from "react";
import {
  calculateBreakEven,
  calculateProfitLoss,
  calculateExerciseValue,
  analyzeWarrant,
} from "@/utils/calculations";
import type {
  BreakEvenResult,
  ProfitLossResult,
  ExerciseResult,
  WarrantAnalysisResult,
} from "@/types/calculation";
import type { WarrantPosition, WarrantScenario } from "@/types/warrant";

/**
 * Hook for calculating break-even price
 */
export function useBreakEven(
  cwPrice: number | null,
  conversionRatio: number | null,
  exercisePrice: number | null,
  targetUnderlyingPrice?: number | null
): BreakEvenResult | null {
  return useMemo(() => {
    if (cwPrice === null || conversionRatio === null || exercisePrice === null) {
      return null;
    }
    
    return calculateBreakEven(
      cwPrice,
      conversionRatio,
      exercisePrice,
      targetUnderlyingPrice ?? undefined
    );
  }, [cwPrice, conversionRatio, exercisePrice, targetUnderlyingPrice]);
}

/**
 * Hook for calculating profit/loss for a single trade
 */
export function useProfitLoss(
  buyPrice: number | null,
  sellPrice: number | null,
  quantity: number | null,
  buyFeePercent?: number,
  sellFeePercent?: number,
  taxPercent?: number
): ProfitLossResult | null {
  return useMemo(() => {
    if (buyPrice === null || sellPrice === null || quantity === null) {
      return null;
    }
    
    return calculateProfitLoss(
      buyPrice,
      sellPrice,
      quantity,
      buyFeePercent,
      sellFeePercent,
      taxPercent
    );
  }, [buyPrice, sellPrice, quantity, buyFeePercent, sellFeePercent, taxPercent]);
}

/**
 * Hook for calculating exercise value
 */
export function useExerciseValue(
  underlyingPrice: number | null,
  exercisePrice: number | null,
  conversionRatio: number | null,
  currentCwPrice: number | null,
  quantity?: number,
  buyPrice?: number,
  buyFeePercent?: number
): ExerciseResult | null {
  return useMemo(() => {
    if (
      underlyingPrice === null ||
      exercisePrice === null ||
      conversionRatio === null ||
      currentCwPrice === null
    ) {
      return null;
    }
    
    return calculateExerciseValue(
      underlyingPrice,
      exercisePrice,
      conversionRatio,
      currentCwPrice,
      quantity,
      buyPrice,
      buyFeePercent
    );
  }, [
    underlyingPrice,
    exercisePrice,
    conversionRatio,
    currentCwPrice,
    quantity,
    buyPrice,
    buyFeePercent,
  ]);
}

/**
 * Hook for complete warrant analysis
 */
export function useWarrantAnalysis(
  position: WarrantPosition | null,
  scenarios: WarrantScenario[],
  warrantInfo: {
    conversionRatio: number;
    exercisePrice: number;
    underlyingPrice: number;
    currentCwPrice: number;
  } | null,
  targetUnderlyingPrice?: number | null
): WarrantAnalysisResult | null {
  return useMemo(() => {
    if (!position || !warrantInfo) {
      return null;
    }
    
    return analyzeWarrant(
      position,
      scenarios,
      warrantInfo,
      targetUnderlyingPrice ?? undefined
    );
  }, [position, scenarios, warrantInfo, targetUnderlyingPrice]);
}
