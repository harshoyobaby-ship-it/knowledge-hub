class LLMServiceError(Exception):
    """Raised when the configured LLM provider cannot complete a request."""


class VectorStoreError(Exception):
    """Raised when the vector store cannot complete a request."""
