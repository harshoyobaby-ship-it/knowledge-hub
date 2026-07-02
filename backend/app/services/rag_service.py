from app.core.config import get_settings
from app.core.logging import get_logger
from app.schemas.chat import ChatRequest, ChatResponse, SearchResponse
from app.services.embedder.factory import get_embedder
from app.core.interfaces.vector_store import VectorStore
from app.services.llm.factory import get_llm_client
from app.services.vector.factory import get_vector_store
from app.utils.cache import get_cached, set_cached

settings = get_settings()
logger = get_logger(__name__)

SYSTEM_PROMPT = """You are KharesiyaAI, the company-wide assistant for all employees.
Help anyone in the company with policies, procedures, HR, IT, operations, finance, and other official knowledge.
Answer ONLY from the context below. Be brief and direct (max 120 words).
Use bullet points for steps. Never mention documents, pages, or sources."""


class RAGService:
    def __init__(
        self,
        vector_store: VectorStore | None = None,
        embedder=None,
        llm=None,
    ) -> None:
        self.vector_store = vector_store or get_vector_store()
        self.embedder = embedder or get_embedder()
        self.llm = llm or get_llm_client()

    def _department_filter(self, department_id: str | None) -> dict | None:
        """Scope retrieval to a user's department, but always include company-wide docs.

        We treat `department_id == ""` as "company-wide" in vector metadata.
        """
        if not department_id:
            return None
        return {"$or": [{"department_id": department_id}, {"department_id": ""}]}

    def _build_context(self, results: list) -> str:
        parts: list[str] = []
        for result in results[: settings.default_top_k]:
            text = (result.metadata.get("text") or "")[:500]
            if text:
                parts.append(text)
        return "\n\n".join(parts)

    def _cache_key(self, request: ChatRequest, department_id: str | None) -> str:
        provider = settings.llm_provider
        dept = department_id or "all"
        return f"{provider}|{dept}|{request.question}|{request.top_k}"

    async def chat(self, request: ChatRequest, department_id: str | None = None) -> ChatResponse:
        cache_key = self._cache_key(request, department_id)
        cached = get_cached("chat", cache_key, settings.cache_ttl_seconds)
        if cached:
            return ChatResponse(answer=cached, sources=[])

        top_k = min(request.top_k, settings.default_top_k)
        metadata_filter = self._department_filter(department_id)

        query_embedding = get_cached("embed", request.question, settings.cache_ttl_seconds)
        if not query_embedding:
            query_embedding = await self.embedder.embed(request.question)
            set_cached("embed", request.question, query_embedding)

        results = await self.vector_store.query(
            vector=query_embedding,
            top_k=top_k,
            filter_metadata=metadata_filter,
        )

        if not results:
            return ChatResponse(
                answer="I don't have enough company information to answer that yet. Ask your admin to upload relevant documents.",
                sources=[],
            )

        context = self._build_context(results)
        user_message = f"Context:\n{context}\n\nQuestion: {request.question}"

        answer = await self.llm.generate(SYSTEM_PROMPT, user_message)
        set_cached("chat", cache_key, answer)
        return ChatResponse(answer=answer, sources=[])

    async def search(
        self,
        query: str,
        department_id: str | None,
        top_k: int,
    ) -> SearchResponse:
        from app.schemas.chat import SearchResult

        query_embedding = await self.embedder.embed(query)
        results = await self.vector_store.query(
            vector=query_embedding,
            top_k=top_k,
            filter_metadata=self._department_filter(department_id),
        )

        return SearchResponse(
            results=[
                SearchResult(
                    document=r.metadata.get("title", "Unknown"),
                    page=r.metadata.get("page"),
                    score=r.score,
                    snippet=r.metadata.get("text", "")[:500],
                    document_id=r.metadata.get("document_id"),
                )
                for r in results
            ]
        )
