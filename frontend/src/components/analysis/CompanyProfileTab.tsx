"use client";

import React from "react";
import { Card, Descriptions, Spin, Typography, Tag, Divider } from "antd";
import { GlobalOutlined, PhoneOutlined, MailOutlined, EnvironmentOutlined } from "@ant-design/icons";
import { useCompanyProfile } from "@/hooks";

const { Text, Title, Link } = Typography;

// Industry color mapping for Vietnamese sectors
const industryColors: Record<string, string> = {
    "Ngân hàng": "gold",
    "Chứng khoán": "blue",
    "Bất động sản": "volcano",
    "Công nghệ": "cyan",
    "Xây dựng": "orange",
    "Thép": "geekblue",
    "Dầu khí": "purple",
    "Điện": "lime",
    "Bảo hiểm": "green",
    "Dược phẩm": "magenta",
    "Bán lẻ": "red",
    "Thực phẩm": "yellow",
    "Vận tải": "processing",
    "Viễn thông": "cyan",
};

const getIndustryColor = (industry: string): string => {
    // Check for partial matches
    for (const [key, color] of Object.entries(industryColors)) {
        if (industry?.includes(key)) return color;
    }
    return "default";
};

export interface CompanyProfileTabProps {
    /** Stock symbol */
    symbol: string;
}

/**
 * CompanyProfileTab - Displays company basic information
 * 
 * Shows:
 * - Company name, industry
 * - Founding date, listing date
 * - Charter capital, employees
 * - Contact info (address, phone, email, website)
 * - Company description (HTML)
 */
export const CompanyProfileTab = React.memo(function CompanyProfileTab({
    symbol,
}: CompanyProfileTabProps) {
    const { data, isLoading, error } = useCompanyProfile(symbol);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-48">
                <Spin size="large" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <Card className="text-center py-8">
                <Text type="secondary">Không có thông tin công ty</Text>
            </Card>
        );
    }

    // Format charter capital
    const charterCapitalBillion = Number(data.charterCapital) / 1e9;

    return (
        <Card variant="borderless" className="h-full overflow-auto">
            {/* Header */}
            <div className="mb-4">
                <Title level={4} style={{ margin: 0 }}>
                    {data.companyName}
                </Title>
                <div className="flex gap-2 mt-2 flex-wrap">
                    <Tag color="blue">{data.exchange}</Tag>
                    <Tag color={getIndustryColor(data.industryName)}>{data.industryName}</Tag>
                    {data.sector && data.sector !== data.industryName && (
                        <Tag color="default">{data.sector}</Tag>
                    )}
                </div>
            </div>

            <Divider />

            {/* Basic Info */}
            <Descriptions column={1} size="small" className="mb-4">
                <Descriptions.Item label="Mã chứng khoán">
                    <Text strong>{data.symbol}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Ngành">
                    {data.sector}
                </Descriptions.Item>
                <Descriptions.Item label="Ngày thành lập">
                    {data.foundingDate}
                </Descriptions.Item>
                <Descriptions.Item label="Ngày niêm yết">
                    {data.listingDate}
                </Descriptions.Item>
                <Descriptions.Item label="Vốn điều lệ">
                    <Text strong>{charterCapitalBillion.toLocaleString()} tỷ VND</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Số nhân viên">
                    {data.numberOfEmployee?.toLocaleString()}
                </Descriptions.Item>
                <Descriptions.Item label="KL phát hành">
                    {Number(data.issueShare).toLocaleString()} CP
                </Descriptions.Item>
                <Descriptions.Item label="Free Float">
                    {(Number(data.freeFloatRate) * 100).toFixed(1)}%
                </Descriptions.Item>
            </Descriptions>

            <Divider />

            {/* Contact Info */}
            <div className="mb-4">
                <Text strong className="text-gray-600 dark:text-gray-300 mb-2 block">Thông tin liên hệ</Text>
                <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                        <EnvironmentOutlined className="text-gray-400 mt-1" />
                        <Text>{data.address}</Text>
                    </div>
                    {data.telephone && (
                        <div className="flex items-center gap-2">
                            <PhoneOutlined className="text-gray-400" />
                            <Text>{data.telephone}</Text>
                        </div>
                    )}
                    {data.email && (
                        <div className="flex items-center gap-2">
                            <MailOutlined className="text-gray-400" />
                            <Link href={`mailto:${data.email}`} className="!text-blue-600 dark:!text-blue-400 hover:underline">{data.email}</Link>
                        </div>
                    )}
                    {data.website && (
                        <div className="flex items-center gap-2">
                            <GlobalOutlined className="text-gray-400" />
                            <Link href={data.website} target="_blank" className="!text-blue-600 dark:!text-blue-400 hover:underline">{data.website}</Link>
                        </div>
                    )}
                </div>
            </div>

            <Divider />

            {/* Company Description */}
            <div>
                <Text strong className="text-gray-600 dark:text-gray-300 mb-2 block">Giới thiệu</Text>
                <div
                    className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: data.companyProfile || "Chưa có thông tin" }}
                />
            </div>
        </Card>
    );
});

export default CompanyProfileTab;
