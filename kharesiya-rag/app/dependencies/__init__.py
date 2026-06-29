from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import decode_access_token
from app.models import User
from app.repositories import ApiKeyRepository, DocumentRepository, UserRepository
from app.services.auth_service import AuthService
from app.services.document_service import DocumentService
from app.services.ingestion_service import IngestionService
from app.services.rag_service import RAGService

settings = get_settings()
bearer_scheme = HTTPBearer(auto_error=False)


async def get_user_repo(session: AsyncSession = Depends(get_db)) -> UserRepository:
    return UserRepository(session)


async def get_api_key_repo(session: AsyncSession = Depends(get_db)) -> ApiKeyRepository:
    return ApiKeyRepository(session)


async def get_document_repo(session: AsyncSession = Depends(get_db)) -> DocumentRepository:
    return DocumentRepository(session)


async def get_auth_service(
    user_repo: UserRepository = Depends(get_user_repo),
    api_key_repo: ApiKeyRepository = Depends(get_api_key_repo),
) -> AuthService:
    return AuthService(user_repo, api_key_repo)


async def get_document_service(
    document_repo: DocumentRepository = Depends(get_document_repo),
) -> DocumentService:
    return DocumentService(document_repo)


async def get_ingestion_service(
    document_repo: DocumentRepository = Depends(get_document_repo),
) -> IngestionService:
    return IngestionService(document_repo)


async def get_rag_service() -> RAGService:
    return RAGService()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    x_api_key: str | None = Header(default=None, alias=settings.api_key_header),
    auth_service: AuthService = Depends(get_auth_service),
    user_repo: UserRepository = Depends(get_user_repo),
) -> User:
    if x_api_key:
        user = await auth_service.authenticate_api_key(x_api_key)
        if user:
            return user
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
        )

    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(credentials.credentials)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    from uuid import UUID

    user = await user_repo.get_by_id(UUID(payload["sub"]))
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )
    return user
