from uuid import UUID

from app.core.config import get_settings
from app.core.interfaces.vector_store import VectorRecord, VectorStore
from app.core.logging import get_logger
from app.models import Document, DocumentStatus
from app.repositories import DocumentRepository
from app.services.ollama_client import OllamaClient
from app.services.storage.local_storage import LocalFileStorage
from app.services.vector.factory import get_vector_store
from app.utils.extractors import extract_text
from app.utils.text import chunk_text, clean_text, make_chunk_id

settings = get_settings()
logger = get_logger(__name__)


class IngestionService:
    def __init__(
        self,
        document_repo: DocumentRepository,
        vector_store: VectorStore | None = None,
        file_storage: LocalFileStorage | None = None,
        ollama: OllamaClient | None = None,
    ) -> None:
        self.document_repo = document_repo
        self.vector_store = vector_store or get_vector_store()
        self.file_storage = file_storage or LocalFileStorage()
        self.ollama = ollama or OllamaClient()

    async def ingest_document(self, document_id: UUID) -> Document:
        document = await self.document_repo.get_by_id(document_id)
        if not document:
            raise ValueError(f"Document not found: {document_id}")

        document.status = DocumentStatus.PROCESSING
        document.error_message = None
        await self.document_repo.update(document)

        try:
            content = await self.file_storage.read(document.file_path)
            extension = f".{document.filename.rsplit('.', 1)[-1]}"
            pages = extract_text(content, extension)

            await self.vector_store.delete_by_document(str(document.id))

            all_chunks: list[tuple[int, int, str]] = []
            for page in pages:
                cleaned = clean_text(page.text)
                page_chunks = chunk_text(
                    cleaned,
                    chunk_size=settings.chunk_size,
                    chunk_overlap=settings.chunk_overlap,
                )
                for idx, chunk in enumerate(page_chunks):
                    all_chunks.append((page.page_number, idx, chunk))

            if not all_chunks:
                raise ValueError("No text could be extracted from the document")

            texts = [chunk for _, _, chunk in all_chunks]
            embeddings = await self.ollama.embed_batch(texts)

            records: list[VectorRecord] = []
            for global_idx, ((page_num, _, chunk_text_content), embedding) in enumerate(
                zip(all_chunks, embeddings, strict=True)
            ):
                records.append(
                    VectorRecord(
                        id=make_chunk_id(document.id, global_idx),
                        values=embedding,
                        metadata={
                            "document_id": str(document.id),
                            "title": document.title,
                            "department": document.department or "",
                            "page": page_num,
                            "chunk_index": global_idx,
                            "version": document.version,
                            "uploaded_by": str(document.uploaded_by) if document.uploaded_by else "",
                            "text": chunk_text_content[:1000],
                        },
                    )
                )

            batch_size = 100
            for i in range(0, len(records), batch_size):
                await self.vector_store.upsert(records[i : i + batch_size])

            document.chunk_count = len(records)
            document.status = DocumentStatus.INDEXED
            await self.document_repo.update(document)

            logger.info(
                "document_indexed",
                document_id=str(document.id),
                chunks=len(records),
            )
            return document

        except Exception as exc:
            document.status = DocumentStatus.FAILED
            document.error_message = str(exc)
            await self.document_repo.update(document)
            logger.error("document_indexing_failed", document_id=str(document.id), error=str(exc))
            raise
