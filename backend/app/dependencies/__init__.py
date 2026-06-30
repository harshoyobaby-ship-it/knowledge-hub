from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.kh_auth import AuthenticatedUser, decode_kh_token
from app.repositories import DocumentRepository
from app.services.document_service import DocumentService
from app.services.ingestion_service import IngestionService
from app.services.rag_service import RAGService

bearer_scheme = HTTPBearer(auto_error=False)


async def get_document_repo(session: AsyncSession = Depends(get_db)) -> DocumentRepository:
    return DocumentRepository(session)


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
) -> AuthenticatedUser:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = decode_kh_token(credentials.credentials)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user
