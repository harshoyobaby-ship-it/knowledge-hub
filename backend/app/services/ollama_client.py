import asyncio

import httpx
from tenacity import retry, stop_after_attempt, wait_fixed

from app.core.config import get_settings
from app.core.logging import get_logger

settings = get_settings()
logger = get_logger(__name__)


class OllamaClient:
    def __init__(self, base_url: str | None = None) -> None:
        self.base_url = (base_url or settings.ollama_base_url).rstrip("/")
        self._client = httpx.AsyncClient(
            timeout=httpx.Timeout(90.0, connect=5.0),
            limits=httpx.Limits(max_keepalive_connections=10, max_connections=20),
        )

    async def close(self) -> None:
        await self._client.aclose()

    @retry(stop=stop_after_attempt(2), wait=wait_fixed(0.5))
    async def embed(self, text: str, model: str | None = None) -> list[float]:
        model = model or settings.ollama_embed_model
        try:
            response = await self._client.post(
                f"{self.base_url}/api/embed",
                json={"model": model, "input": text},
            )
            response.raise_for_status()
            data = response.json()
            embeddings = data.get("embeddings")
            if embeddings:
                return embeddings[0]
            return data["embedding"]
        except Exception:
            response = await self._client.post(
                f"{self.base_url}/api/embeddings",
                json={"model": model, "prompt": text},
            )
            response.raise_for_status()
            return response.json()["embedding"]

    async def embed_batch(self, texts: list[str], model: str | None = None) -> list[list[float]]:
        if not texts:
            return []
        model = model or settings.ollama_embed_model

        # Batch embed when multiple texts (ingestion)
        if len(texts) > 1:
            response = await self._client.post(
                f"{self.base_url}/api/embed",
                json={"model": model, "input": texts},
            )
            response.raise_for_status()
            return response.json()["embeddings"]

        return [await self.embed(texts[0], model=model)]

    @retry(stop=stop_after_attempt(2), wait=wait_fixed(0.5))
    async def generate(self, prompt: str, model: str | None = None) -> str:
        model = model or settings.ollama_llm_model
        response = await self._client.post(
            f"{self.base_url}/api/generate",
            json={
                "model": model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.1,
                    "num_predict": settings.ollama_max_tokens,
                    "num_ctx": settings.ollama_num_ctx,
                },
            },
        )
        response.raise_for_status()
        return response.json().get("response", "").strip()

    async def health_check(self) -> bool:
        try:
            response = await self._client.get(f"{self.base_url}/api/tags")
            return response.status_code == 200
        except Exception as exc:
            logger.warning("ollama_health_check_failed", error=str(exc))
            return False
