#!/usr/bin/env python3
"""Verify Pinecone connection and index configuration."""

import asyncio
import sys

from app.core.config import get_settings
from app.services.vector.pinecone_store import PineconeVectorStore


async def main() -> int:
    settings = get_settings()

    if not settings.use_pinecone:
        print("ERROR: Pinecone is not enabled.")
        print("Set VECTOR_STORE=pinecone and PINECONE_API_KEY in .env")
        return 1

    print(f"Index: {settings.pinecone_index_name}")
    print(f"Dimension: {settings.pinecone_dimension}")
    print(f"Region: {settings.pinecone_cloud}/{settings.pinecone_region}")

    store = PineconeVectorStore()
    ok = await store.health_check()
    if ok:
        print("Pinecone connection: OK")
        return 0

    print("Pinecone connection: FAILED")
    return 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
