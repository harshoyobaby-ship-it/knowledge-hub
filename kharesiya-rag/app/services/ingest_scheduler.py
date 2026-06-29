from uuid import UUID

from fastapi import BackgroundTasks

from app.core.config import get_settings
from app.core.database import AsyncSessionLocal
from app.core.logging import get_logger
from app.repositories import DocumentRepository
from app.services.ingestion_service import IngestionService

settings = get_settings()
logger = get_logger(__name__)


async def _ingest_document(document_id: UUID) -> None:
    async with AsyncSessionLocal() as session:
        repo = DocumentRepository(session)
        service = IngestionService(repo)
        try:
            await service.ingest_document(document_id)
        except Exception:
            await session.commit()
            raise
        else:
            await session.commit()


def schedule_ingest(document_id: str, background_tasks: BackgroundTasks) -> None:
    doc_uuid = UUID(document_id)

    if settings.use_celery and not settings.local_dev:
        try:
            from app.workers.tasks import ingest_document_task

            ingest_document_task.delay(document_id)
            return
        except Exception as exc:
            logger.warning("celery_unavailable_fallback", error=str(exc))

    background_tasks.add_task(_ingest_document, doc_uuid)
