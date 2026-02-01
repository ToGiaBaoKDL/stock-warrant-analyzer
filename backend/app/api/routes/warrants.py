"""
Warrant API Routes - Using iBoard API
"""

from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query
import logging

from app.services.iboard_client import get_iboard_client
from app.schemas.warrant import (
    WarrantItem,
    UnderlyingInfo,
    WarrantListResponse,
    WarrantsByUnderlyingResponse,
    WarrantDetailResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/warrants", tags=["warrants"])





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
        
        warrants = list(data['warrants'])
        underlying_dict_data = data['underlying']  # Dict[symbol, UnderlyingInfo]
        underlying_list = list(underlying_dict_data.values())
        
        # Helper to get underlying price for leverage calculation
        def get_underlying_price(w: WarrantItem) -> float:
            u = underlying_dict_data.get(w.underlying_symbol)
            return u.current_price if u else 0.0
        
        # Helper to calculate leverage
        def calc_leverage(w: WarrantItem) -> float:
            u_price = get_underlying_price(w)
            if w.current_price > 0 and w.exercise_ratio > 0:
                return u_price / (w.current_price * w.exercise_ratio)
            return 0.0
        
        # Apply filters
        if underlying:
            underlying_upper = underlying.upper()
            warrants = [w for w in warrants if w.underlying_symbol == underlying_upper]
        
        if issuer:
            issuer_upper = issuer.upper()
            warrants = [w for w in warrants if issuer_upper in w.issuer_name.upper()]
        
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
                warrants.sort(key=calc_leverage, reverse=reverse)
        
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
        underlying_info = data.get('underlying_info')
        underlying_price = underlying_info.current_price if underlying_info else 0.0
        
        # Helper to calculate leverage
        def calc_leverage(w: WarrantItem) -> float:
            if w.current_price > 0 and w.exercise_ratio > 0:
                return underlying_price / (w.current_price * w.exercise_ratio)
            return 0.0
        
        # iboard_client returns WarrantItem directly - use as-is
        warrants = list(warrants_data) if warrants_data else []
        
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
                warrants.sort(key=calc_leverage, reverse=reverse)
        
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
        # iboard_client returns UnderlyingInfo directly - use as-is
        underlying_list = list(data['underlying'].values())
        
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
        # iboard_client returns WarrantItem/UnderlyingInfo directly
        warrant = data['warrant']
        underlying_info = data.get('underlying_info')
        
        return WarrantDetailResponse(
            warrant=warrant,
            underlying=underlying_info,
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching warrant {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
