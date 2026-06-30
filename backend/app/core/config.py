from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Monorepo root .env (single source of truth for all apps)
_MONOREPO_ROOT = Path(__file__).resolve().parents[3]
_ENV_FILE = _MONOREPO_ROOT / ".env"


def _to_asyncpg_url(url: str) -> str:
    if url.startswith("postgresql+asyncpg://"):
        return url
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+asyncpg://", 1)
    return url


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "Kharesiya RAG Service"
    app_env: str = "development"
    debug: bool = False
    api_prefix: str = "/api/v1"
    allowed_origins: str = "http://localhost:3000"

    host: str = "0.0.0.0"
    port: int = 8000

    # Shared with frontend — keep env var names consistent across the monorepo.
    # - DATABASE_URL: pooled URL (pgbouncer) typically used by apps
    # - DIRECT_URL: direct Postgres URL, preferred for long-running queries/migrations
    database_url: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/postgres",
        validation_alias="DATABASE_URL",
    )
    direct_url: str = Field(default="", validation_alias="DIRECT_URL")

    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str = "redis://localhost:6379/1"
    celery_result_backend: str = "redis://localhost:6379/2"

    ollama_base_url: str = "http://localhost:11434"
    ollama_llm_model: str = "qwen3:8b"
    ollama_embed_model: str = "nomic-embed-text"
    ollama_max_tokens: int = 300
    ollama_num_ctx: int = 2048

    llm_provider: str = "ollama"
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

    # Must match Knowledge Hub JWT_SECRET
    jwt_secret: str = Field(default="fallback-secret-key", validation_alias="JWT_SECRET")
    jwt_algorithm: str = "HS256"

    chunk_size: int = 800
    chunk_overlap: int = 150
    default_top_k: int = 3
    cache_ttl_seconds: int = 300

    rate_limit_per_minute: int = 60
    local_dev: bool = False
    use_celery: bool = True
    vector_store: str = "auto"

    @field_validator("database_url", mode="before")
    @classmethod
    def resolve_database_url(cls, value: str) -> str:
        return _to_asyncpg_url(value)

    @property
    def sqlalchemy_database_url(self) -> str:
        if self.direct_url:
            return _to_asyncpg_url(self.direct_url)
        return self.database_url

    @property
    def use_pinecone(self) -> bool:
        if self.vector_store == "pinecone":
            return True
        if self.vector_store == "local":
            return False
        return self.pinecone_api_key.strip().lower() not in {
            "",
            "your-pinecone-api-key",
            "changeme",
        }

    @property
    def is_sqlite(self) -> bool:
        return self.sqlalchemy_database_url.startswith("sqlite")

    @property
    def max_upload_size_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
