"""
SSI iBoard Query API Client

This module provides a clean interface to SSI iBoard public API.
Features:
- Stock data for HOSE, HNX, UPCOM exchanges
- Covered Warrants with full details
- No authentication required (browser headers only)
- In-memory caching with TTL (10-30s)
- Automatic retry with exponential backoff
- Circuit breaker for resilience
- Parallel fetching for improved performance
"""

import asyncio
import logging
import time
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
import httpx

from app.core.resilience import get_cache, get_iboard_circuit, with_retry, CircuitBreakerOpenError

logger = logging.getLogger(__name__)


# =============================================================================
# Cache TTL Configuration
# =============================================================================

class CacheTTL:
    """Cache TTL values in seconds."""
    STOCK_LIST = 15       # Stock list per exchange
    WARRANT_LIST = 15     # Warrant list per exchange
    ALL_STOCKS = 20       # Combined all stocks
    ALL_WARRANTS = 20     # Combined all warrants
    SINGLE_STOCK = 10     # Single stock lookup


# =============================================================================
# Import Schemas (reuse API response models)
# =============================================================================

from app.schemas.stock import StockItem
from app.schemas.warrant import WarrantItem, UnderlyingInfo


# =============================================================================
# iBoard Client
# =============================================================================

class IboardClient:
    """
    SSI iBoard Query API Client with resilience patterns.
    
    Features:
    - In-memory caching with TTL
    - Retry with exponential backoff
    - Circuit breaker for external API protection
    - Parallel fetching for multiple exchanges
    
    Usage:
        client = IboardClient()
        stocks = await client.get_stocks("hose")
        warrants = await client.get_warrants("hose")
    """
    
    BASE_URL = "https://iboard-query.ssi.com.vn"
    VALID_EXCHANGES = ["hose", "hnx", "upcom"]
    WARRANT_EXCHANGES = ["hose", "hnx"]
    
    def __init__(self, timeout: float = 15.0):
        self._timeout = timeout
        self._client: Optional[httpx.AsyncClient] = None
        self._cache = get_cache()
        self._circuit = get_iboard_circuit()
    
    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create async HTTP client."""
        if self._client is None or self._client.is_closed:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "application/json, text/plain, */*",
                "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
                "Accept-Encoding": "gzip, deflate",
                "Origin": "https://iboard.ssi.com.vn",
                "Referer": "https://iboard.ssi.com.vn/",
                "sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": '"Windows"',
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-site",
                "Connection": "keep-alive",
                "DNT": "1",
            }
            self._client = httpx.AsyncClient(
                base_url=self.BASE_URL,
                timeout=self._timeout,
                headers=headers,
                follow_redirects=True,
            )
        return self._client
    
    async def close(self):
        """Close the HTTP client."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()
            self._client = None
    
    # -------------------------------------------------------------------------
    # Helper methods
    # -------------------------------------------------------------------------
    
    @staticmethod
    def _parse_ratio(ratio_str: str) -> float:
        """Parse '1.6712:1' -> 1.6712"""
        if not ratio_str:
            return 1.0
        if ':' in str(ratio_str):
            try:
                return float(ratio_str.split(':')[0])
            except (ValueError, IndexError):
                return 1.0
        try:
            return float(ratio_str)
        except ValueError:
            return 1.0
    
    @staticmethod
    def _parse_date_ddmmyyyy(date_str: str) -> tuple[str, int]:
        """Parse 'DD/MM/YYYY' -> (ISO date string, days_to_maturity)"""
        if not date_str:
            return "", -1
        try:
            mat_date = datetime.strptime(date_str, '%d/%m/%Y')
            days = (mat_date - datetime.now()).days
            return mat_date.strftime('%Y-%m-%d'), max(days, 0)
        except (ValueError, TypeError):
            return "", -1
    
    @staticmethod
    def _parse_date_yyyymmdd(date_str: str) -> str:
        """Parse 'YYYYMMDD' -> 'YYYY-MM-DD'"""
        if not date_str or len(str(date_str)) != 8:
            return ""
        try:
            date_str = str(date_str)
            return f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]}"
        except (ValueError, TypeError):
            return ""
    
    @staticmethod
    def _safe_float(value: Any, default: float = 0.0) -> float:
        """Safely convert value to float."""
        if value is None:
            return default
        try:
            return float(value)
        except (ValueError, TypeError):
            return default
    
    @staticmethod
    def _safe_int(value: Any, default: int = 0) -> int:
        """Safely convert value to int."""
        if value is None:
            return default
        try:
            return int(value)
        except (ValueError, TypeError):
            return default
    
    # -------------------------------------------------------------------------
    # Stock APIs
    # -------------------------------------------------------------------------
    
    async def get_stocks(self, exchange: str = "hose") -> List[StockItem]:
        """
        Get all stocks for an exchange with caching and resilience.
        
        Args:
            exchange: Exchange code (hose, hnx, upcom)
            
        Returns:
            List of StockItem objects
        """
        exchange = exchange.lower()
        if exchange not in self.VALID_EXCHANGES:
            raise ValueError(f"Invalid exchange: {exchange}. Must be one of {self.VALID_EXCHANGES}")
        
        cache_key = f"stocks:{exchange}"
        
        # Check cache first
        cached = await self._cache.get(cache_key)
        if cached is not None:
            logger.debug(f"[Cache HIT] stocks:{exchange}")
            return cached
        
        logger.debug(f"[Cache MISS] stocks:{exchange}")
        
        # Fetch from API with circuit breaker
        stocks = await self._fetch_stocks_from_api(exchange)
        
        # Store in cache
        await self._cache.set(cache_key, stocks, CacheTTL.STOCK_LIST)
        
        return stocks
    
    async def _fetch_stocks_from_api(self, exchange: str) -> List[StockItem]:
        """Internal method to fetch stocks from iBoard API with retry and circuit breaker."""
        
        @with_retry(max_retries=3, base_delay=0.5, max_delay=5.0, exceptions=(httpx.HTTPError, Exception))
        async def _do_fetch():
            client = await self._get_client()
            response = await client.get(f"/stock/exchange/{exchange}", params={"boardId": "MAIN"})
            response.raise_for_status()
            return response.json()
        
        try:
            data = await self._circuit.call(_do_fetch)
        except CircuitBreakerOpenError:
            logger.warning(f"[CircuitBreaker] Circuit open, cannot fetch stocks from {exchange}")
            raise
        
        if data.get('code') != 'SUCCESS':
            logger.error(f"iBoard API error: {data.get('message')}")
            raise Exception(f"iBoard API error: {data.get('message')}")
        
        stocks = []
        start_time = time.time()
        
        for s in data.get('data', []):
            stock = StockItem(
                symbol=s.get('stockSymbol', ''),
                name=s.get('companyNameVi', '') or s.get('clientName', ''),
                name_en=s.get('companyNameEn', '') or s.get('clientNameEn', ''),
                exchange=s.get('exchange', exchange).upper(),
                board_id=s.get('boardId', 'MAIN'),
                
                current_price=self._safe_float(s.get('matchedPrice')) or self._safe_float(s.get('refPrice')),
                ref_price=self._safe_float(s.get('refPrice')),
                ceiling=self._safe_float(s.get('ceiling')),
                floor=self._safe_float(s.get('floor')),
                open_price=self._safe_float(s.get('openPrice')),
                high_price=self._safe_float(s.get('highest')),
                low_price=self._safe_float(s.get('lowest')),
                avg_price=self._safe_float(s.get('avgPrice')),
                
                change=self._safe_float(s.get('priceChange')),
                change_percent=self._safe_float(s.get('priceChangePercent')),
                
                volume=self._safe_int(s.get('nmTotalTradedQty')),
                value=self._safe_float(s.get('nmTotalTradedValue')),
                
                bid1_price=self._safe_float(s.get('best1Bid')),
                bid1_vol=self._safe_int(s.get('best1BidVol')),
                bid2_price=self._safe_float(s.get('best2Bid')),
                bid2_vol=self._safe_int(s.get('best2BidVol')),
                bid3_price=self._safe_float(s.get('best3Bid')),
                bid3_vol=self._safe_int(s.get('best3BidVol')),
                ask1_price=self._safe_float(s.get('best1Offer')),
                ask1_vol=self._safe_int(s.get('best1OfferVol')),
                ask2_price=self._safe_float(s.get('best2Offer')),
                ask2_vol=self._safe_int(s.get('best2OfferVol')),
                ask3_price=self._safe_float(s.get('best3Offer')),
                ask3_vol=self._safe_int(s.get('best3OfferVol')),
                
                foreign_buy_vol=self._safe_int(s.get('buyForeignQtty')),
                foreign_sell_vol=self._safe_int(s.get('sellForeignQtty')),
                foreign_remain=self._safe_int(s.get('remainForeignQtty')),
                
                session=s.get('session', ''),
                trading_date=self._parse_date_yyyymmdd(s.get('tradingDate', '')),
            )
            stocks.append(stock)
        
        elapsed = (time.time() - start_time) * 1000
        logger.info(f"[API] Fetched {len(stocks)} stocks from {exchange.upper()} in {elapsed:.0f}ms")
        
        return stocks
    
    async def get_stock_by_symbol(self, symbol: str) -> Optional[StockItem]:
        """
        Get a single stock by symbol.
        Uses cache from get_all_stocks for efficiency.
        """
        symbol = symbol.upper()
        
        # Try each exchange (uses cache)
        for exchange in self.VALID_EXCHANGES:
            try:
                stocks = await self.get_stocks(exchange)
                for stock in stocks:
                    if stock.symbol == symbol:
                        return stock
            except Exception as e:
                logger.warning(f"Error fetching from {exchange}: {e}")
                continue
        
        return None
    
    async def get_all_stocks(self) -> List[StockItem]:
        """
        Get stocks from all exchanges using parallel fetching.
        
        Performance improvement: ~3x faster than sequential fetching.
        """
        cache_key = "stocks:all"
        
        # Check cache first
        cached = await self._cache.get(cache_key)
        if cached is not None:
            logger.debug("[Cache HIT] stocks:all")
            return cached
        
        logger.debug("[Cache MISS] stocks:all - fetching in parallel")
        start_time = time.time()
        
        # Parallel fetch from all exchanges
        results = await asyncio.gather(
            self.get_stocks("hose"),
            self.get_stocks("hnx"),
            self.get_stocks("upcom"),
            return_exceptions=True
        )
        
        all_stocks = []
        for i, result in enumerate(results):
            exchange = self.VALID_EXCHANGES[i]
            if isinstance(result, Exception):
                logger.error(f"Error fetching stocks from {exchange}: {result}")
            else:
                all_stocks.extend(result)
        
        elapsed = (time.time() - start_time) * 1000
        logger.info(f"[Parallel] Fetched {len(all_stocks)} total stocks in {elapsed:.0f}ms")
        
        # Cache combined result
        await self._cache.set(cache_key, all_stocks, CacheTTL.ALL_STOCKS)
        
        return all_stocks
    
    async def get_vn30_stocks(self) -> List[StockItem]:
        """
        Get VN30 index stocks from iBoard API.
        
        Returns:
            List of StockItem for the 30 VN30 stocks
        """
        cache_key = "stocks:vn30"
        
        # Check cache first
        cached = await self._cache.get(cache_key)
        if cached is not None:
            logger.debug("[Cache HIT] stocks:vn30")
            return cached
        
        logger.debug("[Cache MISS] stocks:vn30")
        
        # Fetch from API with circuit breaker
        stocks = await self._fetch_vn30_from_api()
        
        # Store in cache
        await self._cache.set(cache_key, stocks, CacheTTL.STOCK_LIST)
        
        return stocks
    
    async def _fetch_vn30_from_api(self) -> List[StockItem]:
        """Internal method to fetch VN30 stocks from iBoard API."""
        
        @with_retry(max_retries=3, base_delay=0.5, max_delay=5.0, exceptions=(httpx.HTTPError, Exception))
        async def _do_fetch():
            client = await self._get_client()
            response = await client.get("/stock/group/VN30")
            response.raise_for_status()
            return response.json()
        
        try:
            data = await self._circuit.call(_do_fetch)
        except CircuitBreakerOpenError:
            logger.warning("[CircuitBreaker] Circuit open, cannot fetch VN30 stocks")
            raise
        
        if data.get('code') != 'SUCCESS':
            logger.error(f"iBoard API error: {data.get('message')}")
            raise Exception(f"iBoard API error: {data.get('message')}")
        
        stocks = []
        start_time = time.time()
        
        for s in data.get('data', []):
            stock = StockItem(
                symbol=s.get('stockSymbol', ''),
                name=s.get('companyNameVi', '') or s.get('clientName', ''),
                name_en=s.get('companyNameEn', '') or s.get('clientNameEn', ''),
                exchange='HOSE',  # VN30 stocks are all from HOSE
                board_id=s.get('boardId', 'MAIN'),
                
                current_price=self._safe_float(s.get('matchedPrice')) or self._safe_float(s.get('refPrice')),
                ref_price=self._safe_float(s.get('refPrice')),
                ceiling=self._safe_float(s.get('ceiling')),
                floor=self._safe_float(s.get('floor')),
                open_price=self._safe_float(s.get('openPrice')),
                high_price=self._safe_float(s.get('highest')),
                low_price=self._safe_float(s.get('lowest')),
                avg_price=self._safe_float(s.get('avgPrice')),
                
                change=self._safe_float(s.get('priceChange')),
                change_percent=self._safe_float(s.get('priceChangePercent')),
                
                volume=self._safe_int(s.get('nmTotalTradedQty')),
                value=self._safe_float(s.get('nmTotalTradedValue')),
                
                bid1_price=self._safe_float(s.get('best1Bid')),
                bid1_vol=self._safe_int(s.get('best1BidVol')),
                bid2_price=self._safe_float(s.get('best2Bid')),
                bid2_vol=self._safe_int(s.get('best2BidVol')),
                bid3_price=self._safe_float(s.get('best3Bid')),
                bid3_vol=self._safe_int(s.get('best3BidVol')),
                ask1_price=self._safe_float(s.get('best1Offer')),
                ask1_vol=self._safe_int(s.get('best1OfferVol')),
                ask2_price=self._safe_float(s.get('best2Offer')),
                ask2_vol=self._safe_int(s.get('best2OfferVol')),
                ask3_price=self._safe_float(s.get('best3Offer')),
                ask3_vol=self._safe_int(s.get('best3OfferVol')),
                
                foreign_buy_vol=self._safe_int(s.get('buyForeignQtty')),
                foreign_sell_vol=self._safe_int(s.get('sellForeignQtty')),
                foreign_remain=self._safe_int(s.get('remainForeignQtty')),
                
                session=s.get('session', ''),
                trading_date=self._parse_date_yyyymmdd(s.get('tradingDate', '')),
            )
            stocks.append(stock)
        
        elapsed = (time.time() - start_time) * 1000
        logger.info(f"[API] Fetched {len(stocks)} VN30 stocks in {elapsed:.0f}ms")
        
        return stocks
    
    # -------------------------------------------------------------------------
    # Warrant APIs
    # -------------------------------------------------------------------------
    
    async def get_warrants(self, exchange: str = "hose") -> Dict[str, Any]:
        """
        Get all warrants and underlying stock prices for an exchange.
        
        Args:
            exchange: Exchange code (hose, hnx)
            
        Returns:
            Dict with 'warrants' list and 'underlying' dict
        """
        exchange = exchange.lower()
        if exchange not in self.WARRANT_EXCHANGES:
            raise ValueError(f"Invalid exchange for warrants: {exchange}. Must be hose or hnx")
        
        cache_key = f"warrants:{exchange}"
        
        # Check cache first
        cached = await self._cache.get(cache_key)
        if cached is not None:
            logger.debug(f"[Cache HIT] warrants:{exchange}")
            return cached
        
        logger.debug(f"[Cache MISS] warrants:{exchange}")
        
        # Fetch from API
        result = await self._fetch_warrants_from_api(exchange)
        
        # Store in cache
        await self._cache.set(cache_key, result, CacheTTL.WARRANT_LIST)
        
        return result
    
    async def _fetch_warrants_from_api(self, exchange: str) -> Dict[str, Any]:
        """Internal method to fetch warrants from iBoard API with retry and circuit breaker."""
        
        @with_retry(max_retries=3, base_delay=0.5, max_delay=5.0, exceptions=(httpx.HTTPError, Exception))
        async def _do_fetch():
            client = await self._get_client()
            response = await client.get(f"/stock/cw/{exchange}")
            response.raise_for_status()
            return response.json()
        
        try:
            data = await self._circuit.call(_do_fetch)
        except CircuitBreakerOpenError:
            logger.warning(f"[CircuitBreaker] Circuit open, cannot fetch warrants from {exchange}")
            raise
        
        if data.get('code') != 'SUCCESS':
            logger.error(f"iBoard API error: {data.get('message')}")
            raise Exception(f"iBoard API error: {data.get('message')}")
        
        raw_data = data.get('data', {})
        start_time = time.time()
        
        # Parse warrants
        warrants = []
        for w in raw_data.get('coveredWarrantData', []):
            mat_date, days = self._parse_date_ddmmyyyy(w.get('maturityDate', ''))
            exercise_ratio = self._parse_ratio(w.get('exerciseRatio', '1:1'))
            
            warrant = WarrantItem(
                symbol=w.get('stockSymbol', ''),
                underlying_symbol=w.get('underlyingSymbol', ''),
                issuer_name=w.get('issuerName', ''),
                warrant_type=w.get('coveredWarrantType', 'C'),
                
                current_price=self._safe_float(w.get('matchedPrice')) or self._safe_float(w.get('refPrice')),
                ref_price=self._safe_float(w.get('refPrice')),
                ceiling=self._safe_float(w.get('ceiling')),
                floor=self._safe_float(w.get('floor')),
                open_price=self._safe_float(w.get('openPrice')),
                high_price=self._safe_float(w.get('highest')),
                low_price=self._safe_float(w.get('lowest')),
                avg_price=self._safe_float(w.get('avgPrice')),
                
                change=self._safe_float(w.get('priceChange')),
                change_percent=self._safe_float(w.get('priceChangePercent')),
                
                volume=self._safe_int(w.get('nmTotalTradedQty')),
                value=self._safe_float(w.get('nmTotalTradedValue')),
                
                exercise_price=self._safe_float(w.get('exercisePrice')),
                exercise_ratio=exercise_ratio,
                conversion_ratio=exercise_ratio,  # Frontend uses this name
                maturity_date=mat_date,
                last_trading_date=self._parse_date_yyyymmdd(w.get('lastTradingDate', '')),
                days_to_maturity=days,
                
                bid1_price=self._safe_float(w.get('best1Bid')),
                bid1_vol=self._safe_int(w.get('best1BidVol')),
                bid2_price=self._safe_float(w.get('best2Bid')),
                bid2_vol=self._safe_int(w.get('best2BidVol')),
                bid3_price=self._safe_float(w.get('best3Bid')),
                bid3_vol=self._safe_int(w.get('best3BidVol')),
                ask1_price=self._safe_float(w.get('best1Offer')),
                ask1_vol=self._safe_int(w.get('best1OfferVol')),
                ask2_price=self._safe_float(w.get('best2Offer')),
                ask2_vol=self._safe_int(w.get('best2OfferVol')),
                ask3_price=self._safe_float(w.get('best3Offer')),
                ask3_vol=self._safe_int(w.get('best3OfferVol')),
                
                foreign_remain=self._safe_int(w.get('remainForeignQtty')),
                
                session=w.get('session', ''),
                trading_date=self._parse_date_yyyymmdd(w.get('tradingDate', '')),
            )
            warrants.append(warrant)
        
        # Parse underlying stocks
        underlying = {}
        for u in raw_data.get('underlyingData', []):
            symbol = u.get('stockSymbol', '')
            if symbol:
                underlying[symbol] = UnderlyingInfo(
                    symbol=symbol,
                    current_price=self._safe_float(u.get('matchedPrice')) or self._safe_float(u.get('refPrice')),
                    ref_price=self._safe_float(u.get('refPrice')),
                    ceiling=self._safe_float(u.get('ceiling')),
                    floor=self._safe_float(u.get('floor')),
                    change=self._safe_float(u.get('priceChange')),
                    change_percent=self._safe_float(u.get('priceChangePercent')),
                )
        
        elapsed = (time.time() - start_time) * 1000
        logger.info(f"[API] Fetched {len(warrants)} warrants from {exchange.upper()} in {elapsed:.0f}ms")
        
        return {
            'warrants': warrants,
            'underlying': underlying,
        }
    
    async def get_all_warrants(self) -> Dict[str, Any]:
        """
        Get warrants from all exchanges (HOSE + HNX) using parallel fetching.
        
        Performance improvement: ~2x faster than sequential fetching.
        """
        cache_key = "warrants:all"
        
        # Check cache first
        cached = await self._cache.get(cache_key)
        if cached is not None:
            logger.debug("[Cache HIT] warrants:all")
            return cached
        
        logger.debug("[Cache MISS] warrants:all - fetching in parallel")
        start_time = time.time()
        
        # Parallel fetch from HOSE and HNX
        results = await asyncio.gather(
            self.get_warrants("hose"),
            self.get_warrants("hnx"),
            return_exceptions=True
        )
        
        all_warrants = []
        all_underlying = {}
        
        for i, result in enumerate(results):
            exchange = self.WARRANT_EXCHANGES[i]
            if isinstance(result, Exception):
                logger.error(f"Error fetching warrants from {exchange}: {result}")
            else:
                all_warrants.extend(result['warrants'])
                all_underlying.update(result['underlying'])
        
        elapsed = (time.time() - start_time) * 1000
        logger.info(f"[Parallel] Fetched {len(all_warrants)} total warrants in {elapsed:.0f}ms")
        
        combined = {
            'warrants': all_warrants,
            'underlying': all_underlying,
        }
        
        # Cache combined result
        await self._cache.set(cache_key, combined, CacheTTL.ALL_WARRANTS)
        
        return combined
    
    async def get_warrants_by_underlying(self, underlying_symbol: str) -> Dict[str, Any]:
        """
        Get warrants for a specific underlying stock.
        Uses cached get_all_warrants for efficiency.
        """
        underlying_symbol = underlying_symbol.upper()
        
        data = await self.get_all_warrants()
        
        filtered_warrants = [
            w for w in data['warrants']
            if w.underlying_symbol == underlying_symbol
        ]
        
        underlying_info = data['underlying'].get(underlying_symbol)
        
        return {
            'warrants': filtered_warrants,
            'underlying_symbol': underlying_symbol,
            'underlying_price': underlying_info.current_price if underlying_info else 0,
            'underlying_change': underlying_info.change if underlying_info else 0,
            'underlying_change_percent': underlying_info.change_percent if underlying_info else 0,
            'underlying_info': underlying_info,
        }
    
    async def get_warrant_by_symbol(self, symbol: str) -> Optional[Dict[str, Any]]:
        """
        Get a single warrant by symbol with its underlying info.
        Uses cached get_all_warrants for efficiency.
        """
        symbol = symbol.upper()
        
        data = await self.get_all_warrants()
        
        for warrant in data['warrants']:
            if warrant.symbol == symbol:
                underlying_info = data['underlying'].get(warrant.underlying_symbol)
                return {
                    'warrant': warrant,
                    'underlying_symbol': warrant.underlying_symbol,
                    'underlying_price': underlying_info.current_price if underlying_info else 0,
                    'underlying_info': underlying_info,
                }
        
        return None
    
    # -------------------------------------------------------------------------
    # Chart History API
    # -------------------------------------------------------------------------
    
    async def get_chart_history(
        self, 
        symbol: str, 
        resolution: str = "1",
        from_ts: Optional[int] = None,
        to_ts: Optional[int] = None,
        days: Optional[int] = None  # If None, uses smart default based on resolution
    ) -> Optional[Dict]:
        """
        Get price history (OHLCV) from SSI statistics API.
        
        Supports multiple resolutions for different use cases:
        - "1"  : 1-minute bars (intraday, ~30 days available)
        - "5"  : 5-minute bars (intraday, ~30 days available)
        - "15" : 15-minute bars (intraday, ~30 days available)
        - "30" : 30-minute bars (intraday, ~30 days available)
        - "60" : 1-hour bars (intraday, ~30 days available)
        - "1D" : Daily bars (full history)
        
        Smart defaults for 'days' based on resolution:
        - 1-minute: 3 days (~450 points during trading hours)
        - 5-minute: 5 days (~100 points)
        - 15-minute: 7 days (~70 points)
        - 30-minute: 14 days (~70 points)
        - 1-hour: 14 days (~50 points)
        - 1D: 30 days (~20 points)
        
        Args:
            symbol: Stock or warrant symbol (e.g., "ACB", "CACB2331")
            resolution: Timeframe ("1", "5", "15", "30", "60", "1D")
            from_ts: Start Unix timestamp (optional)
            to_ts: End Unix timestamp (optional, defaults to now)
            days: Number of days to fetch (optional, uses smart default if None)
            
        Returns:
            Dict with keys: t (timestamps), o, h, l, c, v
            Or None if failed
        """
        import time
        
        # Smart default days based on resolution
        default_days = {
            "1": 3,     # 1-minute: 3 days (~450 points)
            "5": 5,     # 5-minute: 5 days (~100 points)
            "15": 7,    # 15-minute: 7 days (~70 points)
            "30": 14,   # 30-minute: 14 days (~70 points)
            "60": 14,   # 1-hour: 14 days (~50 points)
            "1D": 30,   # Daily: 30 days (~20 points)
        }
        
        if days is None:
            days = default_days.get(resolution, 14)
        
        # Calculate default time range
        now = int(time.time())
        if to_ts is None:
            to_ts = now
        if from_ts is None:
            from_ts = to_ts - (days * 24 * 60 * 60)
        
        cache_key = f"chart_history:{symbol}:{resolution}:{from_ts}:{to_ts}"
        cached = await self._cache.get(cache_key)
        if cached is not None:
            return cached
        
        # Use the statistics API endpoint (different base URL)
        statistics_url = f"https://iboard-api.ssi.com.vn/statistics/charts/history"
        params = {
            "symbol": symbol.upper(),
            "resolution": resolution,
            "from": from_ts,
            "to": to_ts
        }
        
        try:
            # Use a separate client for the statistics API (different domain)
            async with httpx.AsyncClient(
                timeout=self._timeout,
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Accept": "application/json",
                    "Origin": "https://iboard.ssi.com.vn",
                    "Referer": "https://iboard.ssi.com.vn/",
                }
            ) as stats_client:
                response = await stats_client.get(
                    statistics_url,
                    params=params,
                )
                response.raise_for_status()
                json_response = response.json()
                
                # SSI returns nested structure: { "data": { "s": "ok", "t": [], ... } }
                data = json_response.get("data", json_response)
                
                if data.get("s") == "ok":
                    result = {
                        "t": data.get("t", []),
                        "o": data.get("o", []),
                        "h": data.get("h", []),
                        "l": data.get("l", []),
                        "c": data.get("c", []),
                        "v": data.get("v", []),
                    }
                    # Cache for 10 minutes
                    await self._cache.set(cache_key, result, ttl_seconds=600)
                    return result
                else:
                    logger.warning(f"No data for {symbol}: {data.get('s')}")
                    return None
                
        except Exception as e:
            logger.error(f"Error fetching chart history for {symbol}: {e}")
            return None
    
    # -------------------------------------------------------------------------
    # Company Statistics APIs
    # -------------------------------------------------------------------------
    
    async def get_company_profile(self, symbol: str) -> Optional[Dict]:
        """Get company profile information.
        
        Cache: 1 hour (static data, rarely changes)
        """
        cache_key = f"company_profile:{symbol.upper()}"
        cached = await self._cache.get(cache_key)
        if cached is not None:
            return cached
        
        url = "https://iboard-api.ssi.com.vn/statistics/company/ssmi/company-profile"
        params = {"symbol": symbol.upper(), "language": "vn"}
        
        try:
            async with httpx.AsyncClient(timeout=self._timeout, headers={
                "User-Agent": "Mozilla/5.0",
                "Accept": "application/json",
                "Origin": "https://iboard.ssi.com.vn",
            }) as client:
                response = await client.get(url, params=params)
                if response.status_code == 200:
                    json_resp = response.json()
                    if json_resp.get("code") == "SUCCESS":
                        data = json_resp.get("data")
                        await self._cache.set(cache_key, data, ttl_seconds=3600)  # 1 hour
                        return data
        except Exception as e:
            logger.error(f"Error fetching company profile for {symbol}: {e}")
        return None
    
    async def get_sub_companies(self, symbol: str) -> Optional[List[Dict]]:
        """Get list of subsidiaries and affiliated companies.
        
        Cache: 1 hour
        """
        cache_key = f"sub_companies:{symbol.upper()}"
        cached = await self._cache.get(cache_key)
        if cached is not None:
            return cached
        
        url = "https://iboard-api.ssi.com.vn/statistics/company/ssmi/sub-companies"
        params = {"symbol": symbol.upper(), "language": "vn", "page": 1, "pageSize": 1000}
        
        try:
            async with httpx.AsyncClient(timeout=self._timeout, headers={
                "User-Agent": "Mozilla/5.0",
                "Accept": "application/json",
                "Origin": "https://iboard.ssi.com.vn",
            }) as client:
                response = await client.get(url, params=params)
                if response.status_code == 200:
                    json_resp = response.json()
                    if json_resp.get("code") == "SUCCESS":
                        data = json_resp.get("data", [])
                        await self._cache.set(cache_key, data, ttl_seconds=3600)
                        return data
        except Exception as e:
            logger.error(f"Error fetching sub companies for {symbol}: {e}")
        return None
    
    async def get_company_leadership(self, symbol: str) -> Optional[List[Dict]]:
        """Get list of company leadership (board members, executives).
        
        Cache: 1 hour
        """
        cache_key = f"company_leadership:{symbol.upper()}"
        cached = await self._cache.get(cache_key)
        if cached is not None:
            return cached
        
        url = "https://iboard-api.ssi.com.vn/statistics/company/ssmi/company-leaderships"
        params = {"symbol": symbol.upper(), "language": "vn", "page": 1, "pageSize": 100}
        
        try:
            async with httpx.AsyncClient(timeout=self._timeout, headers={
                "User-Agent": "Mozilla/5.0",
                "Accept": "application/json",
                "Origin": "https://iboard.ssi.com.vn",
            }) as client:
                response = await client.get(url, params=params)
                if response.status_code == 200:
                    json_resp = response.json()
                    if json_resp.get("code") == "SUCCESS":
                        data = json_resp.get("data", [])
                        await self._cache.set(cache_key, data, ttl_seconds=3600)
                        return data
        except Exception as e:
            logger.error(f"Error fetching company leadership for {symbol}: {e}")
        return None
    
    async def get_shareholder_detail(self, symbol: str) -> Optional[List[Dict]]:
        """Get detailed list of shareholders (individual and institutional).
        
        Cache: 30 minutes
        """
        cache_key = f"shareholder_detail:{symbol.upper()}"
        cached = await self._cache.get(cache_key)
        if cached is not None:
            return cached
        
        url = "https://iboard-api.ssi.com.vn/statistics/company/ssmi/share-holder-detail"
        params = {"symbol": symbol.upper(), "language": "vn", "page": 1, "pageSize": 100}
        
        try:
            async with httpx.AsyncClient(timeout=self._timeout, headers={
                "User-Agent": "Mozilla/5.0",
                "Accept": "application/json",
                "Origin": "https://iboard.ssi.com.vn",
            }) as client:
                response = await client.get(url, params=params)
                if response.status_code == 200:
                    json_resp = response.json()
                    if json_resp.get("code") == "SUCCESS":
                        data = json_resp.get("data", [])
                        await self._cache.set(cache_key, data, ttl_seconds=1800)  # 30 min
                        return data
        except Exception as e:
            logger.error(f"Error fetching shareholder detail for {symbol}: {e}")
        return None
    
    async def get_shareholder_summary(self, symbol: str) -> Optional[Dict]:
        """Get shareholder structure summary (foreign/state/other percentages).
        
        Cache: 30 minutes
        """
        cache_key = f"shareholder_summary:{symbol.upper()}"
        cached = await self._cache.get(cache_key)
        if cached is not None:
            return cached
        
        url = "https://iboard-api.ssi.com.vn/statistics/company/ssmi/share-holder-summary"
        params = {"symbol": symbol.upper(), "language": "vn"}
        
        try:
            async with httpx.AsyncClient(timeout=self._timeout, headers={
                "User-Agent": "Mozilla/5.0",
                "Accept": "application/json",
                "Origin": "https://iboard.ssi.com.vn",
            }) as client:
                response = await client.get(url, params=params)
                if response.status_code == 200:
                    json_resp = response.json()
                    if json_resp.get("code") == "SUCCESS":
                        data_list = json_resp.get("data", [])
                        data = data_list[0] if data_list else None
                        if data:
                            await self._cache.set(cache_key, data, ttl_seconds=1800)
                        return data
        except Exception as e:
            logger.error(f"Error fetching shareholder summary for {symbol}: {e}")
        return None
    
    async def get_cap_and_dividend(self, symbol: str) -> Optional[Dict]:
        """Get capital and dividend history.
        
        Cache: 1 hour
        """
        cache_key = f"cap_dividend:{symbol.upper()}"
        cached = await self._cache.get(cache_key)
        if cached is not None:
            return cached
        
        url = "https://iboard-api.ssi.com.vn/statistics/company/ssmi/cap-and-dividend"
        params = {"symbol": symbol.upper()}
        
        try:
            async with httpx.AsyncClient(timeout=self._timeout, headers={
                "User-Agent": "Mozilla/5.0",
                "Accept": "application/json",
                "Origin": "https://iboard.ssi.com.vn",
            }) as client:
                response = await client.get(url, params=params)
                if response.status_code == 200:
                    json_resp = response.json()
                    if json_resp.get("code") == "SUCCESS":
                        data = json_resp.get("data")
                        await self._cache.set(cache_key, data, ttl_seconds=3600)
                        return data
        except Exception as e:
            logger.error(f"Error fetching cap and dividend for {symbol}: {e}")
        return None
    
    # -------------------------------------------------------------------------
    # Utility APIs
    # -------------------------------------------------------------------------
    
    async def get_underlying_symbols(self) -> List[str]:
        """Get list of all underlying symbols that have warrants."""
        data = await self.get_all_warrants()
        return list(data['underlying'].keys())


# =============================================================================
# Singleton instance
# =============================================================================

_iboard_client: Optional[IboardClient] = None


def get_iboard_client() -> IboardClient:
    """Get singleton iBoard client instance."""
    global _iboard_client
    if _iboard_client is None:
        _iboard_client = IboardClient()
    return _iboard_client


async def close_iboard_client():
    """Close the singleton iBoard client."""
    global _iboard_client
    if _iboard_client:
        await _iboard_client.close()
        _iboard_client = None
