"use client";

import React, { useEffect, useState, useMemo } from "react";
import { ConfigProvider, theme as antTheme } from "antd";
import { ThemeProvider as NextThemeProvider, useTheme } from "next-themes";
import { AppColors } from "@/utils/theme";

/**
 * AntDesignThemeSync - Subcomponent to sync next-themes with Ant Design
 * 
 * next-themes handles the 'class="dark"' on the html element.
 * This component listens effectively to that change and updates ConfigProvider.
 */
function AntDesignThemeSync({ children }: { children: React.ReactNode }) {
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    // Prevent hydration mismatch
    useEffect(() => {
        setMounted(true);
    }, []);

    const isDark = resolvedTheme === "dark";

    // Memoize theme config to prevent unnecessary re-renders
    const themeConfig = useMemo(() => ({
        algorithm: isDark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
        token: {
            colorPrimary: AppColors.primary,
            colorSuccess: AppColors.success,
            colorWarning: AppColors.warning,
            colorError: AppColors.error,
            colorInfo: AppColors.info,
            fontFamily: "var(--font-inter)",
            ...(isDark && {
                colorBgBase: "#141414",
                colorBgContainer: "#1f1f1f",
                colorBgElevated: "#2a2a2a",
                colorBorder: "#374151",
            }),
        },
        components: {
            Layout: {
                bodyBg: isDark ? "#121212" : "#F5F4EF",
                headerBg: isDark ? "#1a1a1a" : "#1F2937",
            },
            Card: {
                colorBgContainer: isDark ? "#1f1f1f" : "#ffffff",
                paddingLG: 24,
            },
            Table: {
                headerBg: isDark ? "#2a2a2a" : "#fafaf8",
                headerColor: isDark ? "#e5e7eb" : "#4b5563",
            }
        }
    }), [isDark]);

    if (!mounted) {
        return <>{children}</>;
    }

    return (
        <ConfigProvider theme={themeConfig}>
            {children}
        </ConfigProvider>
    );
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    return (
        <NextThemeProvider 
            attribute="class" 
            defaultTheme="system" 
            enableSystem
            disableTransitionOnChange={false}
            storageKey="theme"
        >
            <AntDesignThemeSync>{children}</AntDesignThemeSync>
        </NextThemeProvider>
    );
}
