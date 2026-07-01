import ssl
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import get_settings

settings = get_settings()


def _engine_connect_args() -> dict:
    url = settings.sqlalchemy_database_url
    args: dict = {}
    if url.startswith("postgresql"):
        # Supabase / managed Postgres require SSL; pgbouncer needs no statement cache.
        args["ssl"] = ssl.create_default_context()
        if ":6543" in url or "pgbouncer=true" in url.lower():
            args["statement_cache_size"] = 0
    return args


engine = create_async_engine(
    settings.sqlalchemy_database_url,
    echo=settings.debug,
    pool_pre_ping=True,
    connect_args=_engine_connect_args(),
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
