from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models import RagDocumentStatus


class DocumentUploadResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    department_id: str | None
    filename: str
    status: RagDocumentStatus
    version: int
    created_at: datetime


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    department_id: str | None
    filename: str
    content_type: str
    file_size: int
    version: int
    status: RagDocumentStatus
    chunk_count: int
    error_message: str | None
    uploaded_by_id: str | None
    created_at: datetime
    updated_at: datetime


class DocumentListResponse(BaseModel):
    items: list[DocumentResponse]
    total: int
    page: int
    page_size: int
