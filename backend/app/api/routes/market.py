import asyncio
"""
Market Overview API Routes - Using iBoard API
"""

from typing import List
from fastapi import APIRouter, HTTPException
import logging

from app.services.iboard_client import get_iboard_client
from app.schemas.stock import ExchangeSummary

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/market", tags=["market"])


@router.get("/overview")
async def get_market_overview():
    """
    Get comprehensive market overview including stocks and warrants
    """
    client = get_iboard_client()
    
    try:
        # Get all stocks and warrants
        all_stocks = await client.get_all_stocks()
        warrants_data = await client.get_all_warrants()
        all_warrants = warrants_data['warrants']
        underlying = warrants_data['underlying']
        
        # Stock statistics by exchange
        exchange_stats = {}
        for exchange in ["HOSE", "HNX", "UPCOM"]:
            exchange_stocks = [s for s in all_stocks if s.exchange == exchange]
            if exchange_stocks:
                advances = sum(1 for s in exchange_stocks if s.change_percent > 0)
                declines = sum(1 for s in exchange_stocks if s.change_percent < 0)
                unchanged = sum(1 for s in exchange_stocks if s.change_percent == 0)
                
                exchange_stats[exchange] = {
                    "total_stocks": len(exchange_stocks),
                    "total_volume": sum(s.volume for s in exchange_stocks),
                    "total_value": sum(s.value for s in exchange_stocks),
                    "advances": advances,
                    "declines": declines,
                    "unchanged": unchanged,
                }
        
        # Warrant statistics
        warrant_advances = sum(1 for w in all_warrants if w.change_percent > 0)
        warrant_declines = sum(1 for w in all_warrants if w.change_percent < 0)
        warrant_unchanged = sum(1 for w in all_warrants if w.change_percent == 0)
        
        warrant_stats = {
            "total_warrants": len(all_warrants),
            "total_underlying": len(underlying),
            "total_volume": sum(w.volume for w in all_warrants),
            "total_value": sum(w.value for w in all_warrants),
            "advances": warrant_advances,
            "declines": warrant_declines,
            "unchanged": warrant_unchanged,
        }
        
        return {
            "stocks": exchange_stats,
            "warrants": warrant_stats,
            "total_stocks": len(all_stocks),
            "total_warrants": len(all_warrants),
        }
        
    except Exception as e:
        logger.error(f"Error fetching market overview: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/top-volume")
async def get_top_volume(
    exchange: str = None,
    limit: int = 10,
):
    """
    Get top stocks by trading volume
    
    - **exchange**: Filter by exchange (optional)
    - **limit**: Number of results (default: 10)
    """
    client = get_iboard_client()
    
    try:
        if exchange:
            stocks = await client.get_stocks(exchange.lower())
        else:
            stocks = await client.get_all_stocks()
        
        # Sort by volume
        sorted_stocks = sorted(stocks, key=lambda x: x.volume, reverse=True)[:limit]
        
        return {
            "stocks": [
                {
                    "symbol": s.symbol,
                    "name": s.name,
                    "exchange": s.exchange,
                    "current_price": s.current_price,
                    "change_percent": s.change_percent,
                    "volume": s.volume,
                    "value": s.value,
                }
                for s in sorted_stocks
            ],
            "total": len(sorted_stocks),
        }
        
    except Exception as e:
        logger.error(f"Error fetching top volume: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/top-gainers")
async def get_top_gainers(
    exchange: str = None,
    limit: int = 10,
):
    """
    Get top stocks by price gain percentage
    
    - **exchange**: Filter by exchange (optional)
    - **limit**: Number of results (default: 10)
    """
    client = get_iboard_client()
    
    try:
        if exchange:
            stocks = await client.get_stocks(exchange.lower())
        else:
            stocks = await client.get_all_stocks()
        
        # Sort by change percent (descending)
        sorted_stocks = sorted(stocks, key=lambda x: x.change_percent, reverse=True)[:limit]
        
        return {
            "stocks": [
                {
                    "symbol": s.symbol,
                    "name": s.name,
                    "exchange": s.exchange,
                    "current_price": s.current_price,
                    "change_percent": s.change_percent,
                    "volume": s.volume,
                }
                for s in sorted_stocks
            ],
            "total": len(sorted_stocks),
        }
        
    except Exception as e:
        logger.error(f"Error fetching top gainers: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/top-losers")
