import asyncio
import json
import math
from pathlib import Path
from typing import Any

from app.core.config import get_settings
from app.core.interfaces.vector_store import VectorRecord, VectorSearchResult
from app.core.logging import get_logger

settings = get_settings()
logger = get_logger(__name__)


class LocalVectorStore:
    """File-backed vector store for local development without Pinecone."""

    def __init__(self, store_path: str | None = None) -> None:
        self.path = Path(store_path or "./data/vectors/store.json")
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = asyncio.Lock()

    def _load(self) -> dict[str, Any]:
        if not self.path.exists():
            return {"vectors": {}}
        return json.loads(self.path.read_text())

    def _save(self, data: dict[str, Any]) -> None:
        self.path.write_text(json.dumps(data))

    @staticmethod
    def _cosine_similarity(a: list[float], b: list[float]) -> float:
        dot = sum(x * y for x, y in zip(a, b, strict=True))
        norm_a = math.sqrt(sum(x * x for x in a))
        norm_b = math.sqrt(sum(x * x for x in b))
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return dot / (norm_a * norm_b)

    def _matches_filter(self, metadata: dict[str, Any], filter_metadata: dict[str, Any] | None) -> bool:
        if not filter_metadata:
            return True
        for key, condition in filter_metadata.items():
            if isinstance(condition, dict) and "$eq" in condition:
                if metadata.get(key) != condition["$eq"]:
                    return False
            elif metadata.get(key) != condition:
                return False
        return True

    async def upsert(self, records: list[VectorRecord], namespace: str | None = None) -> None:
        async with self._lock:
            data = await asyncio.to_thread(self._load)
            for record in records:
                data["vectors"][record.id] = {
                    "values": record.values,
                    "metadata": record.metadata,
                    "namespace": namespace or "",
                }
            await asyncio.to_thread(self._save, data)

    async def query(
        self,
        vector: list[float],
        top_k: int = 5,
        filter_metadata: dict[str, Any] | None = None,
        namespace: str | None = None,
    ) -> list[VectorSearchResult]:
        async with self._lock:
            data = await asyncio.to_thread(self._load)

        scored: list[VectorSearchResult] = []
        ns = namespace or ""
        for vid, entry in data.get("vectors", {}).items():
            if entry.get("namespace", "") != ns:
                continue
            meta = entry.get("metadata", {})
            if not self._matches_filter(meta, filter_metadata):
                continue
            score = self._cosine_similarity(vector, entry["values"])
            scored.append(VectorSearchResult(id=vid, score=score, metadata=meta))

        scored.sort(key=lambda r: r.score, reverse=True)
        return scored[:top_k]

    async def delete_by_document(self, document_id: str, namespace: str | None = None) -> None:
        async with self._lock:
            data = await asyncio.to_thread(self._load)
            ns = namespace or ""
            to_delete = [
                vid
                for vid, entry in data.get("vectors", {}).items()
                if entry.get("metadata", {}).get("document_id") == document_id
                and entry.get("namespace", "") == ns
            ]
            for vid in to_delete:
                del data["vectors"][vid]
            await asyncio.to_thread(self._save, data)

    async def health_check(self) -> bool:
        return True
