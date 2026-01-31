"""
Company Statistics API Routes

Provides company profile, subsidiaries, leadership, shareholders, and capital/dividend data
from SSI iBoard API.
"""

from typing import List, Optional
from fastapi import APIRouter, HTTPException
import logging

from app.services.iboard_client import get_iboard_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/company", tags=["Company"])


@router.get("/{symbol}/profile")
async def get_company_profile(symbol: str):
    """Get company profile information.
    
    Returns company info including:
    - Basic info: name, industry, founding date
    - Financial: charter capital, listed value
    - Contact: address, website, email, phone
    - Trading: exchange, listing date, stock type
    
    Cache: 1 hour
    """
    client = get_iboard_client()
    data = await client.get_company_profile(symbol)
    
    if data is None:
        raise HTTPException(status_code=404, detail=f"Company profile not found for {symbol}")
    
    return data


@router.get("/{symbol}/subsidiaries")
async def get_subsidiaries(symbol: str):
    """Get list of subsidiaries and affiliated companies.
    
    Returns list of companies with:
    - childSymbol, childCompanyName
    - percentage ownership
    - roleName (e.g., "Công ty con", "Công ty liên kết")
    
    Cache: 1 hour
    """
    client = get_iboard_client()
    data = await client.get_sub_companies(symbol)
    
    if data is None:
        return []  # Empty list if no subsidiaries
    
    return data


@router.get("/{symbol}/leadership")
async def get_leadership(symbol: str):
    """Get list of company leadership (board members, executives).
    
    Returns list of leaders with:
    - fullName
    - positionName (e.g., "Chủ tịch HĐQT", "Tổng Giám đốc")
    
    Cache: 1 hour
    """
    client = get_iboard_client()
    data = await client.get_company_leadership(symbol)
    
    if data is None:
        return []
    
    return data


@router.get("/{symbol}/shareholders")
async def get_shareholders(symbol: str):
    """Get detailed list of shareholders (individual and institutional).
    
    Returns list of shareholders with:
    - name, quantity, percentage
    - type: "I" (Individual) or "C" (Corporation)
    - ownerShipTypeCode: "NGOAI" (Foreign), "CNNHAN" (Individual), "KHAC" (Other)
    
    Cache: 30 minutes
    """
    client = get_iboard_client()
    data = await client.get_shareholder_detail(symbol)
    
    if data is None:
        return []
    
    return data


@router.get("/{symbol}/shareholder-summary")
async def get_shareholder_summary(symbol: str):
    """Get shareholder structure summary (for pie chart).
    
    Returns summary with:
    - foreignerPercentage
    - statePercentage
    - otherPercentage
    
    Cache: 30 minutes
    """
    client = get_iboard_client()
    data = await client.get_shareholder_summary(symbol)
    
    if data is None:
        raise HTTPException(status_code=404, detail=f"Shareholder summary not found for {symbol}")
    
    return data


@router.get("/{symbol}/cap-dividend")
async def get_cap_dividend(symbol: str):
    """Get capital and dividend history.
    
    Returns:
    - assetList: Yearly total assets
    - cashDividendList: Yearly cash dividend per share
    
    Cache: 1 hour
    """
    client = get_iboard_client()
    data = await client.get_cap_and_dividend(symbol)
    
    if data is None:
        return {"assetList": [], "cashDividendList": []}
    
    return data
