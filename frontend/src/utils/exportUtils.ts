/**
 * Export Utilities - CSV and Image export functions
 * Best practices implementation with proper formatting
 */

import html2canvas from "html2canvas";

/**
 * Format value for CSV export based on type
 */
function formatValueForCSV(value: unknown, key: string): string {
    if (value === null || value === undefined) return "";

    // Handle numbers - format with proper precision
    if (typeof value === "number") {
        // Price fields - format with commas
        if (key.includes("price") || key === "breakEven" || key === "exercise_price") {
            return value.toLocaleString("vi-VN");
        }
        // Percent fields - format with 2 decimal places
        if (key.includes("percent") || key === "profitMarginPercent") {
            return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
        }
        // Volume fields - format with commas
        if (key.includes("volume") || key === "volume") {
            return value.toLocaleString("vi-VN");
        }
        // Ratio fields - format with 2 decimal places
        if (key.includes("ratio")) {
            return value.toFixed(2);
        }
        // Profit/Loss - format as currency
        if (key.includes("profit") || key.includes("Profit") || key.includes("cost") || key.includes("revenue")) {
            return value.toLocaleString("vi-VN");
        }
        // Default number formatting
        return value.toLocaleString("vi-VN");
    }

    // Handle booleans
    if (typeof value === "boolean") {
        return value ? "Có" : "Không";
    }

    // Handle strings
    if (typeof value === "string") {
        // Escape quotes and wrap in quotes if contains comma, newline, or quotes
        const escaped = value.replace(/"/g, '""');
        if (escaped.includes(",") || escaped.includes("\n") || escaped.includes('"')) {
            return `"${escaped}"`;
        }
        return escaped;
    }

    // Handle dates
    if (value instanceof Date) {
        return value.toLocaleDateString("vi-VN");
    }

    return String(value);
}

/**
 * Export data to CSV and trigger download
 * Best practices:
 * - UTF-8 BOM for Excel compatibility with Vietnamese
 * - Proper value formatting based on data type
 * - Safe filename generation
 */
export function exportToCSV<T extends Record<string, unknown>>(
    data: T[],
    columns: { key: string; title: string }[],
    filename: string = "export"
): void {
    if (!data || data.length === 0) {
        console.warn("No data to export");
        return;
    }

    // Create header row
    const headers = columns.map((col) => `"${col.title}"`).join(",");

    // Create data rows with proper formatting
    const rows = data.map((row) => {
        return columns
            .map((col) => {
                const value = row[col.key];
                return formatValueForCSV(value, col.key);
            })
            .join(",");
    });

    // Combine header and rows
    const csvContent = [headers, ...rows].join("\r\n"); // Use CRLF for Windows compatibility

    // Add BOM for Excel UTF-8 compatibility
    const bom = "\uFEFF";
    const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });

    // Create safe filename
    const safeFilename = filename.replace(/[^a-zA-Z0-9_-]/g, "_");
    const fullFilename = `${safeFilename}_${formatDateForFilename()}.csv`;

    // Create download link
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", fullFilename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up object URL
    setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Export a DOM element to image and trigger download
 * Best practices:
 * - High resolution (2x scale)
 * - White background for readability
 * - CORS handling
 * - PNG format for quality
 */
export async function exportToImage(
    elementRef: HTMLElement | null,
    filename: string = "export"
): Promise<void> {
    if (!elementRef) {
        console.warn("No element to export");
        return;
    }

    try {
        // Clone element to avoid visual artifacts
        const canvas = await html2canvas(elementRef, {
            backgroundColor: "#ffffff",
            scale: 2, // Higher quality (Retina)
            useCORS: true,
            logging: false,
            allowTaint: false,
            removeContainer: true,
            // Capture the full element
            scrollX: 0,
            scrollY: 0,
            windowWidth: elementRef.scrollWidth,
            windowHeight: elementRef.scrollHeight,
        });

        // Create safe filename
        const safeFilename = filename.replace(/[^a-zA-Z0-9_-]/g, "_");
        const fullFilename = `${safeFilename}_${formatDateForFilename()}.png`;

        // Convert to blob for better memory handling
        canvas.toBlob((blob) => {
            if (!blob) {
                console.error("Failed to create image blob");
                return;
            }

            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.download = fullFilename;
            link.href = url;
            link.click();

            // Clean up
            setTimeout(() => URL.revokeObjectURL(url), 100);
        }, "image/png", 1.0);
    } catch (error) {
        console.error("Error exporting to image:", error);
        throw error;
    }
}

/**
 * Format current date for filename
 */
function formatDateForFilename(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hour = String(now.getHours()).padStart(2, "0");
    const minute = String(now.getMinutes()).padStart(2, "0");
    return `${year}${month}${day}_${hour}${minute}`;
}

/**
 * Column definition for export
 */
export interface ExportColumn {
    key: string;
    title: string;
}

/**
 * Get export columns from Ant Design table columns
 */
export function getExportColumnsFromAntd(
    antdColumns: { dataIndex?: string; key?: string; title?: React.ReactNode }[]
): ExportColumn[] {
    return antdColumns
        .filter((col) => col.dataIndex || col.key)
        .map((col) => ({
            key: (col.dataIndex || col.key) as string,
            title: typeof col.title === "string" ? col.title : String(col.key || col.dataIndex),
        }));
}
