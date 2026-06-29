from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)
    department: str | None = Field(
        default=None,
        max_length=100,
        deprecated=True,
        description="Ignored — searches all company knowledge",
    )
    top_k: int = Field(default=3, ge=1, le=20)


class SourceCitation(BaseModel):
    document: str
    page: int | None = None
    score: float
    document_id: str | None = None
    chunk_index: int | None = None


class ChatResponse(BaseModel):
    answer: str
    sources: list[SourceCitation]


class SearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=2000)
    department: str | None = None
    top_k: int = Field(default=5, ge=1, le=20)


class SearchResult(BaseModel):
    document: str
    page: int | None = None
    score: float
    snippet: str
    document_id: str | None = None


class SearchResponse(BaseModel):
    results: list[SearchResult]
