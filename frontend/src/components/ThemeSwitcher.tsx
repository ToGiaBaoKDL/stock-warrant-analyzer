"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Button, Tooltip } from "antd";
import { SunOutlined, MoonOutlined } from "@ant-design/icons";

export function ThemeSwitcher() {
    const { resolvedTheme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    // Prevent hydration mismatch
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <div className="w-8 h-8" /> // Placeholder to avoid layout shift
        );
    }

    // Use resolvedTheme to properly handle system theme
    const isDark = resolvedTheme === 'dark';

    // Toggle logic - always toggle between explicit light/dark
    const toggleTheme = () => {
        setTheme(isDark ? 'light' : 'dark');
    };

    return (
        <Tooltip title={isDark ? "Chuyển sang Giao diện sáng" : "Chuyển sang Giao diện tối"}>
            <Button
                type="text"
                shape="circle"
                aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
                icon={isDark ? <SunOutlined className="!text-yellow-400" /> : <MoonOutlined className="!text-gray-200" />}
                onClick={toggleTheme}
                className="flex items-center justify-center border-0 bg-white/10 hover:bg-white/20"
            />
        </Tooltip>
    );
}
