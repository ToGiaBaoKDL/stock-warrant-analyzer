/**
 * Chart Types and Interfaces
 */

export interface CrosshairData {
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    change: number;
    changePercent: number;
}

export const TIME_OFFSET = 7 * 60 * 60; // Vietnam timezone offset
