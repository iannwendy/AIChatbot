"""
Embedding Service - OpenAI embeddings wrapper.
"""
import logging
from typing import List, Optional

from langchain_openai import OpenAIEmbeddings
from django.conf import settings

from .config import EMBEDDING_MODEL

logger = logging.getLogger(__name__)


class EmbeddingService:
    """Wrapper for OpenAI embeddings."""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        api_key = settings.OPENAI_API_KEY
        if not api_key:
            raise ValueError("OPENAI_API_KEY not configured in settings")

        self.embeddings = OpenAIEmbeddings(
            model=EMBEDDING_MODEL,
            api_key=api_key,
        )
        self._initialized = True
        logger.info(f"EmbeddingService initialized with model: {EMBEDDING_MODEL}")

    def embed_query(self, text: str) -> List[float]:
        """Embed a single query text."""
        return self.embeddings.embed_query(text)

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Embed multiple documents."""
        return self.embeddings.embed_documents(texts)


def get_embedding_service() -> EmbeddingService:
    """Get singleton embedding service instance."""
    return EmbeddingService()