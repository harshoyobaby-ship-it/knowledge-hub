from dataclasses import dataclass
from typing import Any, Protocol


@dataclass
class VectorRecord:
    id: str
    values: list[float]
    metadata: dict[str, Any]


@dataclass
class VectorSearchResult:
    id: str
    score: float
    metadata: dict[str, Any]


class VectorStore(Protocol):
    async def upsert(self, records: list[VectorRecord], namespace: str | None = None) -> None:
        ...

    async def query(
        self,
        vector: list[float],
        top_k: int = 5,
        filter_metadata: dict[str, Any] | None = None,
        namespace: str | None = None,
    ) -> list[VectorSearchResult]:
        ...

    async def delete_by_document(self, document_id: str, namespace: str | None = None) -> None:
        ...

    async def health_check(self) -> bool:
        ...
