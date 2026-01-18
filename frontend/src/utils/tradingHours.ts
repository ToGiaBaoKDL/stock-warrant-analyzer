/**
 * Trading Hours Utilities
 * Vietnam Stock Exchange (HSX, HNX, UPCOM) operating hours
 */

// Trading hours in UTC+7 (Vietnam timezone)
const MARKET_OPEN_HOUR = 9; // 9:00 AM
const MARKET_CLOSE_HOUR = 15; // 3:00 PM (15:00)
const VIETNAM_TZ = "Asia/Ho_Chi_Minh";

/**
 * Check if current time is within Vietnam stock market trading hours
 * Trading hours: 9:00 AM - 3:00 PM (UTC+7), Monday to Friday
 */
export function isMarketOpen(): boolean {
    const now = new Date();

    // Get Vietnam time
    const vietnamTime = new Date(now.toLocaleString("en-US", { timeZone: VIETNAM_TZ }));

    const dayOfWeek = vietnamTime.getDay();
    const hour = vietnamTime.getHours();

    // Weekend check (0 = Sunday, 6 = Saturday)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        return false;
    }

    // Trading hours check
    return hour >= MARKET_OPEN_HOUR && hour < MARKET_CLOSE_HOUR;
}

/**
 * Get polling interval based on market hours
 * Returns the interval if market is open, false otherwise (disables polling)
 */
export function getPollingInterval(intervalMs: number): number | false {
    return isMarketOpen() ? intervalMs : false;
}

/**
 * Hook-friendly function to get refetchInterval for react-query
 * Usage: refetchInterval: getRefetchInterval(10000)
 */
export function getRefetchInterval(intervalMs: number): number | false {
    return getPollingInterval(intervalMs);
}

/**
 * Get time until market opens (in milliseconds)
 * Returns 0 if market is currently open
 */
export function getTimeUntilMarketOpen(): number {
    if (isMarketOpen()) return 0;

    const now = new Date();
    const vietnamTime = new Date(now.toLocaleString("en-US", { timeZone: VIETNAM_TZ }));

    const hour = vietnamTime.getHours();
    const dayOfWeek = vietnamTime.getDay();

    // If weekend, calculate to Monday 9 AM
    let daysToAdd = 0;
    if (dayOfWeek === 0) daysToAdd = 1; // Sunday -> Monday
    else if (dayOfWeek === 6) daysToAdd = 2; // Saturday -> Monday
    else if (hour >= MARKET_CLOSE_HOUR) daysToAdd = 1; // After hours -> Next day

    const nextOpen = new Date(vietnamTime);
    nextOpen.setDate(nextOpen.getDate() + daysToAdd);
    nextOpen.setHours(MARKET_OPEN_HOUR, 0, 0, 0);

    return nextOpen.getTime() - vietnamTime.getTime();
}

/**
 * Format market status for display
 */
export function getMarketStatusText(): string {
    if (isMarketOpen()) {
        return "Thị trường đang giao dịch";
    }

    const now = new Date();
    const vietnamTime = new Date(now.toLocaleString("en-US", { timeZone: VIETNAM_TZ }));
    const dayOfWeek = vietnamTime.getDay();

    if (dayOfWeek === 0 || dayOfWeek === 6) {
        return "Thị trường nghỉ cuối tuần";
    }

    const hour = vietnamTime.getHours();
    if (hour < MARKET_OPEN_HOUR) {
        return "Chưa đến giờ giao dịch";
    }

    return "Thị trường đã đóng cửa";
}
