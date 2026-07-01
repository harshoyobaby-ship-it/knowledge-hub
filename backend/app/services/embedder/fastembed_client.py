import asyncio

from fastembed import TextEmbedding

from app.core.logging import get_logger

logger = get_logger(__name__)

# 768-dim model to match Pinecone index / Ollama nomic-embed-text
_MODEL_NAME = "BAAI/bge-base-en-v1.5"


class FastEmbedClient:
    def __init__(self) -> None:
        self._model: TextEmbedding | None = None

    def _get_model(self) -> TextEmbedding:
        if self._model is None:
            self._model = TextEmbedding(model_name=_MODEL_NAME)
        return self._model

    async def embed(self, text: str, model: str | None = None) -> list[float]:
        model_obj = self._get_model()
        embedding = await asyncio.to_thread(lambda: list(model_obj.embed([text]))[0])
        return embedding.tolist()

    async def embed_batch(self, texts: list[str], model: str | None = None) -> list[list[float]]:
        if not texts:
            return []
        model_obj = self._get_model()
        embeddings = await asyncio.to_thread(lambda: [vector.tolist() for vector in model_obj.embed(texts)])
        return embeddings

    async def health_check(self) -> bool:
        try:
            await self.embed("health")
            return True
        except Exception as exc:
            logger.warning("fastembed_health_check_failed", error=str(exc))
            return False
