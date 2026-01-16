"""
Stock Warrant Analyzer - Backend API

FastAPI application serving as a data provider for stock and warrant market data.
All business logic (calculations) is handled by the frontend.

Data Source: SSI iBoard Query API (no auth required)
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.api.routes import market, warrants, stocks
from app.services.iboard_client import get_iboard_client, close_iboard_client


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    settings = get_settings()
    print(f"🚀 Starting Stock Warrant Analyzer API")
    print(f"🌐 CORS allowed: {settings.frontend_url}")
    print(f"📡 Data source: SSI iBoard Query API")
    
    # Initialize iBoard client
    client = get_iboard_client()
    print(f"✅ iBoard client initialized")
    
    yield
    
    # Shutdown
    print("🛑 Shutting down...")
    await close_iboard_client()
    print("✅ iBoard client closed")


# Initialize FastAPI app
app = FastAPI(
    title="Stock Warrant Analyzer API",
    description="""
    API for Vietnam stock market data and covered warrants.
    
    ## Features
    - Real-time stock prices from HOSE, HNX, UPCOM
    - Warrant information and listings
    - Smart filtering and sorting
    - Market overview and statistics
    
    ## Data Source
    - SSI iBoard Query API (https://iboard-query.ssi.com.vn)
    - No authentication required
    - No rate limit detected
    
    ## Exchanges
    - **HOSE**: Ho Chi Minh Stock Exchange (~406 stocks)
    - **HNX**: Hanoi Stock Exchange (~302 stocks)
    - **UPCOM**: Unlisted Public Company Market (~865 stocks)
    
    ## Warrants
    - Covered Warrants from HOSE and HNX
    - ~270+ warrants on ~21 underlying stocks
    """,
    version="2.0.0",
    lifespan=lifespan,
)

# Get settings
settings = get_settings()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Include routers with /api/v1 prefix
app.include_router(market.router, prefix=settings.api_v1_prefix)
app.include_router(warrants.router, prefix=settings.api_v1_prefix)
app.include_router(stocks.router, prefix=settings.api_v1_prefix)


@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "name": "Stock Warrant Analyzer API",
        "version": "2.0.0",
        "description": "Vietnam stock and warrant data from SSI iBoard API",
        "docs": "/docs",
        "health": "/health",
        "endpoints": {
            "stocks": "/api/v1/stocks",
            "warrants": "/api/v1/warrants",
            "market": "/api/v1/market",
        }
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    client = get_iboard_client()
    api_ok = False
    try:
        stocks = await client.get_stocks("hose")
        api_ok = len(stocks) > 0
    except Exception as e:
        print(f"Health check API error: {e}")
    
    return {
        "status": "healthy" if api_ok else "degraded",
        "data_provider": "SSI iBoard Query API",
        "api_status": "connected" if api_ok else "error",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
