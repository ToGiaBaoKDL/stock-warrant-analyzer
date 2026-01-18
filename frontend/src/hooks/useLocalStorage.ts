"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * Custom hook for syncing state with localStorage
 * Provides type-safe persistence with SSR support
 *
 * @template T - Type of the stored value
 * @param key - localStorage key
 * @param initialValue - Default value when no stored value exists
 * @returns Tuple of [value, setValue, removeValue]
 */
export function useLocalStorage<T>(
    key: string,
    initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
    // State to store the value
    // Initialize with initial value to avoid hydration mismatch
    const [storedValue, setStoredValue] = useState<T>(initialValue);
    const [isHydrated, setIsHydrated] = useState(false);

    // Load from localStorage after component mounts (client-side only)
    useEffect(() => {
        try {
            const item = window.localStorage.getItem(key);
            if (item !== null) {
                setStoredValue(JSON.parse(item) as T);
            }
        } catch (error) {
            console.warn(`Error reading localStorage key "${key}":`, error);
        }
        setIsHydrated(true);
    }, [key]);

    // Save to localStorage whenever value changes (after hydration)
    useEffect(() => {
        if (!isHydrated) return;

        try {
            window.localStorage.setItem(key, JSON.stringify(storedValue));
        } catch (error) {
            console.warn(`Error setting localStorage key "${key}":`, error);
        }
    }, [key, storedValue, isHydrated]);

    // Memoized setter that supports functional updates
    const setValue = useCallback(
        (value: T | ((prev: T) => T)) => {
            setStoredValue((prev) => {
                const nextValue = value instanceof Function ? value(prev) : value;
                return nextValue;
            });
        },
        []
    );

    // Remove value from storage
    const removeValue = useCallback(() => {
        try {
            window.localStorage.removeItem(key);
            setStoredValue(initialValue);
        } catch (error) {
            console.warn(`Error removing localStorage key "${key}":`, error);
        }
    }, [key, initialValue]);

    return [storedValue, setValue, removeValue];
}

/**
 * Simplified hook for boolean flags
 */
export function useLocalStorageBoolean(
    key: string,
    initialValue: boolean = false
): [boolean, () => void, () => void] {
    const [value, setValue] = useLocalStorage(key, initialValue);

    const setTrue = useCallback(() => setValue(true), [setValue]);
    const setFalse = useCallback(() => setValue(false), [setValue]);

    return [value, setTrue, setFalse];
}
