from uuid import UUID

from app.core.config import get_settings
from app.core.interfaces.storage import FileStorage
from app.core.interfaces.vector_store import VectorStore
from app.models import Document, DocumentStatus
from app.repositories import DocumentRepository
from app.services.storage.local_storage import LocalFileStorage
from app.services.vector.factory import get_vector_store
from app.utils.text import validate_content_type, validate_file_extension

settings = get_settings()


class DocumentService:
    def __init__(
        self,
        document_repo: DocumentRepository,
        file_storage: FileStorage | None = None,
        vector_store: VectorStore | None = None,
    ) -> None:
        self.document_repo = document_repo
        self.file_storage = file_storage or LocalFileStorage()
        self.vector_store = vector_store or get_vector_store()

    async def upload(
        self,
        filename: str,
        content: bytes,
        content_type: str | None,
        title: str,
        department: str | None,
        uploaded_by: UUID | None,
    ) -> Document:
        if len(content) > settings.max_upload_size_bytes:
            raise ValueError(f"File exceeds maximum size of {settings.max_upload_size_mb} MB")

        validate_file_extension(filename)
        validate_content_type(content_type)

        file_path = await self.file_storage.save(filename, content)

        document = Document(
            title=title,
            department=department,
            filename=filename,
            file_path=file_path,
            content_type=content_type or "application/octet-stream",
            file_size=len(content),
            status=DocumentStatus.PENDING,
            uploaded_by=uploaded_by,
        )
        return await self.document_repo.create(document)

    async def get(self, document_id: UUID) -> Document | None:
        return await self.document_repo.get_by_id(document_id)

    async def list(
        self,
        department: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Document], int]:
        return await self.document_repo.list_documents(department, page, page_size)

    async def delete(self, document_id: UUID) -> None:
        document = await self.document_repo.get_by_id(document_id)
        if not document:
            raise ValueError("Document not found")

        await self.vector_store.delete_by_document(str(document.id))
        await self.file_storage.delete(document.file_path)
        await self.document_repo.delete(document)
