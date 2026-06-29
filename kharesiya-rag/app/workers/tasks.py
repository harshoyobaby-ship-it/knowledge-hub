import asyncio
from uuid import UUID

from app.core.database import AsyncSessionLocal
from app.repositories import DocumentRepository
from app.services.ingestion_service import IngestionService
from app.workers.celery_app import celery_app


async def _ingest(document_id: UUID) -> None:
    async with AsyncSessionLocal() as session:
        repo = DocumentRepository(session)
        service = IngestionService(repo)
        try:
            await service.ingest_document(document_id)
            await session.commit()
        except Exception:
            await session.rollback()
            raise


@celery_app.task(name="ingest_document", bind=True, max_retries=3)
def ingest_document_task(self, document_id: str) -> dict:
    try:
        asyncio.run(_ingest(UUID(document_id)))
        return {"status": "success", "document_id": document_id}
    except Exception as exc:
        raise self.retry(exc=exc, countdown=30) from exc
