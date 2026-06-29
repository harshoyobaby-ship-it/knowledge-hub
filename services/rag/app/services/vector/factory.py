from app.core.config import get_settings
from app.core.interfaces.vector_store import VectorStore
from app.core.logging import get_logger
from app.services.vector.local_store import LocalVectorStore
from app.services.vector.pinecone_store import PineconeVectorStore

settings = get_settings()
logger = get_logger(__name__)


def get_vector_store() -> VectorStore:
    if settings.use_pinecone:
        logger.info("using_vector_store", backend="pinecone", index=settings.pinecone_index_name)
        return PineconeVectorStore()
    logger.info("using_vector_store", backend="local")
    return LocalVectorStore()
