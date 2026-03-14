"""
BM25 Index Service - Keyword-based search using BM25 algorithm.
Used alongside vector search for hybrid retrieval.
"""
import logging
import re
from typing import List, Dict, Any, Optional

from rank_bm25 import BM25Okapi

from .vector_store import get_vector_store

logger = logging.getLogger(__name__)


def tokenize(text: str) -> List[str]:
    """Simple tokenizer: lowercase, split on non-alphanumeric."""
    return re.findall(r'\w+', text.lower())


class BM25IndexService:
    """In-memory BM25 index per course for keyword search."""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._indexes = {}
            cls._instance._docs = {}
        return cls._instance

    def build_index_for_course(self, course_id: int) -> int:
        """
        Build BM25 index from ChromaDB chunks for a course.
        Returns number of documents indexed.
        """
        vs = get_vector_store()
        try:
            collection = vs.client.get_collection(vs.vectorstore._collection.name)
            results = collection.get(
                where={"course_id": str(course_id)},
                include=["documents", "metadatas"],
            )
        except Exception as e:
            logger.error(f"Failed to fetch chunks for course {course_id}: {e}")
            return 0

        if not results or not results.get("documents"):
            return 0

        docs = []
        tokenized = []
        for text, meta in zip(results["documents"], results["metadatas"]):
            docs.append({"text": text, "metadata": meta})
            tokenized.append(tokenize(text))

        self._docs[course_id] = docs
        self._indexes[course_id] = BM25Okapi(tokenized)

        logger.info(f"BM25 index built for course {course_id}: {len(docs)} chunks")
        return len(docs)

    def search(
        self,
        query: str,
        course_id: int,
        top_k: int = 5,
    ) -> List[Dict[str, Any]]:
        """
        Search using BM25 keyword matching.
        Auto-builds index if not cached.
        """
        if course_id not in self._indexes:
            count = self.build_index_for_course(course_id)
            if count == 0:
                return []

        tokens = tokenize(query)
        if not tokens:
            return []

        scores = self._indexes[course_id].get_scores(tokens)
        ranked = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:top_k]

        results = []
        for idx in ranked:
            if scores[idx] > 0:
                doc = self._docs[course_id][idx]
                results.append({
                    "text": doc["text"],
                    "metadata": doc["metadata"],
                    "score": float(scores[idx]),
                })

        return results

    def invalidate(self, course_id: int) -> None:
        """Remove cached index for a course (call after re-processing docs)."""
        self._indexes.pop(course_id, None)
        self._docs.pop(course_id, None)


def get_bm25_index() -> BM25IndexService:
    return BM25IndexService()
