import { useState, useEffect } from 'react';

/**
 * Debounce hook - delays updating a value until after a delay period
 * Useful for search inputs to avoid triggering on every keystroke
 * 
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 300ms)
 * @returns Debounced value
 * 
 * @example
 * const [searchText, setSearchText] = useState("");
 * const debouncedSearch = useDebounce(searchText, 300);
 * 
 * // Use debouncedSearch in useMemo/useEffect instead of searchText
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        // Set up a timer to update the debounced value after the delay
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        // Clean up the timer if value changes before delay expires
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}
