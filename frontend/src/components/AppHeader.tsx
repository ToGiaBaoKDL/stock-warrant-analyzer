"use client";

import React from "react";
import Link from "next/link";
import { Layout, Typography, Input } from "antd";
import { ArrowLeftOutlined, StockOutlined, FilterOutlined, LineChartOutlined, FireOutlined } from "@ant-design/icons";

const { Header } = Layout;
const { Title } = Typography;

export interface AppHeaderProps {
    /** Title displayed in header */
    title: string;
    /** Show back button linking to home */
    showBackButton?: boolean;
    /** Icon to show next to title */
    icon?: React.ReactNode;
    /** Additional elements to render in header (e.g., search, nav links) */
    children?: React.ReactNode;
    /** Custom icon background color */
    iconBgColor?: string;
}

/**
 * Shared AppHeader component for consistent header styling across pages
 */
export function AppHeader({
    title,
    showBackButton = true,
    icon,
    children,
    iconBgColor = "#CC785C",
}: AppHeaderProps) {
    return (
        <Header className="h-14" style={{ background: "#191919", padding: 0 }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center h-full">
                {showBackButton && (
                    <Link
                        href="/"
                        className="text-white mr-4 hover:text-[#CC785C] transition-colors"
                    >
                        <ArrowLeftOutlined className="text-lg" />
                    </Link>
                )}

                {icon && (
                    <div
                        className="w-7 h-7 rounded flex items-center justify-center mr-3"
                        style={{ backgroundColor: iconBgColor }}
                    >
                        {icon}
                    </div>
                )}

                <Title level={4} className="!text-white !mb-0 !font-medium flex-shrink-0">
                    {title}
                </Title>

                {/* Additional content (search, nav, etc.) */}
                {children && (
                    <div className="flex-1 flex items-center justify-end gap-4">
                        {children}
                    </div>
                )}
            </div>
        </Header>
    );
}

// Pre-configured header variants
export function WarrantScreenerHeader() {
    return (
        <AppHeader
            title="Warrant Screener"
            icon={<FilterOutlined className="text-white text-sm" />}
        />
    );
}

export function StockAnalysisHeader({
    symbol,
    isWarrant = false,
    nearExpiration = false,
    children,
}: {
    symbol: string;
    isWarrant?: boolean;
    nearExpiration?: boolean;
    children?: React.ReactNode;
}) {
    return (
        <AppHeader
            title={symbol}
            icon={
                isWarrant ? (
                    <FireOutlined className="text-white text-lg" />
                ) : (
                    <LineChartOutlined className="text-white text-lg" />
                )
            }
            iconBgColor={nearExpiration ? "#f97316" : "#CC785C"}
        >
            {children}
        </AppHeader>
    );
}

export default AppHeader;
