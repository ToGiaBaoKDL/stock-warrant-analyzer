"""API Dependencies."""

from app.services.cache import cache_service
from app.services.market_data import market_data_service


def get_cache_service():
    """Get cache service instance."""
    return cache_service


def get_market_data_service():
    """Get market data service instance."""
    return market_data_service
