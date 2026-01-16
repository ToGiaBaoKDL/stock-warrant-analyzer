"""Cache TTL configurations for different data types."""

from enum import IntEnum


class CacheTTL(IntEnum):
    """Cache Time-To-Live values in seconds."""
    
    # Real-time market data (price, volume)
    MARKET_DATA = 10
    
    # Warrant static info (conversion ratio, exercise price)
    WARRANT_INFO = 60
    
    # Warrant list for an underlying stock
    WARRANT_LIST = 30
    
    # Stock list
    STOCK_LIST = 300  # 5 minutes


def get_cache_key(prefix: str, symbol: str) -> str:
    """Generate cache key with prefix and symbol."""
    return f"{prefix}:{symbol.upper()}"


# Cache key prefixes
class CachePrefix:
    MARKET_DATA = "market"
    WARRANT_INFO = "warrant"
    WARRANT_LIST = "warrant_list"
    STOCK_LIST = "stock_list"
