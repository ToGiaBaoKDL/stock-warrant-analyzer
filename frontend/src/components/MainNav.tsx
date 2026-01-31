"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Layout } from "antd";
import { AppColors } from "@/utils/theme";
import { ThemeSwitcher } from "./ThemeSwitcher";
import {
    HomeOutlined,
    FilterOutlined,
    CalculatorOutlined,
    FireOutlined
} from "@ant-design/icons";

const { Header } = Layout;

// Navigation items
const navItems = [
    { href: "/", label: "Tổng quan", icon: <HomeOutlined /> },
    { href: "/warrants", label: "CW Screener", icon: <FilterOutlined /> },
    { href: "/analysis", label: "What-if", icon: <CalculatorOutlined /> },
];

export interface MainNavProps {
    /** Additional elements to render on right side */
    children?: React.ReactNode;
}

/**
 * Unified MainNav component for all pages
 * Shows logo, navigation tabs
 */
export function MainNav({
    children,
}: MainNavProps) {
    const pathname = usePathname();

    return (
        <Header
            className="sticky top-0 z-50 flex items-center px-4 sm:px-6 lg:px-8 h-14 shadow-lg border-b border-white/10"
            style={{ background: "var(--gradient-header)" }}
        >
            <div className="max-w-7xl mx-auto w-full flex items-center">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2.5 mr-8 shrink-0 group">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-md group-hover:scale-105 transition-transform" style={{ background: "var(--gradient-primary)" }}>
                        <FireOutlined className="!text-white text-base" />
                    </div>
                    <div className="hidden sm:flex flex-col">
                        <span className="text-gray-900 dark:text-white font-semibold text-sm leading-tight">Stock & CW</span>
                        <span className="text-gray-500 dark:text-white/50 text-[10px] leading-tight">Analyzer</span>
                    </div>
                </Link>

                {/* Navigation tabs */}
                <nav className="flex items-center gap-0.5 bg-white/90 dark:bg-gray-800/90 rounded-lg p-1 shadow-sm dark:shadow-gray-900/20">
                    {navItems.map((item) => {
                        // Normalize paths for comparison
                        const currentPath = pathname || "";
                        const itemPath = item.href;

                        // Strict check for Home, otherwise startsWith
                        const isActive = itemPath === "/"
                            ? currentPath === "/"
                            : currentPath.startsWith(itemPath);

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`px-4 py-2 rounded-md text-sm transition-all flex items-center gap-2 whitespace-nowrap ${isActive
                                    ? "!text-white font-bold shadow-sm"
                                    : "!text-gray-600 dark:!text-gray-300 hover:!text-gray-900 dark:hover:!text-white hover:bg-gray-200 dark:hover:bg-gray-700 font-medium"
                                    }`}
                                style={isActive ? { backgroundColor: AppColors.primary } : undefined}
                            >
                                {item.icon}
                                <span className="hidden sm:inline">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Theme Switcher */}
                <div className="mr-2">
                    <ThemeSwitcher />
                </div>

                {/* Right side content */}
                {children && (
                    <div className="flex items-center gap-2">
                        {children}
                    </div>
                )}
            </div>
        </Header>
    );
}

export default MainNav;

