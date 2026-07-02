from __future__ import annotations

from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel, Field
from starlette.responses import Response

from app.core.kh_auth import AuthenticatedUser
from app.dependencies import get_current_user, get_rag_service
from app.services.file_ingest_service import ingest_upload_file, slugify
from app.services.rag_service import RAGService
from app.services.vector.local_store import LocalVectorStore
from app.utils.text import chunk_text, clean_text
from app.core.interfaces.vector_store import VectorRecord

router = APIRouter(prefix="/sync", tags=["sync"])


class BulkSyncItem(BaseModel):
    source_type: str = Field(..., min_length=1)
    source_id: str = Field(..., min_length=1)
    title: str = Field(..., min_length=1)
    text: str = Field(..., min_length=1)
    department_id: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class BulkSyncRequest(BaseModel):
    items: list[BulkSyncItem] = Field(default_factory=list)
    # limit embedded content; chunking happens server-side
    top_k: int = 3


class BulkSyncResponse(BaseModel):
    upserted_chunks: int
    items_processed: int


class IndexedDocument(BaseModel):
    document_id: str
    title: str
    department_id: str = ""
    source_type: str = "UPLOAD"
    filename: str = ""
    chunk_count: int = 0


class IndexedDocumentListResponse(BaseModel):
    items: list[IndexedDocument]
    total: int


class FileIngestResult(BaseModel):
    document_id: str
    title: str
    filename: str
    chunks: int
    department_id: str = ""


class BulkFileIngestResponse(BaseModel):
    results: list[FileIngestResult]
    failed: list[dict[str, str]]
    total_chunks: int


def _require_admin(user: AuthenticatedUser) -> None:
    if user.role not in {"SUPER_ADMIN", "ADMIN"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")


@router.post("/bulk", response_model=BulkSyncResponse)
async def bulk_sync(
    request: BulkSyncRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    rag_service: RAGService = Depends(get_rag_service),
) -> BulkSyncResponse:
    """Bulk upsert plain-text knowledge into the vector store.

    This is used by the Next.js app to sync Knowledge Hub content (chapters/SOPs/courses)
    into Pinecone/local vectors without requiring file uploads.
    """
    _require_admin(current_user)

    items = request.items[:500]
    if not items:
        return BulkSyncResponse(upserted_chunks=0, items_processed=0)

    vector_store = rag_service.vector_store
    embedder = rag_service.embedder

    upserted = 0
    for item in items:
        cleaned = clean_text(item.text)
        chunks = chunk_text(cleaned)
        if not chunks:
            continue

        embeddings = await embedder.embed_batch(chunks)

        dept = (item.department_id or "").strip()
        records: list[VectorRecord] = []
        for idx, (chunk, emb) in enumerate(zip(chunks, embeddings, strict=True)):
            chunk_id = f"{item.source_type}:{item.source_id}:{idx}"
            records.append(
                VectorRecord(
                    id=chunk_id,
                    values=emb,
                    metadata={
                        "document_id": f"{item.source_type}:{item.source_id}",
                        "title": item.title,
                        "department_id": dept,
                        "chunk_index": idx,
                        "text": chunk[:1000],
                        "source_type": item.source_type,
                        "source_id": item.source_id,
                        **(item.metadata or {}),
                    },
                )
            )

        # The vector store interface expects VectorRecord objects, but its Pinecone/local
        # implementations accept dicts shaped as VectorRecord via pydantic. Keep this minimal.
        batch_size = 100
        for i in range(0, len(records), batch_size):
            await vector_store.upsert(records[i : i + batch_size])
            upserted += len(records[i : i + batch_size])

    return BulkSyncResponse(upserted_chunks=upserted, items_processed=len(items))


@router.get("/documents", response_model=IndexedDocumentListResponse)
async def list_indexed_documents(
    current_user: AuthenticatedUser = Depends(get_current_user),
    rag_service: RAGService = Depends(get_rag_service),
) -> IndexedDocumentListResponse:
    _require_admin(current_user)

    store = rag_service.vector_store
    if isinstance(store, LocalVectorStore):
        items = [IndexedDocument.model_validate(doc) for doc in await store.list_documents()]
        return IndexedDocumentListResponse(items=items, total=len(items))

    return IndexedDocumentListResponse(items=[], total=0)


@router.delete("/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
async def delete_indexed_document(
    document_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    rag_service: RAGService = Depends(get_rag_service),
) -> Response:
    _require_admin(current_user)
    await rag_service.vector_store.delete_by_document(document_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/documents/{document_id}/reindex", response_model=FileIngestResult)
async def reindex_uploaded_document(
    document_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> FileIngestResult:
    _require_admin(current_user)

    from app.core.config import get_settings

    settings = get_settings()
    storage_dir = Path(settings.documents_dir)
    if not storage_dir.is_dir():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No stored files found")

    slug = document_id.removeprefix("upload:")
    matches = [
        path
        for path in storage_dir.iterdir()
        if path.is_file() and slugify(path.stem) == slug
    ]
    if not matches:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Original file not found. Re-upload the document instead.",
        )

    source = matches[0]
    content = source.read_bytes()
    result = await ingest_upload_file(
        source.name,
        content,
        document_id=document_id,
        uploaded_by=current_user.user_id,
        persist_file=False,
    )
    return FileIngestResult.model_validate(result)


@router.post("/files", response_model=BulkFileIngestResponse)
async def ingest_files(
    files: list[UploadFile] = File(...),
    department_id: str | None = Form(default=None),
    company_wide: bool = Form(default=False),
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> BulkFileIngestResponse:
    """Bulk upload PDF/DOCX files and index them into the vector store."""
    _require_admin(current_user)

    if not files:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No files provided")

    scoped_department = "" if company_wide else (department_id or current_user.department_id or "")

    results: list[FileIngestResult] = []
    failed: list[dict[str, str]] = []
    total_chunks = 0

    for upload in files[:50]:
        filename = upload.filename or "upload.bin"
        try:
            content = await upload.read()
            outcome = await ingest_upload_file(
                filename,
                content,
                department_id=scoped_department,
                uploaded_by=current_user.user_id,
            )
            result = FileIngestResult.model_validate(outcome)
            results.append(result)
            total_chunks += int(result.chunks)
        except Exception as exc:
            failed.append({"filename": filename, "error": str(exc)})

    if not results and failed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=failed[0]["error"],
        )

    return BulkFileIngestResponse(results=results, failed=failed, total_chunks=total_chunks)

