/**
 * Formatting utilities for display
 */

/**
 * Format number as Vietnamese Dong (VND)
 */
export function formatVND(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format number with thousand separators
 */
export function formatNumber(value: number, decimals: number = 0): string {
  return new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format percentage with sign
 */
export function formatPercent(value: number, decimals: number = 2): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
}

/**
 * Format percentage without sign
 */
export function formatPercentUnsigned(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format date to Vietnamese locale
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Format date to relative time (e.g., "15 days left")
 */
export function formatDaysRemaining(days: number): string {
  if (days <= 0) {
    return "Đã đáo hạn";
  }
  if (days === 1) {
    return "1 ngày";
  }
  return `${days} ngày`;
}

/**
 * Get color class based on profit/loss
 */
export function getProfitColorClass(value: number): string {
  if (value > 0) return "text-green-600";
  if (value < 0) return "text-red-600";
  return "text-gray-600";
}

/**
 * Get background color class based on break-even comparison
 */
export function getBreakEvenColorClass(breakEven: number, targetPrice: number): string {
  if (breakEven < targetPrice) return "bg-green-100";
  if (breakEven > targetPrice) return "bg-red-100";
  return "bg-gray-100";
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

/**
 * Format large numbers with K, M, B suffixes
 */
export function formatCompactNumber(value: number): string {
  const formatter = new Intl.NumberFormat("en", {
    notation: "compact",
    compactDisplay: "short",
  });
  return formatter.format(value);
}

/**
 * Format volume (stock trading volume)
 */
export function formatVolume(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toString();
}
