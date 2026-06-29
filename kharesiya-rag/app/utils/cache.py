import asyncio
import hashlib
import time
from typing import Any, TypeVar

T = TypeVar("T")

_store: dict[str, tuple[Any, float]] = {}


def _key(namespace: str, raw: str) -> str:
    return f"{namespace}:{hashlib.sha256(raw.encode()).hexdigest()}"


def get_cached(namespace: str, raw: str, ttl: int) -> Any | None:
    key = _key(namespace, raw)
    entry = _store.get(key)
    if not entry:
        return None
    value, ts = entry
    if time.time() - ts > ttl:
        del _store[key]
        return None
    return value


def set_cached(namespace: str, raw: str, value: Any) -> None:
    _store[_key(namespace, raw)] = (value, time.time())
