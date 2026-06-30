from app.core.config import get_settings
from app.core.interfaces.llm import LLMClient
from app.services.groq_client import GroqClient
from app.services.ollama_client import OllamaClient

settings = get_settings()


class OllamaLLM:
    def __init__(self, client: OllamaClient | None = None) -> None:
        self._client = client or OllamaClient()

    async def generate(self, system: str, user: str) -> str:
        prompt = f"{system}\n\n{user}\n\nAnswer:"
        return await self._client.generate(prompt)

    async def health_check(self) -> bool:
        return await self._client.health_check()


def get_llm_client() -> LLMClient:
    if settings.llm_provider == "groq":
        return GroqClient()
    return OllamaLLM()