async def get_top_losers(
    exchange: str = None,
    limit: int = 10,
):
    """
    Get top stocks by price loss percentage
    
    - **exchange**: Filter by exchange (optional)
    - **limit**: Number of results (default: 10)
    """
    client = get_iboard_client()
    
    try:
        if exchange:
            stocks = await client.get_stocks(exchange.lower())
        else:
            stocks = await client.get_all_stocks()
        
        # Sort by change percent (ascending for losers)
        sorted_stocks = sorted(stocks, key=lambda x: x.change_percent)[:limit]
        
        return {
            "stocks": [
                {
                    "symbol": s.symbol,
                    "name": s.name,
                    "exchange": s.exchange,
                    "current_price": s.current_price,
                    "change_percent": s.change_percent,
                    "volume": s.volume,
                }
                for s in sorted_stocks
            ],
            "total": len(sorted_stocks),
        }
        
    except Exception as e:
        logger.error(f"Error fetching top losers: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/warrant-top-volume")
async def get_warrant_top_volume(limit: int = 10):
    """
    Get top warrants by trading volume
    """
    client = get_iboard_client()
    
    try:
        data = await client.get_all_warrants()
        warrants = data['warrants']
        
        # Sort by volume
        sorted_warrants = sorted(warrants, key=lambda x: x.volume, reverse=True)[:limit]
        
        return {
            "warrants": [
                {
                    "symbol": w.symbol,
                    "underlying_symbol": w.underlying_symbol,
                    "issuer": w.issuer_name,
                    "current_price": w.current_price,
                    "change_percent": w.change_percent,
                    "volume": w.volume,
                    "days_to_maturity": w.days_to_maturity,
                }
                for w in sorted_warrants
            ],
            "total": len(sorted_warrants),
        }
        
    except Exception as e:
        logger.error(f"Error fetching warrant top volume: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/warrant-expiring-soon")
async def get_warrants_expiring_soon(
    max_days: int = 30,
    limit: int = 20,
):
    """
    Get warrants expiring within specified days
    
    - **max_days**: Maximum days to maturity (default: 30)
    - **limit**: Number of results (default: 20)
    """
    client = get_iboard_client()
    
    try:
        data = await client.get_all_warrants()
        warrants = data['warrants']
        
        # Filter by days to maturity and sort
        expiring = [w for w in warrants if w.days_to_maturity <= max_days]
        sorted_warrants = sorted(expiring, key=lambda x: x.days_to_maturity)[:limit]
        
        return {
            "warrants": [
                {
                    "symbol": w.symbol,
                    "underlying_symbol": w.underlying_symbol,
                    "issuer": w.issuer_name,
                    "current_price": w.current_price,
                    "exercise_price": w.exercise_price,
                    "days_to_maturity": w.days_to_maturity,
                    "maturity_date": w.maturity_date,
                    "volume": w.volume,
                }
                for w in sorted_warrants
            ],
            "total": len(sorted_warrants),
        }
        
    except Exception as e:
        logger.error(f"Error fetching expiring warrants: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/exchange-summary", response_model=List[ExchangeSummary])
async def get_exchange_summary():
    """
    Get summary statistics for all exchanges
    Fetched concurrently to reduce latency.
    """
    client = get_iboard_client()
    exchanges = ["hose", "hnx", "upcom", "vn30"]
    summaries = []
    
    async def fetch_stocks(ex):
        if ex == "vn30":
            return await client.get_vn30_stocks()
        return await client.get_stocks(ex)
    
    # Fetch all exchanges concurrently
    tasks = [fetch_stocks(exchange) for exchange in exchanges]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    for i, exchange in enumerate(exchanges):
        stocks_result = results[i]
        
        # Handle exceptions if any task failed
        if isinstance(stocks_result, Exception):
            logger.error(f"Error getting summary for {exchange}: {stocks_result}")
            continue
            
        stocks = stocks_result
        if not stocks:
            continue
            
        advances = sum(1 for s in stocks if s.change_percent > 0)
        declines = sum(1 for s in stocks if s.change_percent < 0)
        unchanged = sum(1 for s in stocks if s.change_percent == 0)
        
        summaries.append(ExchangeSummary(
            exchange=exchange.upper(),
            total_stocks=len(stocks),
            total_volume=sum(s.volume for s in stocks),
            total_value=sum(s.value for s in stocks),
            advances=advances,
            declines=declines,
            unchanged=unchanged,
        ))
    
    return summaries
