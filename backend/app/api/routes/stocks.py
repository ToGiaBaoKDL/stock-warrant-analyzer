"""
Stock API Routes - Using iBoard API
"""

from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query
import logging

from app.services.iboard_client import get_iboard_client, StockData
from app.schemas.stock import (
    StockItem,
    StockListResponse,
    StockDetailResponse,
    StockPriceResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/stocks", tags=["stocks"])


def stock_data_to_item(s: StockData) -> StockItem:
    """Convert StockData from iBoard client to StockItem schema."""
    return StockItem(
        symbol=s.symbol,
        name=s.name,
        name_en=s.name_en,
        exchange=s.exchange,
        board_id=s.board_id,
        current_price=s.current_price,
        ref_price=s.ref_price,
        ceiling=s.ceiling,
        floor=s.floor,
        open_price=s.open_price,
        high_price=s.high_price,
        low_price=s.low_price,
        avg_price=s.avg_price,
        change=s.change,
        change_percent=s.change_percent,
        volume=s.volume,
        value=s.value,
        bid1_price=s.bid1_price,
        bid1_vol=s.bid1_vol,
        bid2_price=s.bid2_price,
        bid2_vol=s.bid2_vol,
        bid3_price=s.bid3_price,
        bid3_vol=s.bid3_vol,
        ask1_price=s.ask1_price,
        ask1_vol=s.ask1_vol,
        ask2_price=s.ask2_price,
        ask2_vol=s.ask2_vol,
        ask3_price=s.ask3_price,
        ask3_vol=s.ask3_vol,
        foreign_buy_vol=s.foreign_buy_vol,
        foreign_sell_vol=s.foreign_sell_vol,
        foreign_remain=s.foreign_remain,
        session=s.session,
        trading_date=s.trading_date,
    )


@router.get("/", response_model=StockListResponse)
async def get_all_stocks(
    exchange: Optional[str] = Query(None, description="Filter by exchange: hose, hnx, upcom"),
    search: Optional[str] = Query(None, description="Search by symbol or name"),
    limit: Optional[int] = Query(None, description="Limit number of results"),
):
    """
    Get all stocks from all exchanges or filter by exchange
    
    - **exchange**: Filter by exchange (hose, hnx, upcom)
    - **search**: Search by symbol or company name
    - **limit**: Limit number of results
    """
    client = get_iboard_client()
    
    try:
        if exchange:
            stocks_data = await client.get_stocks(exchange.lower())
        else:
            stocks_data = await client.get_all_stocks()
        
        # Convert to schema using helper function
        stocks = [stock_data_to_item(s) for s in stocks_data]
        
        # Apply search filter
        if search:
            search_upper = search.upper()
            search_lower = search.lower()
            stocks = [
                s for s in stocks
                if search_upper in s.symbol or 
                   search_lower in s.name.lower() or
                   search_lower in s.name_en.lower()
            ]
        
        # Apply limit
        if limit and limit > 0:
            stocks = stocks[:limit]
        
        return StockListResponse(
            stocks=stocks,
            total=len(stocks),
            exchange=exchange.upper() if exchange else None,
        )
        
    except Exception as e:
        logger.error(f"Error fetching stocks: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/exchange/{exchange}", response_model=StockListResponse)
async def get_stocks_by_exchange(
    exchange: str,
    search: Optional[str] = Query(None, description="Search by symbol or name"),
    sort_by: Optional[str] = Query(None, description="Sort by: volume, change_percent, value"),
    sort_order: Optional[str] = Query("desc", description="Sort order: asc, desc"),
    limit: Optional[int] = Query(None, description="Limit results"),
):
    """
    Get stocks for a specific exchange
    
    - **exchange**: Exchange code (hose, hnx, upcom, vn30)
    - **search**: Search by symbol or name
    - **sort_by**: Sort by field (volume, change_percent, value)
    - **sort_order**: Sort order (asc, desc)
    """
    client = get_iboard_client()
    exchange_lower = exchange.lower()
    
    # Handle VN30 as special case
    if exchange_lower == "vn30":
        try:
            stocks_data = await client.get_vn30_stocks()
            stocks = [stock_data_to_item(s) for s in stocks_data]
        except Exception as e:
            logger.error(f"Error fetching VN30 stocks: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    elif exchange_lower not in ["hose", "hnx", "upcom"]:
        raise HTTPException(status_code=400, detail="Invalid exchange. Must be hose, hnx, upcom, or vn30")
    else:
        try:
            stocks_data = await client.get_stocks(exchange_lower)
            stocks = [stock_data_to_item(s) for s in stocks_data]
        except Exception as e:
            logger.error(f"Error fetching stocks from {exchange}: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    # Apply search
    if search:
        search_upper = search.upper()
        search_lower = search.lower()
        stocks = [
            s for s in stocks
            if search_upper in s.symbol or
               search_lower in s.name.lower() or
               search_lower in s.name_en.lower()
        ]
    
    # Apply sorting
    if sort_by:
        reverse = sort_order != "asc"
        if sort_by == "volume":
            stocks.sort(key=lambda x: x.volume, reverse=reverse)
        elif sort_by == "change_percent":
            stocks.sort(key=lambda x: x.change_percent, reverse=reverse)
        elif sort_by == "value":
            stocks.sort(key=lambda x: x.value, reverse=reverse)
    
    # Apply limit
    if limit and limit > 0:
        stocks = stocks[:limit]
    
    return StockListResponse(
        stocks=stocks,
        total=len(stocks),
        exchange=exchange.upper(),
    )




@router.get("/price/{symbol}", response_model=StockPriceResponse)
async def get_stock_price(symbol: str):
    """
    Get current price for a stock
    
    - **symbol**: Stock symbol (e.g., HPG, VNM)
    """
    client = get_iboard_client()
    
    try:
        stock = await client.get_stock_by_symbol(symbol.upper())
        
        if not stock:
            raise HTTPException(status_code=404, detail=f"Stock {symbol} not found")
        
        return StockPriceResponse(
            symbol=stock.symbol,
            current_price=stock.current_price,
            ref_price=stock.ref_price,
            change=stock.change,
            change_percent=stock.change_percent,
            volume=stock.volume,
            ceiling=stock.ceiling,
            floor=stock.floor,
            high_price=stock.high_price,
            low_price=stock.low_price,
            session=stock.session,
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching price for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{symbol}", response_model=StockDetailResponse)
async def get_stock_detail(symbol: str):
    """
    Get detailed information for a stock
    
    - **symbol**: Stock symbol (e.g., HPG, VNM)
    """
    client = get_iboard_client()
    
    try:
        stock = await client.get_stock_by_symbol(symbol.upper())
        
        if not stock:
            raise HTTPException(status_code=404, detail=f"Stock {symbol} not found")
        
        return StockDetailResponse(stock=stock_data_to_item(stock))
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching detail for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/popular")
async def get_popular_stocks():
    """Get popular stocks (underlying stocks with warrants)"""
    client = get_iboard_client()
    
    try:
        underlying_symbols = await client.get_underlying_symbols()
        
        return {
            "stocks": [{"symbol": s} for s in underlying_symbols],
            "total": len(underlying_symbols),
        }
    except Exception as e:
        logger.error(f"Error fetching popular stocks: {e}")
        raise HTTPException(status_code=500, detail=str(e))
