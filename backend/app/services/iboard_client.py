"""
SSI iBoard Query API Client

This module provides a clean interface to SSI iBoard public API.
Features:
- Stock data for HOSE, HNX, UPCOM exchanges
- Covered Warrants with full details
- No authentication required (browser headers only)
- Fast response times, no rate limiting observed
"""

import logging
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
import httpx

logger = logging.getLogger(__name__)


# =============================================================================
# Pydantic Models
# =============================================================================

class StockData(BaseModel):
    """Stock data from iBoard API"""
    symbol: str
    name: str = ""
    name_en: str = ""
    exchange: str = ""
    board_id: str = "MAIN"
    
    # Prices
    current_price: float = 0.0
    ref_price: float = 0.0
    ceiling: float = 0.0
    floor: float = 0.0
    open_price: float = 0.0
    high_price: float = 0.0
    low_price: float = 0.0
    avg_price: float = 0.0
    
    # Changes
    change: float = 0.0
    change_percent: float = 0.0
    
    # Volume
    volume: int = 0
    value: float = 0.0
    
    # Order book
    bid1_price: float = 0.0
    bid1_vol: int = 0
    bid2_price: float = 0.0
    bid2_vol: int = 0
    bid3_price: float = 0.0
    bid3_vol: int = 0
    ask1_price: float = 0.0
    ask1_vol: int = 0
    ask2_price: float = 0.0
    ask2_vol: int = 0
    ask3_price: float = 0.0
    ask3_vol: int = 0
    
    # Foreign
    foreign_buy_vol: int = 0
    foreign_sell_vol: int = 0
    foreign_remain: int = 0
    
    # Session info
    session: str = ""
    trading_date: str = ""
    
    class Config:
        populate_by_name = True


class WarrantData(BaseModel):
    """Covered Warrant data from iBoard API"""
    symbol: str
    underlying_symbol: str = ""
    issuer_name: str = ""
    warrant_type: str = "C"  # C = Call, P = Put
    
    # Prices
    current_price: float = 0.0
    ref_price: float = 0.0
    ceiling: float = 0.0
    floor: float = 0.0
    open_price: float = 0.0
    high_price: float = 0.0
    low_price: float = 0.0
    avg_price: float = 0.0
    
    # Changes
    change: float = 0.0
    change_percent: float = 0.0
    
    # Volume
    volume: int = 0
    value: float = 0.0
    
    # Warrant specifics
    exercise_price: float = 0.0
    exercise_ratio: float = 1.0  # e.g., 1.6712 means 1.6712:1
    maturity_date: str = ""  # ISO format YYYY-MM-DD
    last_trading_date: str = ""  # ISO format YYYY-MM-DD
    days_to_maturity: int = 0
    
    # Derived conversion_ratio for frontend compatibility
    conversion_ratio: float = 1.0  # Same as exercise_ratio
    
    # Order book
    bid1_price: float = 0.0
    bid1_vol: int = 0
    bid2_price: float = 0.0
    bid2_vol: int = 0
    bid3_price: float = 0.0
    bid3_vol: int = 0
    ask1_price: float = 0.0
    ask1_vol: int = 0
    ask2_price: float = 0.0
    ask2_vol: int = 0
    ask3_price: float = 0.0
    ask3_vol: int = 0
    
    # Foreign
    foreign_remain: int = 0
    
    # Session info
    session: str = ""
    trading_date: str = ""
    
    class Config:
        populate_by_name = True


class UnderlyingData(BaseModel):
    """Underlying stock data for warrants"""
    symbol: str
    current_price: float = 0.0
    ref_price: float = 0.0
    ceiling: float = 0.0
    floor: float = 0.0
    change: float = 0.0
    change_percent: float = 0.0
    
    class Config:
        populate_by_name = True


# =============================================================================
# iBoard Client
# =============================================================================

