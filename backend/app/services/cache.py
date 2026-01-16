import json
import redis
from typing import Optional, Any
from app.core.config import get_settings


class CacheService:
    """Redis cache service for market data."""
    
    def __init__(self):
        settings = get_settings()
        self._client: Optional[redis.Redis] = None
        self._host = settings.redis_host
        self._port = settings.redis_port
        self._db = settings.redis_db
    
    @property
    def client(self) -> redis.Redis:
        """Lazy initialization of Redis client."""
        if self._client is None:
            self._client = redis.Redis(
                host=self._host,
                port=self._port,
                db=self._db,
                decode_responses=True
            )
        return self._client
    
    def get(self, key: str) -> Optional[dict]:
        """Get cached data by key."""
        try:
            data = self.client.get(key)
            if data:
                return json.loads(data)
            return None
        except redis.ConnectionError:
            # Redis not available, return None to fetch fresh data
            return None
        except json.JSONDecodeError:
            return None
    
    def set(self, key: str, value: Any, ttl: int) -> bool:
        """Set cached data with TTL."""
        try:
            serialized = json.dumps(value, default=str)
            return self.client.setex(key, int(ttl), serialized)
        except redis.ConnectionError:
            # Redis not available, continue without caching
            return False
        except (TypeError, ValueError):
            return False
    
    def delete(self, key: str) -> bool:
        """Delete cached data by key."""
        try:
            return bool(self.client.delete(key))
        except redis.ConnectionError:
            return False
    
    def exists(self, key: str) -> bool:
        """Check if key exists in cache."""
        try:
            return bool(self.client.exists(key))
        except redis.ConnectionError:
            return False
    
    def close(self):
        """Close Redis connection."""
        if self._client:
            self._client.close()
            self._client = None


# Singleton instance
cache_service = CacheService()
