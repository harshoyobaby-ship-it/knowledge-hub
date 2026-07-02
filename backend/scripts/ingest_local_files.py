"""Upload and ingest local files into the RAG knowledge base."""

from __future__ import annotations

import argparse
import asyncio
import mimetypes
import re
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.core.config import get_settings  # noqa: E402
from app.core.interfaces.vector_store import VectorRecord  # noqa: E402
from app.services.embedder.factory import get_embedder  # noqa: E402
from app.services.vector.factory import get_vector_store  # noqa: E402
from app.utils.extractors import extract_text  # noqa: E402
from app.utils.text import chunk_text, clean_text, make_chunk_id  # noqa: E402

settings = get_settings()


def slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug or "document"


async def ingest_vectors(
    path: Path,
    *,
    document_id: str | None = None,
    department_id: str = "",
) -> None:
    if not path.is_file():
        raise FileNotFoundError(path)

    doc_id = document_id or f"upload:{slugify(path.stem)}"
    title = path.stem.replace("_", " ").replace("-", " ").strip() or path.name
    content = path.read_bytes()
    extension = f".{path.suffix.lstrip('.').lower()}"
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
        raise ValueError(f"No text could be extracted from {path.name}")

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
                    "title": title,
                    "department_id": department_id,
                    "page": page_num,
                    "chunk_index": global_idx,
                    "version": 1,
                    "uploaded_by": "",
                    "text": chunk_text_content[:1000],
                    "source_type": "UPLOAD",
                    "filename": path.name,
                },
            )
        )

    batch_size = 100
    for i in range(0, len(records), batch_size):
        await vector_store.upsert(records[i : i + batch_size])

    print(f"indexed: {title} ({doc_id}) chunks={len(records)}")


async def main() -> None:
    parser = argparse.ArgumentParser(description="Ingest local files into RAG vectors")
    parser.add_argument("files", nargs="+", help="Paths to PDF/DOCX/etc files")
    parser.add_argument("--department-id", default="", help="Department scope (empty = company-wide)")
    args = parser.parse_args()

    for file_arg in args.files:
        await ingest_vectors(
            Path(file_arg).expanduser().resolve(),
            department_id=args.department_id,
        )


if __name__ == "__main__":
    asyncio.run(main())
