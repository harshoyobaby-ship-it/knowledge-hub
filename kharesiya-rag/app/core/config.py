from functools import lru_cache
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "KharesiyaAI"
    app_env: str = "development"
    debug: bool = False
    api_prefix: str = "/api/v1"
    secret_key: str = "change-me"
    allowed_origins: str = "http://localhost:3000"

    host: str = "0.0.0.0"
    port: int = 8000

    database_url: str = "postgresql+asyncpg://kharesiya:kharesiya@localhost:5432/kharesiya_rag"

    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str = "redis://localhost:6379/1"
    celery_result_backend: str = "redis://localhost:6379/2"

    ollama_base_url: str = "http://localhost:11434"
    ollama_llm_model: str = "qwen3:8b"
    ollama_embed_model: str = "nomic-embed-text"
    ollama_max_tokens: int = 300
    ollama_num_ctx: int = 2048

    llm_provider: str = "ollama"  # ollama | groq
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"
    groq_max_tokens: int = 300

    pinecone_api_key: str = ""
    pinecone_index_name: str = "kharesiya-knowledge"
    pinecone_cloud: str = "aws"
    pinecone_region: str = "us-east-1"
    pinecone_dimension: int = 768

    upload_dir: str = "./data/uploads"
    documents_dir: str = "./data/documents"
    max_upload_size_mb: int = 50

    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440
    api_key_header: str = "X-API-Key"

    chunk_size: int = 800
    chunk_overlap: int = 150
    default_top_k: int = 3
    cache_ttl_seconds: int = 300

    rate_limit_per_minute: int = 60
    local_dev: bool = False
    use_celery: bool = True
    vector_store: str = "auto"  # auto | pinecone | local

    @property
    def use_pinecone(self) -> bool:
        if self.vector_store == "pinecone":
            return True
        if self.vector_store == "local":
            return False
        # auto: use Pinecone when a real API key is configured
        return self.pinecone_api_key.strip().lower() not in {
            "",
            "your-pinecone-api-key",
            "changeme",
        }

    @property
    def is_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")

    @property
    def max_upload_size_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
