/**
 * Price color utilities
 * Centralized color logic for stock/warrant price changes
 * 
 * Vietnam Stock Market Color Convention:
 * - Ceiling: Purple (#9333ea) - max daily price increase
 * - Up: Green (#16a34a) - positive change
 * - Reference: Yellow (#ca8a04) - no change
 * - Down: Red (#dc2626) - negative change  
 * - Floor: Cyan (#0891b2) - max daily price decrease
 */

import { AppColors } from "@/utils/theme";

/**
 * Price position relative to reference price
 */
export type PricePosition = "ceiling" | "up" | "ref" | "down" | "floor";

/**
 * Determine price position based on current price and reference points
 * 
 * @param currentPrice - Current trading price
 * @param refPrice - Reference price (previous close)
 * @param ceilingPrice - Ceiling price (max +7%)
 * @param floorPrice - Floor price (min -7%)
 */
export function getPricePosition(
    currentPrice: number,
    refPrice: number,
    ceilingPrice?: number,
    floorPrice?: number
): PricePosition {
    // Validate inputs - use fallback if ref is invalid
    const safeRef = refPrice > 0 ? refPrice : currentPrice;
    const safeCeiling = ceilingPrice && ceilingPrice > 0 ? ceilingPrice : undefined;
    const safeFloor = floorPrice && floorPrice > 0 ? floorPrice : undefined;
    
    // Check ceiling/floor first
    if (safeCeiling && currentPrice >= safeCeiling) return "ceiling";
    if (safeFloor && currentPrice <= safeFloor) return "floor";
    
    // Then check relative to reference
    if (currentPrice > safeRef) return "up";
    if (currentPrice < safeRef) return "down";
    return "ref";
}

/**
 * Get color hex for a price position
 */
export function getPositionColorHex(position: PricePosition): string {
    switch (position) {
        case "ceiling": return "var(--color-ceiling)";
        case "up": return "var(--color-up)";
        case "ref": return "var(--color-ref)";
        case "down": return "var(--color-down)";
        case "floor": return "var(--color-floor)";
    }
}

/**
 * Get color hex based on price change (simple version)
 * - Positive: Green
 * - Zero: Yellow
 * - Negative: Red
 */
export function getPriceColorHex(change: number): string {
    if (change > 0) return "var(--color-up)";
    if (change < 0) return "var(--color-down)";
    return "var(--color-ref)";
}

/**
 * Get full price color considering ceiling/floor limits
 * 
 * @param currentPrice - Current trading price
 * @param refPrice - Reference price
 * @param ceilingPrice - Ceiling price (optional)
 * @param floorPrice - Floor price (optional)
 */
export function getFullPriceColorHex(
    currentPrice: number,
    refPrice: number,
    ceilingPrice?: number,
    floorPrice?: number
): string {
    const position = getPricePosition(currentPrice, refPrice, ceilingPrice, floorPrice);
    return getPositionColorHex(position);
}
