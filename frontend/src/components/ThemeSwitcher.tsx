"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Switch, Tooltip } from "antd";
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
            <div className="w-10 h-5" /> // Placeholder to avoid layout shift
        );
    }

    // Use resolvedTheme to properly handle system theme
    const isDark = resolvedTheme === 'dark';

    // Toggle logic - always toggle between explicit light/dark
    const toggleTheme = (checked: boolean) => {
        setTheme(checked ? 'dark' : 'light');
    };

    return (
        <Tooltip title={isDark ? "Giao diện tối" : "Giao diện sáng"}>
            <Switch
                checked={isDark}
                onChange={toggleTheme}
                checkedChildren={<MoonOutlined />}
                unCheckedChildren={<SunOutlined />}
                aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
                className="bg-gray-400"
            />
        </Tooltip>
    );
}