class IboardClient:
    """
    SSI iBoard Query API Client
    
    Usage:
        client = IboardClient()
        stocks = await client.get_stocks("hose")
        warrants = await client.get_warrants("hose")
    """
    
    BASE_URL = "https://iboard-query.ssi.com.vn"
    
    HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "vi-VN,vi;q=0.9,en;q=0.8",
        "Origin": "https://iboard.ssi.com.vn",
        "Referer": "https://iboard.ssi.com.vn/",
    }
    
    VALID_EXCHANGES = ["hose", "hnx", "upcom"]
    
    def __init__(self, timeout: float = 15.0):
        self._timeout = timeout
        self._client: Optional[httpx.AsyncClient] = None
    
    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create async HTTP client"""
        if self._client is None or self._client.is_closed:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "application/json, text/plain, */*",
                "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
                "Accept-Encoding": "gzip, deflate, br",
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
                timeout=30.0,
                headers=headers,
                follow_redirects=True,
            )
        return self._client
    
    async def close(self):
        """Close the HTTP client"""
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
        """
        Parse 'DD/MM/YYYY' -> (ISO date string, days_to_maturity)
        Returns ('', -1) if parsing fails
        """
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
        """Safely convert value to float"""
        if value is None:
            return default
        try:
            return float(value)
        except (ValueError, TypeError):
            return default
    
    @staticmethod
    def _safe_int(value: Any, default: int = 0) -> int:
        """Safely convert value to int"""
        if value is None:
            return default
        try:
            return int(value)
        except (ValueError, TypeError):
            return default
    
    # -------------------------------------------------------------------------
    # Stock APIs
    # -------------------------------------------------------------------------
    
    async def get_stocks(self, exchange: str = "hose") -> List[StockData]:
        """
        Get all stocks for an exchange
        
        Args:
            exchange: Exchange code (hose, hnx, upcom)
            
        Returns:
            List of StockData objects
        """
        exchange = exchange.lower()
        if exchange not in self.VALID_EXCHANGES:
            raise ValueError(f"Invalid exchange: {exchange}. Must be one of {self.VALID_EXCHANGES}")
        
        client = await self._get_client()
        
        try:
            response = await client.get(f"/stock/exchange/{exchange}", params={"boardId": "MAIN"})
            response.raise_for_status()
            
            data = response.json()
            if data.get('code') != 'SUCCESS':
                logger.error(f"iBoard API error: {data.get('message')}")
                raise Exception(f"iBoard API error: {data.get('message')}")
            
            stocks = []
            for s in data.get('data', []):
                stock = StockData(
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
            
            logger.info(f"Fetched {len(stocks)} stocks from {exchange.upper()}")
            return stocks
            
        except httpx.HTTPError as e:
            logger.error(f"HTTP error fetching stocks from {exchange}: {e}")
            raise
    
    async def get_stock_by_symbol(self, symbol: str) -> Optional[StockData]:
        """
        Get a single stock by symbol
        
        Note: This fetches all stocks and filters. For better performance,
        consider caching the full list.
        """
        symbol = symbol.upper()
        
        # Try each exchange
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
    
    async def get_all_stocks(self) -> List[StockData]:
        """Get stocks from all exchanges"""
        all_stocks = []
        for exchange in self.VALID_EXCHANGES:
            try:
                stocks = await self.get_stocks(exchange)
                all_stocks.extend(stocks)
            except Exception as e:
                logger.error(f"Error fetching stocks from {exchange}: {e}")
        
        return all_stocks
    
    # -------------------------------------------------------------------------
    # Warrant APIs
    # -------------------------------------------------------------------------
    
    async def get_warrants(self, exchange: str = "hose") -> Dict[str, Any]:
        """
        Get all warrants and underlying stock prices for an exchange
        
        Args:
            exchange: Exchange code (hose, hnx)
            
        Returns:
            Dict with 'warrants' list and 'underlying' dict
        """
        exchange = exchange.lower()
        if exchange not in ["hose", "hnx"]:
            raise ValueError(f"Invalid exchange for warrants: {exchange}. Must be hose or hnx")
        
        client = await self._get_client()
        
        try:
            response = await client.get(f"/stock/cw/{exchange}")
            response.raise_for_status()
            
            data = response.json()
            if data.get('code') != 'SUCCESS':
                logger.error(f"iBoard API error: {data.get('message')}")
                raise Exception(f"iBoard API error: {data.get('message')}")
            
            raw_data = data.get('data', {})
            
            # Parse warrants
            warrants = []
            for w in raw_data.get('coveredWarrantData', []):
                mat_date, days = self._parse_date_ddmmyyyy(w.get('maturityDate', ''))
                exercise_ratio = self._parse_ratio(w.get('exerciseRatio', '1:1'))
                
                warrant = WarrantData(
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
                    underlying[symbol] = UnderlyingData(
                        symbol=symbol,
                        current_price=self._safe_float(u.get('matchedPrice')) or self._safe_float(u.get('refPrice')),
                        ref_price=self._safe_float(u.get('refPrice')),
                        ceiling=self._safe_float(u.get('ceiling')),
                        floor=self._safe_float(u.get('floor')),
                        change=self._safe_float(u.get('priceChange')),
                        change_percent=self._safe_float(u.get('priceChangePercent')),
                    )
            
            logger.info(f"Fetched {len(warrants)} warrants from {exchange.upper()}")
            return {
                'warrants': warrants,
                'underlying': underlying,
            }
            
        except httpx.HTTPError as e:
            logger.error(f"HTTP error fetching warrants from {exchange}: {e}")
            raise
    
    async def get_all_warrants(self) -> Dict[str, Any]:
        """Get warrants from all exchanges (HOSE + HNX)"""
        all_warrants = []
        all_underlying = {}
        
        for exchange in ["hose", "hnx"]:
            try:
                data = await self.get_warrants(exchange)
                all_warrants.extend(data['warrants'])
                all_underlying.update(data['underlying'])
            except Exception as e:
                logger.error(f"Error fetching warrants from {exchange}: {e}")
        
        return {
            'warrants': all_warrants,
            'underlying': all_underlying,
        }
    
    async def get_warrants_by_underlying(self, underlying_symbol: str) -> Dict[str, Any]:
        """
        Get warrants for a specific underlying stock
        
        Returns:
            Dict with warrants list, underlying price info
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
        Get a single warrant by symbol with its underlying info
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
    # Utility APIs
    # -------------------------------------------------------------------------
    
    async def get_underlying_symbols(self) -> List[str]:
        """Get list of all underlying symbols that have warrants"""
        data = await self.get_all_warrants()
        return list(data['underlying'].keys())


# =============================================================================
# Singleton instance
# =============================================================================

_iboard_client: Optional[IboardClient] = None


def get_iboard_client() -> IboardClient:
    """Get singleton iBoard client instance"""
    global _iboard_client
    if _iboard_client is None:
        _iboard_client = IboardClient()
    return _iboard_client


async def close_iboard_client():
    """Close the singleton iBoard client"""
    global _iboard_client
    if _iboard_client:
        await _iboard_client.close()
        _iboard_client = None
