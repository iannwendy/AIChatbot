"""
Vector Store - ChromaDB operations for storing and retrieving embeddings.
"""
import logging
from typing import List, Dict, Any, Optional

import chromadb
from chromadb.config import Settings

from langchain_chroma import Chroma

from .config import CHROMA_HOST, CHROMA_PORT, CHROMA_COLLECTION_NAME
from .embedder import get_embedding_service

logger = logging.getLogger(__name__)


class VectorStoreService:
    """ChromaDB vector store operations."""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        self.client = chromadb.HttpClient(
            host=CHROMA_HOST,
            port=CHROMA_PORT,
            settings=Settings(anonymized_telemetry=False),
        )

        self.vectorstore = Chroma(
            client=self.client,
            collection_name=CHROMA_COLLECTION_NAME,
            embedding_function=get_embedding_service().embeddings,
        )

        self._initialized = True
        logger.info(f"VectorStore connected to {CHROMA_HOST}:{CHROMA_PORT}, collection: {CHROMA_COLLECTION_NAME}")

    def add_chunks(self, chunks: List[Dict[str, Any]]) -> List[str]:
        """
        Add document chunks to the vector store.

        Args:
            chunks: List of chunk dicts with 'text' and 'metadata'

        Returns:
            List of chunk IDs
        """
        texts = [chunk['text'] for chunk in chunks]
        metadatas = [chunk['metadata'] for chunk in chunks]
        ids = [
            f"doc_{m['document_id']}_page_{m['page_number']}_chunk_{m['chunk_index']}"
            for m in metadatas
        ]

        self.vectorstore.add_texts(texts=texts, metadatas=metadatas, ids=ids)
        logger.info(f"Added {len(chunks)} chunks to vector store")
        return ids

    def similarity_search(
        self,
        query: str,
        k: int = 5,
        filter_criteria: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Search for similar documents.

        Args:
            query: Search query
            k: Number of results to return
            filter_criteria: Optional metadata filter (e.g., {'course_id': 1})

        Returns:
            List of dicts with 'text', 'metadata', 'score'
        """
        docs_with_scores = self.vectorstore.similarity_search_with_score(
            query=query,
            k=k,
            filter=filter_criteria,
        )

        results = []
        for doc, score in docs_with_scores:
            results.append({
                'text': doc.page_content,
                'metadata': doc.metadata,
                'score': float(score),  # Convert to native Python float
            })

        logger.info(f"Similarity search returned {len(results)} results for query: {query[:50]}...")
        return results

    def delete_by_document_id(self, document_id: int) -> None:
        """
        Delete all chunks for a specific document.

        Args:
            document_id: Document ID to delete
        """
        try:
            self.vectorstore.delete(where={'document_id': document_id})
            logger.info(f"Deleted chunks for document {document_id}")
        except Exception as e:
            logger.warning(f"Error deleting document {document_id}: {e}")

    def delete_collection(self) -> None:
        """Delete the entire collection."""
        self.client.delete_collection(CHROMA_COLLECTION_NAME)
        logger.info(f"Deleted collection: {CHROMA_COLLECTION_NAME}")

    def get_collection_info(self) -> Dict[str, Any]:
        """Get information about the collection."""
        try:
            collection = self.client.get_collection(CHROMA_COLLECTION_NAME)
            return {
                'name': collection.name,
                'count': collection.count(),
            }
        except Exception as e:
            logger.warning(f"Could not get collection info: {e}")
            return {'error': str(e)}


def get_vector_store() -> VectorStoreService:
    """Get singleton vector store instance."""
    return VectorStoreService()