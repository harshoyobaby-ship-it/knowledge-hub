from app.core.config import get_settings
from app.services.embedder.fastembed_client import FastEmbedClient
from app.services.ollama_client import OllamaClient

settings = get_settings()


def get_embedder() -> OllamaClient | FastEmbedClient:
    if settings.local_dev:
        return OllamaClient()
    return FastEmbedClient()
