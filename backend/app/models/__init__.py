import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class RagDocumentStatus(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    INDEXED = "INDEXED"
    FAILED = "FAILED"


class RagSourceType(str, enum.Enum):
    UPLOAD = "UPLOAD"
    CHAPTER = "CHAPTER"
    SOP = "SOP"
    COURSE = "COURSE"


class RagIngestionStatus(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class RagDocument(Base):
    __tablename__ = "rag_documents"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    filename: Mapped[str] = mapped_column(String, nullable=False)
    storage_key: Mapped[str] = mapped_column("storageKey", String, nullable=False)
    content_type: Mapped[str] = mapped_column("contentType", String, nullable=False)
    file_size: Mapped[int] = mapped_column("fileSize", Integer, nullable=False)
    department_id: Mapped[str | None] = mapped_column(
        "departmentId", String, nullable=True, index=True
    )
    uploaded_by_id: Mapped[str | None] = mapped_column(
        "uploadedById", String, nullable=True, index=True
    )
    status: Mapped[RagDocumentStatus] = mapped_column(
        Enum(RagDocumentStatus, name="RagDocumentStatus", native_enum=True),
        default=RagDocumentStatus.PENDING,
        index=True,
    )
    chunk_count: Mapped[int] = mapped_column("chunkCount", Integer, default=0)
    error_message: Mapped[str | None] = mapped_column("errorMessage", Text, nullable=True)
    source_type: Mapped[RagSourceType] = mapped_column(
        "sourceType",
        Enum(RagSourceType, name="RagSourceType", native_enum=True),
        default=RagSourceType.UPLOAD,
    )
    source_id: Mapped[str | None] = mapped_column("sourceId", String, nullable=True)
    pinecone_namespace: Mapped[str | None] = mapped_column("pineconeNamespace", String, nullable=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(
        "createdAt", DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        "updatedAt",
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    ingestion_jobs: Mapped[list["RagIngestionJob"]] = relationship(back_populates="document")


class RagIngestionJob(Base):
    __tablename__ = "rag_ingestion_jobs"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    document_id: Mapped[str] = mapped_column(
        "documentId", String, ForeignKey("rag_documents.id"), index=True
    )
    status: Mapped[RagIngestionStatus] = mapped_column(
        Enum(RagIngestionStatus, name="RagIngestionStatus", native_enum=True),
        default=RagIngestionStatus.PENDING,
    )
    started_at: Mapped[datetime | None] = mapped_column("startedAt", DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(
        "completedAt", DateTime(timezone=True), nullable=True
    )
    error_message: Mapped[str | None] = mapped_column("errorMessage", Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        "createdAt", DateTime(timezone=True), server_default=func.now()
    )

    document: Mapped["RagDocument"] = relationship(back_populates="ingestion_jobs")


# Backward-compatible aliases used by services during migration
Document = RagDocument
DocumentStatus = RagDocumentStatus
