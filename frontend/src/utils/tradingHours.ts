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
 * 
 * Usage: refetchInterval: getRefetchInterval(10000)
 */
export function getRefetchInterval(intervalMs: number): number | false {
    return isMarketOpen() ? intervalMs : false;
}
