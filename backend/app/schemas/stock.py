"""
Stock schemas for API responses
"""

from typing import Optional, List
from pydantic import BaseModel, Field


class StockItem(BaseModel):
    """Stock item with full market data"""
    symbol: str = Field(..., description="Stock symbol")
    name: str = Field(..., description="Company name (Vietnamese)")
    name_en: str = Field("", description="Company name (English)")
    exchange: str = Field(..., description="Exchange (HOSE, HNX, UPCOM)")
    board_id: str = Field("MAIN", description="Board ID")
    
    # Prices
    current_price: float = Field(0, description="Current/matched price")
    ref_price: float = Field(0, description="Reference price")
    ceiling: float = Field(0, description="Ceiling price")
    floor: float = Field(0, description="Floor price")
    open_price: float = Field(0, description="Open price")
    high_price: float = Field(0, description="Highest price")
    low_price: float = Field(0, description="Lowest price")
    avg_price: float = Field(0, description="Average price")
    
    # Changes
    change: float = Field(0, description="Price change")
    change_percent: float = Field(0, description="Price change percent")
    
    # Volume
    volume: int = Field(0, description="Total traded volume")
    value: float = Field(0, description="Total traded value")
    
    # Order book
    bid1_price: float = Field(0, description="Best bid price")
    bid1_vol: int = Field(0, description="Best bid volume")
    bid2_price: float = Field(0, description="2nd bid price")
    bid2_vol: int = Field(0, description="2nd bid volume")
    bid3_price: float = Field(0, description="3rd bid price")
    bid3_vol: int = Field(0, description="3rd bid volume")
    ask1_price: float = Field(0, description="Best ask price")
    ask1_vol: int = Field(0, description="Best ask volume")
    ask2_price: float = Field(0, description="2nd ask price")
    ask2_vol: int = Field(0, description="2nd ask volume")
    ask3_price: float = Field(0, description="3rd ask price")
    ask3_vol: int = Field(0, description="3rd ask volume")
    
    # Foreign
    foreign_buy_vol: int = Field(0, description="Foreign buy volume")
    foreign_sell_vol: int = Field(0, description="Foreign sell volume")
    foreign_remain: int = Field(0, description="Foreign remaining room")
    
    # Session
    session: str = Field("", description="Trading session")
    trading_date: str = Field("", description="Trading date")

    class Config:
        from_attributes = True


class StockListResponse(BaseModel):
    """Response for stock list endpoint"""
    stocks: List[StockItem]
    total: int
    exchange: Optional[str] = None


class StockDetailResponse(BaseModel):
    """Response for single stock detail"""
    stock: StockItem
    
    
class StockPriceResponse(BaseModel):
    """Simple stock price response"""
    symbol: str
    current_price: float
    ref_price: float
    change: float
    change_percent: float
    volume: int
    ceiling: float
    floor: float
    high_price: float
    low_price: float
    session: str


class ExchangeSummary(BaseModel):
    """Summary for an exchange"""
    exchange: str
    total_stocks: int
    total_volume: int
    total_value: float
    advances: int  # Số mã tăng
    declines: int  # Số mã giảm
    unchanged: int  # Số mã đứng giá
