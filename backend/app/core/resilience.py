"""
Resilience patterns for external API calls.

This module provides:
- TTLCache: Async-safe in-memory cache with TTL expiration
- with_retry: Decorator for retry with exponential backoff
- CircuitBreaker: Prevent cascade failures when external API is down
"""

import asyncio
import logging
import time
from dataclasses import dataclass, field
from enum import Enum
from functools import wraps
from typing import Any, Callable, Dict, Optional, TypeVar, ParamSpec

logger = logging.getLogger(__name__)

P = ParamSpec("P")
T = TypeVar("T")


# =============================================================================
# TTL Cache
# =============================================================================

@dataclass
class CacheEntry:
    """A cache entry with value and expiration time."""
    value: Any
    expires_at: float


class TTLCache:
    """
    Async-safe in-memory cache with TTL expiration.
    
    Thread-safe for asyncio concurrent access using a lock.
    Automatically cleans up expired entries on access.
    
    Usage:
        cache = TTLCache()
        await cache.set("key", data, ttl_seconds=30)
        value = await cache.get("key")  # Returns None if expired
    """
    
    def __init__(self, default_ttl: float = 30.0, max_size: int = 1000):
        self._cache: Dict[str, CacheEntry] = {}
        self._lock = asyncio.Lock()
        self._default_ttl = default_ttl
        self._max_size = max_size
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache. Returns None if not found or expired."""
        async with self._lock:
            entry = self._cache.get(key)
            if entry is None:
                return None
            
            if time.time() > entry.expires_at:
                # Entry expired, remove it
                del self._cache[key]
                return None
            
            return entry.value
    
    async def set(self, key: str, value: Any, ttl_seconds: Optional[float] = None) -> None:
        """Set value in cache with TTL."""
        ttl = ttl_seconds if ttl_seconds is not None else self._default_ttl
        expires_at = time.time() + ttl
        
        async with self._lock:
            # Evict oldest entries if cache is full
            if len(self._cache) >= self._max_size:
                await self._evict_expired_unsafe()
                
                # If still full, remove oldest 10%
                if len(self._cache) >= self._max_size:
                    keys_to_remove = list(self._cache.keys())[:self._max_size // 10]
                    for k in keys_to_remove:
                        del self._cache[k]
            
            self._cache[key] = CacheEntry(value=value, expires_at=expires_at)
    
    async def delete(self, key: str) -> bool:
        """Delete a key from cache. Returns True if key existed."""
        async with self._lock:
            if key in self._cache:
                del self._cache[key]
                return True
            return False
    
    async def clear(self) -> None:
        """Clear all cache entries."""
        async with self._lock:
            self._cache.clear()
    
    async def _evict_expired_unsafe(self) -> int:
        """Remove expired entries. Must be called with lock held."""
        now = time.time()
        expired_keys = [k for k, v in self._cache.items() if now > v.expires_at]
        for k in expired_keys:
            del self._cache[k]
        return len(expired_keys)
    
    @property
    def size(self) -> int:
        """Current number of entries in cache."""
        return len(self._cache)


# =============================================================================
# Retry with Exponential Backoff
# =============================================================================

def with_retry(
    max_retries: int = 3,
    base_delay: float = 0.5,
    max_delay: float = 10.0,
    exceptions: tuple = (Exception,),
    on_retry: Optional[Callable[[Exception, int], None]] = None,
):
    """
    Decorator for retry with exponential backoff.
    
    Args:
        max_retries: Maximum number of retry attempts (default: 3)
        base_delay: Initial delay in seconds (default: 0.5)
        max_delay: Maximum delay in seconds (default: 10.0)
        exceptions: Tuple of exceptions to catch and retry
        on_retry: Optional callback(exception, attempt) called on each retry
    
    Usage:
        @with_retry(max_retries=3, base_delay=0.5)
        async def fetch_data():
            ...
    """
    def decorator(func: Callable[P, T]) -> Callable[P, T]:
        @wraps(func)
        async def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            last_exception: Optional[Exception] = None
            
            for attempt in range(max_retries + 1):
                try:
                    return await func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e
                    
                    if attempt == max_retries:
                        # Last attempt failed, raise the exception
                        logger.error(
                            f"[Retry] {func.__name__} failed after {max_retries + 1} attempts: {e}"
                        )
                        raise
                    
                    # Calculate delay with exponential backoff and jitter
                    delay = min(base_delay * (2 ** attempt), max_delay)
                    # Add jitter (±25%)
                    jitter = delay * 0.25 * (2 * (hash(str(time.time())) % 100) / 100 - 1)
                    delay = max(0, delay + jitter)
                    
                    logger.warning(
                        f"[Retry] {func.__name__} attempt {attempt + 1}/{max_retries + 1} "
                        f"failed: {e}. Retrying in {delay:.2f}s..."
                    )
                    
                    if on_retry:
                        on_retry(e, attempt + 1)
                    
                    await asyncio.sleep(delay)
            
            # This should never be reached, but just in case
            if last_exception:
                raise last_exception
            raise RuntimeError("Unexpected retry loop exit")
        
        return wrapper
    return decorator


# =============================================================================
# Circuit Breaker
# =============================================================================

class CircuitState(Enum):
    """Circuit breaker states."""
    CLOSED = "closed"      # Normal operation, requests pass through
    OPEN = "open"          # Circuit is open, requests fail fast
    HALF_OPEN = "half_open"  # Testing if service has recovered


@dataclass
class CircuitBreaker:
    """
    Circuit breaker pattern implementation.
    
    States:
    - CLOSED: Normal operation, requests pass through
    - OPEN: After failure_threshold failures, circuit opens and fails fast
    - HALF_OPEN: After recovery_timeout, allow one request to test recovery
    
    Usage:
        breaker = CircuitBreaker(failure_threshold=5, recovery_timeout=30)
        result = await breaker.call(async_function, arg1, arg2)
    """
    
    failure_threshold: int = 5
    recovery_timeout: float = 30.0
    
    # Internal state
    _state: CircuitState = field(default=CircuitState.CLOSED, init=False)
    _failure_count: int = field(default=0, init=False)
    _last_failure_time: float = field(default=0.0, init=False)
    _lock: asyncio.Lock = field(default_factory=asyncio.Lock, init=False)
    
    @property
    def state(self) -> CircuitState:
        """Current circuit state."""
        return self._state
    
    @property
    def is_closed(self) -> bool:
        """Whether circuit is closed (normal operation)."""
        return self._state == CircuitState.CLOSED
    
    async def call(self, func: Callable[P, T], *args: P.args, **kwargs: P.kwargs) -> T:
        """
        Execute function through circuit breaker.
        
        Raises CircuitBreakerOpenError if circuit is open.
        """
        async with self._lock:
            # Check if we should transition from OPEN to HALF_OPEN
            if self._state == CircuitState.OPEN:
                if time.time() - self._last_failure_time >= self.recovery_timeout:
                    logger.info("[CircuitBreaker] Transitioning to HALF_OPEN state")
                    self._state = CircuitState.HALF_OPEN
                else:
                    raise CircuitBreakerOpenError(
                        f"Circuit is OPEN. Will retry after "
                        f"{self.recovery_timeout - (time.time() - self._last_failure_time):.1f}s"
                    )
        
        try:
            result = await func(*args, **kwargs)
            
            async with self._lock:
                # Success - reset state
                if self._state == CircuitState.HALF_OPEN:
                    logger.info("[CircuitBreaker] Service recovered, closing circuit")
                self._state = CircuitState.CLOSED
                self._failure_count = 0
            
            return result
            
        except Exception as e:
            async with self._lock:
                self._failure_count += 1
                self._last_failure_time = time.time()
                
                if self._state == CircuitState.HALF_OPEN:
                    # Test request failed, reopen circuit
                    logger.warning("[CircuitBreaker] Half-open test failed, reopening circuit")
                    self._state = CircuitState.OPEN
                elif self._failure_count >= self.failure_threshold:
                    # Threshold reached, open circuit
                    logger.error(
                        f"[CircuitBreaker] Failure threshold ({self.failure_threshold}) reached, "
                        f"opening circuit for {self.recovery_timeout}s"
                    )
                    self._state = CircuitState.OPEN
            
            raise
    
    async def reset(self) -> None:
        """Manually reset circuit breaker to closed state."""
        async with self._lock:
            self._state = CircuitState.CLOSED
            self._failure_count = 0
            self._last_failure_time = 0.0


class CircuitBreakerOpenError(Exception):
    """Raised when circuit breaker is open and blocking requests."""
    pass


# =============================================================================
# Global Instances
# =============================================================================

# Shared cache instance for the application
_cache: Optional[TTLCache] = None


def get_cache() -> TTLCache:
    """Get the shared cache instance."""
    global _cache
    if _cache is None:
        _cache = TTLCache(default_ttl=30.0, max_size=500)
    return _cache


# Shared circuit breaker for iBoard API
_iboard_circuit: Optional[CircuitBreaker] = None


def get_iboard_circuit() -> CircuitBreaker:
    """Get the circuit breaker for iBoard API."""
    global _iboard_circuit
    if _iboard_circuit is None:
        _iboard_circuit = CircuitBreaker(failure_threshold=5, recovery_timeout=30.0)
    return _iboard_circuit
