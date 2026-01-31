/**
 * Application Theme & Design System Constants
 * Central source of truth for colors and reused styles
 * 
 * Note: For dark mode support, use CSS variables (var(--color-*)) in components
 * These constants are for JS-only use cases where CSS variables aren't available
 */

export const AppColors = {
    // Brand Colors
    primary: "#CC785C", // The main orange/terracotta brand color

    // Semantic Colors (Functional) - Use CSS vars for dark mode support
    success: "var(--color-up)",      // CSS variable for up/success
    error: "var(--color-down)",      // CSS variable for down/error
    warning: "#ca8a04",              // yellow-600
    info: "var(--color-floor)",      // CSS variable for floor/info

    // Text Colors - prefer Tailwind classes for dark mode
    textPrimary: "#1f2937",   // gray-800 - use text-gray-800 dark:text-gray-200
    textSecondary: "#4b5563", // gray-600 - use text-gray-600 dark:text-gray-400
    textLight: "#9ca3af",     // gray-400 - use text-gray-400 dark:text-gray-500

    // Backgrounds - prefer Tailwind classes for dark mode
    bgLight: "#F5F4EF", // Main app background - use var(--background)
    bgWhite: "#ffffff", // use bg-white dark:bg-gray-800

    // Board Colors (Stock Market specific) - CSS variables for dark mode support
    ceiling: "var(--color-ceiling)", // purple
    floor: "var(--color-floor)",     // cyan
    ref: "var(--color-ref)",         // yellow/amber
} as const;

export const AppDimensions = {
    maxContentWidth: "max-w-7xl",
    headerHeight: "64px",
} as const;

/**
 * Color class helpers for consistent theming
 */
export const ThemeClasses = {
    // Card backgrounds
    card: "bg-white dark:bg-gray-800",
    cardHover: "hover:bg-gray-50 dark:hover:bg-gray-700",
    
    // Text
    textPrimary: "text-gray-900 dark:text-gray-100",
    textSecondary: "text-gray-600 dark:text-gray-400",
    textMuted: "text-gray-400 dark:text-gray-500",
    
    // Borders
    border: "border-gray-200 dark:border-gray-700",
    
    // Inputs
    input: "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600",
    
    // Profit/Loss
    profitBg: "bg-green-50 dark:bg-green-900/20",
    profitText: "text-green-600 dark:text-green-400",
    lossBg: "bg-red-50 dark:bg-red-900/20",
    lossText: "text-red-600 dark:text-red-400",
} as const;
