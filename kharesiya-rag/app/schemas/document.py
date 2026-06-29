from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models import DocumentStatus


class DocumentUploadResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    department: str | None
    filename: str
    status: DocumentStatus
    version: int
    created_at: datetime


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    department: str | None
    filename: str
    content_type: str
    file_size: int
    version: int
    status: DocumentStatus
    chunk_count: int
    error_message: str | None
    uploaded_by: UUID | None
    created_at: datetime
    updated_at: datetime


class DocumentListResponse(BaseModel):
    items: list[DocumentResponse]
    total: int
    page: int
    page_size: int


class DocumentUploadForm(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    department: str | None = Field(default=None, max_length=100)
