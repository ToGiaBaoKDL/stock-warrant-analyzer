"""
Warrant schemas for API responses
"""

from typing import Optional, List
from pydantic import BaseModel, Field, computed_field


class WarrantItem(BaseModel):
    """Full warrant data from iBoard API"""
    symbol: str = Field(..., description="Warrant symbol")
    underlying_symbol: str = Field(..., description="Underlying stock symbol")
    issuer_name: str = Field("", description="Issuer name (SSI, VND, etc.)")
    warrant_type: str = Field("C", description="Warrant type: C=Call, P=Put")
    
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
    
    # Warrant specifics
    exercise_price: float = Field(0, description="Exercise/strike price")
    exercise_ratio: float = Field(1.0, description="Conversion ratio (e.g., 1.6712)")
    maturity_date: str = Field("", description="Maturity date (YYYY-MM-DD)")
    last_trading_date: str = Field("", description="Last trading date (YYYY-MM-DD)")
    days_to_maturity: int = Field(-1, description="Days until maturity")
    
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
    foreign_remain: int = Field(0, description="Foreign remaining room")
    
    # Session
    session: str = Field("", description="Trading session")
    trading_date: str = Field("", description="Trading date")
    
    # Computed fields
    @computed_field
    @property
    def conversion_ratio(self) -> float:
        """Alias for exercise_ratio for backward compatibility"""
        return self.exercise_ratio
    
    class Config:
        from_attributes = True


class UnderlyingInfo(BaseModel):
    """Underlying stock info for warrants"""
    symbol: str
    current_price: float = Field(0, description="Current price")
    ref_price: float = Field(0, description="Reference price")
    ceiling: float = Field(0, description="Ceiling price")
    floor: float = Field(0, description="Floor price")
    change: float = Field(0, description="Price change")
    change_percent: float = Field(0, description="Price change percent")


class WarrantListResponse(BaseModel):
    """Response for warrant list endpoint"""
    warrants: List[WarrantItem]
    total: int
    exchange: Optional[str] = None  # Exchange filter if applied
    underlying: Optional[dict] = None  # Map of underlying symbol -> UnderlyingInfo


class WarrantsByUnderlyingResponse(BaseModel):
    """Response for warrants by underlying endpoint"""
    warrants: List[WarrantItem]
    total: int
    underlying: Optional[UnderlyingInfo] = None  # Underlying stock info


class WarrantDetailResponse(BaseModel):
    """Response for single warrant detail"""
    warrant: WarrantItem
    underlying: Optional[UnderlyingInfo] = None  # Underlying stock info
    
    # Computed fields based on warrant data
    @computed_field
    @property
    def underlying_symbol(self) -> str:
        """Underlying symbol from warrant"""
        return self.warrant.underlying_symbol
    
    @computed_field
    @property
    def underlying_price(self) -> float:
        """Underlying price from underlying info"""
        return self.underlying.current_price if self.underlying else 0.0
    
    @computed_field
    @property
    def break_even_price(self) -> float:
        """Break-even price = (CW Price × Ratio) + Exercise Price"""
        if self.warrant.exercise_ratio > 0:
            return (self.warrant.current_price * self.warrant.exercise_ratio) + self.warrant.exercise_price
        return 0.0
    
    @computed_field
    @property
    def intrinsic_value(self) -> float:
        """Intrinsic value = max(0, (Underlying - Exercise) / Ratio)"""
        underlying_px = self.underlying.current_price if self.underlying else 0.0
        if self.warrant.exercise_ratio > 0:
            value = (underlying_px - self.warrant.exercise_price) / self.warrant.exercise_ratio
            return max(0, value)
        return 0.0
    
    @computed_field
    @property
    def time_value(self) -> float:
        """Time value = CW Price - Intrinsic Value"""
        return max(0, self.warrant.current_price - self.intrinsic_value)
    
    @computed_field
    @property
    def is_in_the_money(self) -> bool:
        """Whether warrant is ITM"""
        return self.underlying_price > self.warrant.exercise_price
    
    @computed_field
    @property
    def leverage(self) -> float:
        """Leverage = Underlying Price / (CW Price × Ratio)"""
        if self.warrant.current_price > 0 and self.warrant.exercise_ratio > 0:
            return self.underlying_price / (self.warrant.current_price * self.warrant.exercise_ratio)
        return 0.0


