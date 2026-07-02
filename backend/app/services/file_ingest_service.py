from __future__ import annotations

import re
from pathlib import Path

from app.core.config import get_settings
from app.core.interfaces.vector_store import VectorRecord
from app.services.embedder.factory import get_embedder
from app.services.vector.factory import get_vector_store
from app.utils.extractors import extract_text
from app.utils.text import chunk_text, clean_text, make_chunk_id, validate_file_extension

settings = get_settings()


def slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug or "document"


def _safe_filename(filename: str) -> str:
    return Path(filename).name.replace("..", "").strip() or "upload.bin"


async def ingest_upload_file(
    filename: str,
    content: bytes,
    *,
    title: str | None = None,
    department_id: str | None = None,
    uploaded_by: str | None = None,
    document_id: str | None = None,
    persist_file: bool = True,
) -> dict[str, str | int]:
    validate_file_extension(filename)

    safe_name = _safe_filename(filename)
    stem = Path(safe_name).stem
    doc_id = document_id or f"upload:{slugify(stem)}"
    doc_title = (title or stem).replace("_", " ").replace("-", " ").strip() or safe_name
    dept = (department_id or "").strip()

    if persist_file:
        storage_dir = Path(settings.documents_dir)
        storage_dir.mkdir(parents=True, exist_ok=True)
        (storage_dir / safe_name).write_bytes(content)

    extension = f".{safe_name.rsplit('.', 1)[-1].lower()}"
    pages = extract_text(content, extension)

    vector_store = get_vector_store()
    embedder = get_embedder()
    await vector_store.delete_by_document(doc_id)

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
        raise ValueError(f"No text could be extracted from {safe_name}")

    texts = [chunk for _, _, chunk in all_chunks]
    embeddings = await embedder.embed_batch(texts)

    records: list[VectorRecord] = []
    for global_idx, ((page_num, _, chunk_text_content), embedding) in enumerate(
        zip(all_chunks, embeddings, strict=True)
    ):
        records.append(
            VectorRecord(
                id=make_chunk_id(doc_id, global_idx),
                values=embedding,
                metadata={
                    "document_id": doc_id,
                    "title": doc_title,
                    "department_id": dept,
                    "page": page_num,
                    "chunk_index": global_idx,
                    "version": 1,
                    "uploaded_by": uploaded_by or "",
                    "text": chunk_text_content[:1000],
                    "source_type": "UPLOAD",
                    "filename": safe_name,
                },
            )
        )

    batch_size = 100
    for i in range(0, len(records), batch_size):
        await vector_store.upsert(records[i : i + batch_size])

    return {
        "document_id": doc_id,
        "title": doc_title,
        "filename": safe_name,
        "chunks": len(records),
        "department_id": dept,
    }
