from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Query, UploadFile, status

from app.core.kh_auth import AuthenticatedUser
from app.dependencies import get_current_user, get_document_service
from app.schemas.document import DocumentListResponse, DocumentResponse, DocumentUploadResponse
from app.services.document_service import DocumentService
from app.services.ingest_scheduler import schedule_ingest

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/upload", response_model=DocumentUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: str | None = Form(default=None),
    department_id: str | None = Form(default=None),
    current_user: AuthenticatedUser = Depends(get_current_user),
    document_service: DocumentService = Depends(get_document_service),
) -> DocumentUploadResponse:
    content = await file.read()
    filename = file.filename or "upload.bin"
    doc_title = (title or filename).rsplit(".", 1)[0].replace("_", " ").replace("-", " ").strip() or filename
    try:
        document = await document_service.upload(
            filename=filename,
            content=content,
            content_type=file.content_type,
            title=doc_title,
            department_id=department_id or current_user.department_id,
            uploaded_by_id=current_user.user_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    schedule_ingest(document.id, background_tasks)
    return DocumentUploadResponse.model_validate(document)


@router.get("", response_model=DocumentListResponse)
async def list_documents(
    department_id: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: AuthenticatedUser = Depends(get_current_user),
    document_service: DocumentService = Depends(get_document_service),
) -> DocumentListResponse:
    scoped_department = department_id or current_user.department_id
    if current_user.role in {"SUPER_ADMIN", "HR"}:
        scoped_department = department_id

    items, total = await document_service.list(
        department_id=scoped_department,
        page=page,
        page_size=page_size,
    )
    return DocumentListResponse(
        items=[DocumentResponse.model_validate(doc) for doc in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: str,
    _: AuthenticatedUser = Depends(get_current_user),
    document_service: DocumentService = Depends(get_document_service),
) -> DocumentResponse:
    document = await document_service.get(document_id)
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return DocumentResponse.model_validate(document)


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: str,
    _: AuthenticatedUser = Depends(get_current_user),
    document_service: DocumentService = Depends(get_document_service),
) -> None:
    try:
        await document_service.delete(document_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/reindex/{document_id}", response_model=DocumentResponse)
async def reindex_document(
    document_id: str,
    background_tasks: BackgroundTasks,
    _: AuthenticatedUser = Depends(get_current_user),
    document_service: DocumentService = Depends(get_document_service),
) -> DocumentResponse:
    document = await document_service.get(document_id)
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    schedule_ingest(document_id, background_tasks)
    return DocumentResponse.model_validate(document)
