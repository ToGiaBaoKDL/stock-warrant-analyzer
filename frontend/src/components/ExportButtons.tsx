"use client";

import React, { useCallback, useState } from "react";
import { Button, Dropdown, message, Tooltip } from "antd";
import { DownloadOutlined, FileImageOutlined, FileExcelOutlined, LoadingOutlined } from "@ant-design/icons";
import type { MenuProps } from "antd";
import { exportToCSV, exportToImage, ExportColumn } from "@/utils/exportUtils";

export interface ExportButtonsProps<T extends Record<string, unknown>> {
    /** Data to export */
    data: T[];
    /** Column definitions for CSV export */
    columns: ExportColumn[];
    /** Base filename for exports */
    filename?: string;
    /** Ref to the element to capture for image export */
    tableRef?: React.RefObject<HTMLDivElement>;
    /** Button size */
    size?: "small" | "middle" | "large";
    /** Show as dropdown or separate buttons */
    mode?: "dropdown" | "buttons";
    /** Disable export when no data */
    disabled?: boolean;
}

/**
 * Reusable Export Buttons component for tables
 * Best practices:
 * - Loading state during export
 * - Disabled when no data
 * - Tooltip for guidance
 * - Error handling with user feedback
 */
export function ExportButtons<T extends Record<string, unknown>>({
    data,
    columns,
    filename = "export",
    tableRef,
    size = "middle",
    mode = "dropdown",
    disabled = false,
}: ExportButtonsProps<T>) {
    const [isExporting, setIsExporting] = useState(false);

    const isDisabled = disabled || !data || data.length === 0;

    const handleExportCSV = useCallback(async () => {
        if (isDisabled) {
            message.warning("Không có dữ liệu để xuất");
            return;
        }

        setIsExporting(true);
        try {
            exportToCSV(data, columns, filename);
            message.success(`Đã xuất ${data.length} dòng ra file CSV`);
        } catch (error) {
            console.error("CSV export error:", error);
            message.error("Lỗi khi xuất CSV. Vui lòng thử lại.");
        } finally {
            setIsExporting(false);
        }
    }, [data, columns, filename, isDisabled]);

    const handleExportImage = useCallback(async () => {
        if (!tableRef?.current) {
            message.warning("Không tìm thấy bảng để chụp ảnh");
            return;
        }

        setIsExporting(true);
        try {
            await exportToImage(tableRef.current, filename);
            message.success("Đã xuất ảnh thành công");
        } catch (error) {
            console.error("Image export error:", error);
            message.error("Lỗi khi xuất ảnh. Vui lòng thử lại.");
        } finally {
            setIsExporting(false);
        }
    }, [tableRef, filename]);

    const menuItems: MenuProps["items"] = [
        {
            key: "csv",
            icon: <FileExcelOutlined />,
            label: `Xuất CSV (${data?.length || 0} dòng)`,
            onClick: handleExportCSV,
            disabled: isDisabled,
        },
        {
            key: "image",
            icon: <FileImageOutlined />,
            label: "Xuất ảnh (PNG)",
            onClick: handleExportImage,
            disabled: !tableRef,
        },
    ];

    if (mode === "buttons") {
        return (
            <div className="flex gap-2">
                <Tooltip title={isDisabled ? "Không có dữ liệu" : `Xuất ${data?.length || 0} dòng ra CSV`}>
                    <Button
                        icon={isExporting ? <LoadingOutlined /> : <FileExcelOutlined />}
                        size={size}
                        onClick={handleExportCSV}
                        disabled={isDisabled || isExporting}
                    >
                        CSV
                    </Button>
                </Tooltip>
                {tableRef && (
                    <Tooltip title="Chụp ảnh bảng dữ liệu">
                        <Button
                            icon={isExporting ? <LoadingOutlined /> : <FileImageOutlined />}
                            size={size}
                            onClick={handleExportImage}
                            disabled={isExporting}
                        >
                            Ảnh
                        </Button>
                    </Tooltip>
                )}
            </div>
        );
    }

    return (
        <Tooltip title={isDisabled ? "Không có dữ liệu để xuất" : undefined}>
            <Dropdown
                menu={{ items: menuItems }}
                placement="bottomRight"
                disabled={isExporting}
            >
                <Button
                    icon={isExporting ? <LoadingOutlined /> : <DownloadOutlined />}
                    size={size}
                    disabled={isDisabled}
                >
                    Xuất
                </Button>
            </Dropdown>
        </Tooltip>
    );
}

export default ExportButtons;
