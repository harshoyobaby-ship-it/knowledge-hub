from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import RagDocument, RagDocumentStatus


class DocumentRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, document: RagDocument) -> RagDocument:
        self.session.add(document)
        await self.session.flush()
        return document

    async def get_by_id(self, document_id: str) -> RagDocument | None:
        result = await self.session.execute(select(RagDocument).where(RagDocument.id == document_id))
        return result.scalar_one_or_none()

    async def list_documents(
        self,
        department_id: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[RagDocument], int]:
        query = select(RagDocument)
        count_query = select(func.count()).select_from(RagDocument)

        if department_id:
            query = query.where(RagDocument.department_id == department_id)
            count_query = count_query.where(RagDocument.department_id == department_id)

        total_result = await self.session.execute(count_query)
        total = total_result.scalar_one()

        offset = (page - 1) * page_size
        query = query.order_by(RagDocument.created_at.desc()).offset(offset).limit(page_size)
        result = await self.session.execute(query)
        return list(result.scalars().all()), total

    async def update(self, document: RagDocument) -> RagDocument:
        await self.session.flush()
        return document

    async def delete(self, document: RagDocument) -> None:
        await self.session.delete(document)
        await self.session.flush()
