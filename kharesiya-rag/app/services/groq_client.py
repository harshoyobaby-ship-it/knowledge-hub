import httpx
from tenacity import retry, retry_if_exception, stop_after_attempt, wait_fixed

from app.core.config import get_settings
from app.core.exceptions import LLMServiceError
from app.core.logging import get_logger

settings = get_settings()
logger = get_logger(__name__)

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"


def _retryable_groq_error(exc: BaseException) -> bool:
    if isinstance(exc, httpx.HTTPStatusError):
        return exc.response.status_code >= 500
    return isinstance(exc, (httpx.ConnectError, httpx.TimeoutException))


class GroqClient:
    def __init__(self, api_key: str | None = None) -> None:
        self.api_key = api_key or settings.groq_api_key
        self._client = httpx.AsyncClient(
            timeout=httpx.Timeout(60.0, connect=10.0),
            limits=httpx.Limits(max_keepalive_connections=10, max_connections=20),
        )

    async def close(self) -> None:
        await self._client.aclose()

    @retry(
        stop=stop_after_attempt(2),
        wait=wait_fixed(0.5),
        retry=retry_if_exception(_retryable_groq_error),
        reraise=True,
    )
    async def generate(self, system: str, user: str) -> str:
        if not self.api_key or self.api_key == "your-groq-api-key":
            raise LLMServiceError(
                "Groq API key is not configured. Add GROQ_API_KEY to your .env file and restart the server."
            )

        try:
            response = await self._client.post(
                GROQ_API_URL,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.groq_model,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": user},
                    ],
                    "temperature": 0.1,
                    "max_tokens": settings.groq_max_tokens,
                },
            )
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 401:
                raise LLMServiceError(
                    "Groq rejected the API key (401). Check GROQ_API_KEY in .env and restart the server."
                ) from exc
            if exc.response.status_code == 429:
                raise LLMServiceError("Groq rate limit reached. Please wait a moment and try again.") from exc
            raise LLMServiceError(f"Groq request failed ({exc.response.status_code}).") from exc
        except httpx.RequestError as exc:
            raise LLMServiceError("Could not reach Groq. Check your internet connection.") from exc

        data = response.json()
        return data["choices"][0]["message"]["content"].strip()

    async def health_check(self) -> bool:
        if not self.api_key:
            return False
        try:
            response = await self._client.get(
                "https://api.groq.com/openai/v1/models",
                headers={"Authorization": f"Bearer {self.api_key}"},
            )
            return response.status_code == 200
        except Exception as exc:
            logger.warning("groq_health_check_failed", error=str(exc))
            return False
