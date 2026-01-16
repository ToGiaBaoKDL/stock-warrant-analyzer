"""Warrant symbol parsing utilities.

This module provides shared utility functions for parsing covered warrant symbols.
CW Symbol Format in Vietnam: C{UNDERLYING}{YYWW}
Example: 
  - CHPG2505 -> C + HPG + 25 + 05 (Week 05 of 2025)
  - CFPT2601 -> C + FPT + 26 + 01 (Week 01 of 2026)
  - CHPG2553 -> C + HPG + 25 + 53 (Week 53 of 2025)

WW ranges from 01 to 53 (ISO week numbers).
Note: Vietnam CW symbols do NOT encode the issuer or exercise price.
This info must be fetched from SecuritiesDetails API.
"""

from datetime import datetime, timedelta, date
from typing import Optional


def parse_warrant_underlying(warrant_symbol: str) -> Optional[str]:
    """
    Parse underlying stock symbol from warrant symbol.
    
    Warrant format: C{UNDERLYING}{YYWW}
    Example: CHPG2505 -> HPG, CFPT2614 -> FPT
    
    Args:
        warrant_symbol: The CW symbol (e.g., CHPG2505)
        
    Returns:
        The underlying stock symbol (e.g., HPG) or None
    """
    if not warrant_symbol or len(warrant_symbol) < 8:  # C + 3 chars + 4 digits
        return None
    
    symbol = warrant_symbol.upper()
    if symbol.startswith('C'):
        symbol = symbol[1:]
    
    # Extract 3-letter underlying (standard format)
    if len(symbol) >= 3:
        return symbol[:3]
    
    return None


def parse_warrant_expiry(warrant_symbol: str) -> date:
    """
    Parse expiration date from warrant symbol.
    
    Format: YYWW where WW is ISO week number (01-53)
    Returns the Friday of that week as typical expiry day.
    
    Args:
        warrant_symbol: The CW symbol
        
    Returns:
        Expiration date (Friday of the expiry week)
    """
    try:
        if len(warrant_symbol) >= 4:
            yyww = warrant_symbol[-4:]
            year = 2000 + int(yyww[:2])
            week = int(yyww[2:])
            
            # Validate week (ISO weeks: 1-53)
            if week < 1 or week > 53:
                raise ValueError(f"Invalid week: {week}")
            
            # Get Friday of that ISO week
            # ISO week 1 contains Jan 4th, starts on Monday
            jan4 = date(year, 1, 4)
            week1_monday = jan4 - timedelta(days=jan4.weekday())
            target_monday = week1_monday + timedelta(weeks=week - 1)
            friday = target_monday + timedelta(days=4)  # Friday
            return friday
            
    except (ValueError, IndexError):
        pass
    
    # Default to 3 months from now if parsing fails
    return (datetime.now() + timedelta(days=90)).date()


def parse_date(date_str: str) -> Optional[date]:
    """
    Parse date from various SSI API formats.
    
    Args:
        date_str: Date string in various formats
        
    Returns:
        Parsed date or None
    """
    if not date_str:
        return None
    
    formats = [
        "%d/%m/%Y",  # SSI format: 31/12/2025
        "%Y-%m-%d",  # ISO format: 2025-12-31
        "%d-%m-%Y",  # Alternative: 31-12-2025
    ]
    
    for fmt in formats:
        try:
            return datetime.strptime(date_str.strip(), fmt).date()
        except ValueError:
            continue
    
    return None


def calculate_days_to_maturity(expiry_date: date) -> int:
    """
    Calculate days until warrant expiration.
    
    Args:
        expiry_date: Expiration date
        
    Returns:
        Number of days (minimum 0)
    """
    today = datetime.now().date()
    delta = expiry_date - today
    return max(0, delta.days)


def is_covered_warrant(symbol: str) -> bool:
    """
    Check if a symbol is a covered warrant.
    
    CW symbols start with 'C' and are typically longer than 5 characters.
    
    Args:
        symbol: The security symbol
        
    Returns:
        True if it's a CW, False otherwise
    """
    if not symbol:
        return False
    
    symbol_upper = symbol.upper()
    return symbol_upper.startswith('C') and len(symbol_upper) > 5


def parse_conversion_ratio(ratio_str) -> float:
    """
    Parse conversion ratio from SSI format.
    
    SSI API may return ratio as:
    - A number (e.g., 2.0, 3.5)
    - A string like "2:1" or "3:1"
    - None or empty
    
    Args:
        ratio_str: The conversion ratio from API
        
    Returns:
        Parsed float ratio (default 1.0)
    """
    if ratio_str is None:
        return 1.0
    
    # Already a number
    if isinstance(ratio_str, (int, float)):
        return float(ratio_str) if ratio_str > 0 else 1.0
    
    # String format
    ratio_str = str(ratio_str).strip()
    if not ratio_str:
        return 1.0
    
    # Handle "N:1" format (e.g., "2:1", "3:1")
    if ':' in ratio_str:
        try:
            parts = ratio_str.split(':')
            numerator = float(parts[0])
            return numerator if numerator > 0 else 1.0
        except (ValueError, IndexError):
            pass
    
    # Try direct float conversion
    try:
        value = float(ratio_str)
        return value if value > 0 else 1.0
    except ValueError:
        return 1.0
