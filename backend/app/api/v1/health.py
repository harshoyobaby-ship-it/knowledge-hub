from fastapi import APIRouter
from prometheus_client import CONTENT_TYPE_LATEST, Counter, generate_latest
from starlette.responses import Response
from sqlalchemy import text

from app.core.database import engine
from app.core.redis import get_redis
from app.core.config import get_settings
from app.schemas.health import HealthResponse
from app.services.llm.factory import get_llm_client
from app.services.embedder.factory import get_embedder
from app.services.vector.factory import get_vector_store

router = APIRouter(tags=["health"])
settings = get_settings()

REQUEST_COUNT = Counter("kharesiya_requests_total", "Total HTTP requests", ["endpoint"])


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    # Fast liveness probe for Render — must respond in <5s.
    return HealthResponse(status="healthy", version="1.0.0", services={"api": "healthy"})


@router.get("/health/ready", response_model=HealthResponse)
async def readiness_check() -> HealthResponse:
    services: dict[str, str] = {}

    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        services["database"] = "healthy"
    except Exception:
        services["database"] = "unhealthy"

    try:
        redis = await get_redis()
        await redis.ping()
        services["redis"] = "healthy"
    except Exception:
        services["redis"] = "unhealthy"

    embedder = get_embedder()
    embedder_name = "ollama_embeddings" if settings.local_dev else "embeddings"
    services[embedder_name] = "healthy" if await embedder.health_check() else "unhealthy"

    llm = get_llm_client()
    llm_name = settings.llm_provider
    services[llm_name] = "healthy" if await llm.health_check() else "unhealthy"

    vector_store = get_vector_store()
    store_name = "pinecone" if settings.use_pinecone else "local_vectors"
    services[store_name] = "healthy" if await vector_store.health_check() else "unhealthy"

    critical = ["database", embedder_name, llm_name, store_name]
    overall = "healthy" if all(services.get(s) == "healthy" for s in critical) else "degraded"

    return HealthResponse(
        status=overall,
        version="1.0.0",
        services=services,
    )


@router.get("/metrics")
async def metrics() -> Response:
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)
