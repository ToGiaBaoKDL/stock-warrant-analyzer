from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # SSI FastConnect API Configuration
    SSI_CONSUMER_ID: str = ""
    SSI_CONSUMER_SECRET: str = ""
    PublicKey: str = ""  # RSA Public Key for SSI API
    PrivateKey: str = ""  # RSA Private Key for SSI API
    
    # Redis Configuration
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_db: int = 0
    
    # Cache TTL (seconds)
    cache_ttl_market_data: int = 10
    cache_ttl_warrant_data: int = 30
    
    # CORS
    frontend_url: str = "http://localhost:3000"
    
    # API Settings
    api_v1_prefix: str = "/api/v1"
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
