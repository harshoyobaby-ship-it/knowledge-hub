from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.exceptions import LLMServiceError, VectorStoreError
from app.dependencies import get_current_user, get_rag_service
from app.models import User
from app.schemas.chat import ChatRequest, ChatResponse, SearchResponse
from app.services.rag_service import RAGService

router = APIRouter(tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    _: User = Depends(get_current_user),
    rag_service: RAGService = Depends(get_rag_service),
) -> ChatResponse:
    try:
        return await rag_service.chat(request)
    except LLMServiceError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except VectorStoreError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc


@router.get("/search", response_model=SearchResponse)
async def search(
    query: str = Query(..., min_length=1),
    department: str | None = Query(default=None),
    top_k: int = Query(default=5, ge=1, le=20),
    _: User = Depends(get_current_user),
    rag_service: RAGService = Depends(get_rag_service),
) -> SearchResponse:
    return await rag_service.search(query=query, department=department, top_k=top_k)
