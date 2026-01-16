"""
Warrant API Routes - Using iBoard API
"""

from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query
import logging

from app.services.iboard_client import get_iboard_client, WarrantData, UnderlyingData
from app.schemas.warrant import (
    WarrantItem,
    UnderlyingInfo,
    WarrantListResponse,
    WarrantsByUnderlyingResponse,
    WarrantDetailResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/warrants", tags=["warrants"])


def warrant_data_to_item(w: WarrantData, underlying_dict: dict = None) -> WarrantItem:
    """Convert WarrantData dataclass to WarrantItem schema"""
    # Get underlying price from dict if available
    underlying_price = 0.0
    underlying_change = 0.0
    underlying_change_percent = 0.0
    
    if underlying_dict and w.underlying_symbol in underlying_dict:
        u = underlying_dict[w.underlying_symbol]
        underlying_price = u.current_price
        underlying_change = u.change
        underlying_change_percent = u.change_percent
    
    return WarrantItem(
        symbol=w.symbol,
        underlying_symbol=w.underlying_symbol,
        issuer_name=w.issuer_name,
        warrant_type=w.warrant_type,
        current_price=w.current_price,
        ref_price=w.ref_price,
        ceiling=w.ceiling,
        floor=w.floor,
        open_price=w.open_price,
        high_price=w.high_price,
        low_price=w.low_price,
        avg_price=w.avg_price,
        change=w.change,
        change_percent=w.change_percent,
        volume=w.volume,
        value=w.value,
        exercise_price=w.exercise_price,
        exercise_ratio=w.exercise_ratio,
        maturity_date=w.maturity_date,
        last_trading_date=w.last_trading_date,
        days_to_maturity=w.days_to_maturity,
        bid1_price=w.bid1_price,
        bid1_vol=w.bid1_vol,
        bid2_price=w.bid2_price,
        bid2_vol=w.bid2_vol,
        bid3_price=w.bid3_price,
        bid3_vol=w.bid3_vol,
        ask1_price=w.ask1_price,
        ask1_vol=w.ask1_vol,
        ask2_price=w.ask2_price,
        ask2_vol=w.ask2_vol,
        ask3_price=w.ask3_price,
        ask3_vol=w.ask3_vol,
        foreign_remain=w.foreign_remain,
        session=w.session,
        trading_date=w.trading_date,
    )


def underlying_data_to_info(u: UnderlyingData) -> UnderlyingInfo:
    """Convert UnderlyingData dataclass to UnderlyingInfo schema"""
    return UnderlyingInfo(
        symbol=u.symbol,
        current_price=u.current_price,
        ref_price=u.ref_price,
        ceiling=u.ceiling,
        floor=u.floor,
        change=u.change,
        change_percent=u.change_percent,
    )


@router.get("/", response_model=WarrantListResponse)
async def get_all_warrants(
    exchange: Optional[str] = Query(None, description="Filter by exchange: hose, hnx"),
    underlying: Optional[str] = Query(None, description="Filter by underlying stock symbol"),
    issuer: Optional[str] = Query(None, description="Filter by issuer"),
    search: Optional[str] = Query(None, description="Search by symbol or underlying"),
    sort_by: Optional[str] = Query(None, description="Sort by: volume, change_percent, days_to_maturity, exercise_price"),
    sort_order: Optional[str] = Query("desc", description="Sort order: asc, desc"),
    limit: Optional[int] = Query(None, description="Limit results"),
    min_days: Optional[int] = Query(None, description="Minimum days to maturity"),
    max_days: Optional[int] = Query(None, description="Maximum days to maturity"),
    min_volume: Optional[int] = Query(None, description="Minimum volume"),
):
    """
    Get all warrants with comprehensive filtering
    
    - **exchange**: Filter by exchange (hose, hnx)
    - **underlying**: Filter by underlying stock symbol (e.g., HPG, VNM)
    - **issuer**: Filter by issuer code (e.g., VND, MBS, VCI)
    - **search**: Search by warrant symbol or underlying
    - **sort_by**: Sort by field (volume, change_percent, days_to_maturity, exercise_price)
    - **sort_order**: Sort order (asc, desc)
    - **min_days**: Minimum days to maturity
    - **max_days**: Maximum days to maturity
    - **min_volume**: Minimum trading volume
    """
    client = get_iboard_client()
    
    try:
        if exchange:
            if exchange.lower() not in ["hose", "hnx"]:
                raise HTTPException(status_code=400, detail="Invalid exchange. Must be hose or hnx")
            data = await client.get_warrants(exchange.lower())
        else:
            data = await client.get_all_warrants()
        
        warrants_data = data['warrants']
        underlying_data = list(data['underlying'].values())
        
        warrants = [warrant_data_to_item(w, data['underlying']) for w in warrants_data]
        underlying_list = [underlying_data_to_info(u) for u in underlying_data]
        
        # Apply filters
        if underlying:
            underlying_upper = underlying.upper()
            warrants = [w for w in warrants if w.underlying_symbol == underlying_upper]
        
        if issuer:
            issuer_upper = issuer.upper()
            warrants = [w for w in warrants if issuer_upper in w.issuer.upper()]
        
        if search:
            search_upper = search.upper()
            warrants = [
                w for w in warrants
                if search_upper in w.symbol or search_upper in w.underlying_symbol
            ]
        
        if min_days is not None:
            warrants = [w for w in warrants if w.days_to_maturity >= min_days]
        
        if max_days is not None:
            warrants = [w for w in warrants if w.days_to_maturity <= max_days]
        
        if min_volume is not None:
            warrants = [w for w in warrants if w.volume >= min_volume]
        
        # Apply sorting
        if sort_by:
            reverse = sort_order != "asc"
            if sort_by == "volume":
                warrants.sort(key=lambda x: x.volume, reverse=reverse)
            elif sort_by == "change_percent":
                warrants.sort(key=lambda x: x.change_percent, reverse=reverse)
            elif sort_by == "days_to_maturity":
                warrants.sort(key=lambda x: x.days_to_maturity, reverse=reverse)
            elif sort_by == "exercise_price":
                warrants.sort(key=lambda x: x.exercise_price, reverse=reverse)
            elif sort_by == "break_even":
                warrants.sort(key=lambda x: x.break_even, reverse=reverse)
            elif sort_by == "leverage":
                warrants.sort(key=lambda x: x.leverage or 0, reverse=reverse)
        
        # Calculate total BEFORE applying limit
        total_count = len(warrants)
        
        # Apply limit
        if limit and limit > 0:
            warrants = warrants[:limit]
        
        # Create underlying dict for response
        underlying_dict = {
            u.symbol: {
                "symbol": u.symbol,
                "current_price": u.current_price,
                "ref_price": u.ref_price,
                "ceiling": u.ceiling,
                "floor": u.floor,
                "change": u.change,
                "change_percent": u.change_percent,
            }
            for u in underlying_list
        }
        
        return WarrantListResponse(
            warrants=warrants,
            underlying=underlying_dict,
            total=total_count,
            exchange=exchange.upper() if exchange else None,
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching warrants: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/underlying/{symbol}", response_model=WarrantsByUnderlyingResponse)
async def get_warrants_by_underlying(
    symbol: str,
    sort_by: Optional[str] = Query(None, description="Sort by: volume, days_to_maturity, exercise_price, break_even"),
    sort_order: Optional[str] = Query("asc", description="Sort order: asc, desc"),
):
    """
    Get all warrants for a specific underlying stock
    
    - **symbol**: Underlying stock symbol (e.g., HPG, VNM, ACB)
    """
    client = get_iboard_client()
    
    try:
        data = await client.get_warrants_by_underlying(symbol.upper())
        
        warrants_data = data['warrants']
        underlying_info_data = data.get('underlying_info')
        
        # Create underlying dict for conversion
        underlying_dict = {}
        if underlying_info_data:
            underlying_dict[symbol.upper()] = underlying_info_data
        
        # If no warrants found, return empty list instead of error
        warrants = []
        if warrants_data:
            warrants = [warrant_data_to_item(w, underlying_dict) for w in warrants_data]
        
        # Convert underlying info
        underlying_info = None
        if underlying_info_data:
            underlying_info = underlying_data_to_info(underlying_info_data)
        
        # Apply sorting
        if sort_by:
            reverse = sort_order != "asc"
            if sort_by == "volume":
                warrants.sort(key=lambda x: x.volume, reverse=reverse)
            elif sort_by == "days_to_maturity":
                warrants.sort(key=lambda x: x.days_to_maturity, reverse=reverse)
            elif sort_by == "exercise_price":
                warrants.sort(key=lambda x: x.exercise_price, reverse=reverse)
            elif sort_by == "break_even":
                warrants.sort(key=lambda x: x.break_even, reverse=reverse)
            elif sort_by == "leverage":
                warrants.sort(key=lambda x: x.leverage or 0, reverse=reverse)
        
        return WarrantsByUnderlyingResponse(
            underlying=underlying_info,
            warrants=warrants,
            total=len(warrants),
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching warrants for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/underlying-list")
async def get_underlying_list():
    """
    Get list of all underlying stocks that have warrants
    """
    client = get_iboard_client()
    
    try:
        # Get all warrants to extract underlying data
        data = await client.get_all_warrants()
        underlying_data = list(data['underlying'].values())
        
        underlying_list = [underlying_data_to_info(u) for u in underlying_data]
        
        return {
            "underlying_stocks": underlying_list,
            "total": len(underlying_list),
        }
        
    except Exception as e:
        logger.error(f"Error fetching underlying list: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/issuers")
async def get_issuers():
    """
    Get list of all warrant issuers
    """
    client = get_iboard_client()
    
    try:
        data = await client.get_all_warrants()
        warrants = data['warrants']
        
        # Extract unique issuers
        issuers = {}
        for w in warrants:
            issuer = w.issuer_name
            if issuer not in issuers:
                issuers[issuer] = 0
            issuers[issuer] += 1
        
        return {
            "issuers": [
                {"name": name, "warrant_count": count}
                for name, count in sorted(issuers.items(), key=lambda x: x[1], reverse=True)
            ],
            "total": len(issuers),
        }
        
    except Exception as e:
        logger.error(f"Error fetching issuers: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/statistics")
async def get_warrant_statistics():
    """
    Get overall warrant market statistics
    """
    client = get_iboard_client()
    
    try:
        data = await client.get_all_warrants()
        warrants = data['warrants']
        underlying = data['underlying']
        
        # Calculate statistics
        total_volume = sum(w.volume for w in warrants)
        total_value = sum(w.value for w in warrants)
        advances = sum(1 for w in warrants if w.change_percent > 0)
        declines = sum(1 for w in warrants if w.change_percent < 0)
        unchanged = sum(1 for w in warrants if w.change_percent == 0)
        
        # Group by underlying
        underlying_stats = {}
        for w in warrants:
            sym = w.underlying_symbol
            if sym not in underlying_stats:
                underlying_stats[sym] = {"count": 0, "volume": 0, "value": 0}
            underlying_stats[sym]["count"] += 1
            underlying_stats[sym]["volume"] += w.volume
            underlying_stats[sym]["value"] += w.value
        
        # Group by issuer
        issuer_stats = {}
        for w in warrants:
            issuer = w.issuer_name
            if issuer not in issuer_stats:
                issuer_stats[issuer] = {"count": 0, "volume": 0, "value": 0}
            issuer_stats[issuer]["count"] += 1
            issuer_stats[issuer]["volume"] += w.volume
            issuer_stats[issuer]["value"] += w.value
        
        return {
            "total_warrants": len(warrants),
            "total_underlying": len(underlying),
            "total_volume": total_volume,
            "total_value": total_value,
            "advances": advances,
            "declines": declines,
            "unchanged": unchanged,
            "by_underlying": underlying_stats,
            "by_issuer": issuer_stats,
        }
        
    except Exception as e:
        logger.error(f"Error fetching statistics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{symbol}", response_model=WarrantDetailResponse)
async def get_warrant_detail(symbol: str):
    """
    Get detailed information for a specific warrant
    
    - **symbol**: Warrant symbol (e.g., CHPG2501, CVNM2402)
    """
    client = get_iboard_client()
    
    try:
        data = await client.get_warrant_by_symbol(symbol.upper())
        
        if not data:
            raise HTTPException(
                status_code=404,
                detail=f"Warrant {symbol} not found"
            )
        
        warrant_data = data['warrant']
        underlying_info_data = data.get('underlying_info')
        
        # Create underlying dict for conversion
        underlying_dict = {}
        if underlying_info_data:
            underlying_dict[warrant_data.underlying_symbol] = underlying_info_data
        
        warrant = warrant_data_to_item(warrant_data, underlying_dict)
        
        # Convert underlying info
        underlying_info = None
        if underlying_info_data:
            underlying_info = underlying_data_to_info(underlying_info_data)
        
        return WarrantDetailResponse(
            warrant=warrant,
            underlying=underlying_info,
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching warrant {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Legacy endpoints for backward compatibility
@router.get("/list", response_model=WarrantListResponse)
async def get_warrant_list_legacy(
    underlying: Optional[str] = Query(None),
    issuer: Optional[str] = Query(None),
):
    """Legacy endpoint - redirects to main endpoint"""
    return await get_all_warrants(underlying=underlying, issuer=issuer)
