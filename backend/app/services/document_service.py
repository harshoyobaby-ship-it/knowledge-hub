from app.core.config import get_settings
from app.core.interfaces.storage import FileStorage
from app.core.interfaces.vector_store import VectorStore
from app.models import RagDocument, RagDocumentStatus
from app.repositories import DocumentRepository
from app.services.storage.local_storage import LocalFileStorage
from app.services.vector.factory import get_vector_store
from app.utils.ids import new_id
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
        department_id: str | None,
        uploaded_by_id: str | None,
    ) -> RagDocument:
        if len(content) > settings.max_upload_size_bytes:
            raise ValueError(f"File exceeds maximum size of {settings.max_upload_size_mb} MB")

        validate_file_extension(filename)
        validate_content_type(content_type)

        storage_key = await self.file_storage.save(filename, content)

        document = RagDocument(
            id=new_id(),
            title=title,
            department_id=department_id,
            filename=filename,
            storage_key=storage_key,
            content_type=content_type or "application/octet-stream",
            file_size=len(content),
            status=RagDocumentStatus.PENDING,
            uploaded_by_id=uploaded_by_id,
        )
        return await self.document_repo.create(document)

    async def get(self, document_id: str) -> RagDocument | None:
        return await self.document_repo.get_by_id(document_id)

    async def list(
        self,
        department_id: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[RagDocument], int]:
        return await self.document_repo.list_documents(department_id, page, page_size)

    async def delete(self, document_id: str) -> None:
        document = await self.document_repo.get_by_id(document_id)
        if not document:
            raise ValueError("Document not found")

        await self.vector_store.delete_by_document(document.id)
        await self.file_storage.delete(document.storage_key)
        await self.document_repo.delete(document)
