import asyncio
from typing import Any

from pinecone import Pinecone, ServerlessSpec
from pinecone.core.openapi.shared.exceptions import UnauthorizedException
from tenacity import retry, retry_if_exception, stop_after_attempt, wait_exponential

from app.core.config import get_settings
from app.core.exceptions import VectorStoreError
from app.core.interfaces.vector_store import VectorRecord, VectorSearchResult
from app.core.logging import get_logger

settings = get_settings()
logger = get_logger(__name__)

_PLACEHOLDER_KEYS = {"", "your-pinecone-api-key", "changeme"}


def _pinecone_auth_error() -> VectorStoreError:
    return VectorStoreError(
        "Pinecone API key is invalid or missing. Set PINECONE_API_KEY in .env, "
        "or use VECTOR_STORE=local for offline dev."
    )


def _retryable_pinecone_error(exc: BaseException) -> bool:
    if isinstance(exc, UnauthorizedException):
        return False
    if isinstance(exc, VectorStoreError):
        return False
    return True


class PineconeVectorStore:
    def __init__(self) -> None:
        self._client: Pinecone | None = None
        self._index = None
        self._initialized = False

    def _ensure_client(self) -> None:
        if self._client is None:
            key = settings.pinecone_api_key.strip()
            if not key or key.lower() in _PLACEHOLDER_KEYS:
                raise VectorStoreError(
                    "PINECONE_API_KEY is not configured. Add your key to .env or set VECTOR_STORE=local."
                )
            self._client = Pinecone(api_key=key)

    def _ensure_index(self) -> None:
        self._ensure_client()
        assert self._client is not None

        if self._initialized:
            return

        try:
            index_name = settings.pinecone_index_name
            existing = {idx.name for idx in self._client.list_indexes()}

            if index_name not in existing:
                logger.info("creating_pinecone_index", index=index_name)
                self._client.create_index(
                    name=index_name,
                    dimension=settings.pinecone_dimension,
                    metric="cosine",
                    spec=ServerlessSpec(cloud=settings.pinecone_cloud, region=settings.pinecone_region),
                )

            self._index = self._client.Index(index_name)
            self._initialized = True
        except UnauthorizedException as exc:
            raise _pinecone_auth_error() from exc

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=8),
        retry=retry_if_exception(_retryable_pinecone_error),
        reraise=True,
    )
    async def upsert(self, records: list[VectorRecord], namespace: str | None = None) -> None:
        if not records:
            return

        self._ensure_index()
        assert self._index is not None

        vectors = [
            {"id": record.id, "values": record.values, "metadata": record.metadata}
            for record in records
        ]

        await asyncio.to_thread(
            self._index.upsert,
            vectors=vectors,
            namespace=namespace or "",
        )

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=8),
        retry=retry_if_exception(_retryable_pinecone_error),
        reraise=True,
    )
    async def query(
        self,
        vector: list[float],
        top_k: int = 5,
        filter_metadata: dict[str, Any] | None = None,
        namespace: str | None = None,
    ) -> list[VectorSearchResult]:
        self._ensure_index()
        assert self._index is not None

        response = await asyncio.to_thread(
            self._index.query,
            vector=vector,
            top_k=top_k,
            include_metadata=True,
            filter=filter_metadata,
            namespace=namespace or "",
        )

        results: list[VectorSearchResult] = []
        for match in response.get("matches", []):
            results.append(
                VectorSearchResult(
                    id=match["id"],
                    score=float(match.get("score", 0.0)),
                    metadata=match.get("metadata", {}),
                )
            )
        return results

    async def delete_by_document(self, document_id: str, namespace: str | None = None) -> None:
        self._ensure_index()
        assert self._index is not None

        try:
            await asyncio.to_thread(
                self._index.delete,
                filter={"document_id": {"$eq": document_id}},
                namespace=namespace or "",
            )
        except Exception as exc:
            # Empty/new indexes have no namespace yet — safe to skip
            if "Namespace not found" in str(exc) or "NOT_FOUND" in str(exc):
                logger.debug("pinecone_delete_skipped", document_id=document_id)
                return
            raise

    async def health_check(self) -> bool:
        try:
            self._ensure_index()
            assert self._index is not None
            stats = await asyncio.to_thread(self._index.describe_index_stats)
            return stats is not None
        except Exception as exc:
            logger.warning("pinecone_health_check_failed", error=str(exc))
            return False
