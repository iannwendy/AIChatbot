"""
Document Retriever - Hybrid search (BM25 + Vector) for RAG.
"""
import logging
from typing import List, Dict, Any, Optional

from ..services.vector_store import get_vector_store
from ..services.bm25_index import get_bm25_index
from ..services.config import RETRIEVAL_TOP_K

logger = logging.getLogger(__name__)


class DocumentRetriever:
    """Retrieve relevant document chunks using hybrid search."""

    def __init__(self, top_k: int = RETRIEVAL_TOP_K):
        self.vector_store = get_vector_store()
        self.bm25 = get_bm25_index()
        self.top_k = top_k

    def retrieve(
        self,
        query: str,
        course_id: Optional[int] = None,
        document_id: Optional[int] = None,
        top_k: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """Retrieve using vector search only (backward compatible)."""
        k = top_k or self.top_k

        filter_criteria = {}
        if course_id is not None:
            filter_criteria['course_id'] = int(course_id)
        if document_id is not None:
            filter_criteria['document_id'] = int(document_id)

        if not filter_criteria:
            filter_criteria = None

        results = self.vector_store.similarity_search(
            query=query,
            k=k,
            filter_criteria=filter_criteria,
        )

        logger.info(f"Vector retrieved {len(results)} chunks for: {query[:50]}...")
        return results

    def hybrid_retrieve(
        self,
        query: str,
        course_id: int,
        top_k: Optional[int] = None,
        vector_weight: float = 0.6,
        bm25_weight: float = 0.4,
    ) -> List[Dict[str, Any]]:
        """
        Hybrid search: combine BM25 keyword + vector semantic search.
        Uses Reciprocal Rank Fusion (RRF) to merge results.
        """
        k = top_k or self.top_k
        fetch_k = k * 3  # Fetch more to merge

        # Vector search
        vector_results = self.vector_store.similarity_search(
            query=query,
            k=fetch_k,
            filter_criteria={'course_id': int(course_id)},
        )

        # BM25 keyword search
        bm25_results = self.bm25.search(query, course_id, top_k=fetch_k)

        # Merge using RRF
        merged = self._reciprocal_rank_fusion(
            vector_results, bm25_results,
            vector_weight, bm25_weight,
            top_k=k,
        )

        logger.info(
            f"Hybrid search: {len(vector_results)} vector + {len(bm25_results)} BM25 "
            f"→ {len(merged)} merged for: {query[:50]}..."
        )
        return merged

    def _reciprocal_rank_fusion(
        self,
        vector_results: List[Dict],
        bm25_results: List[Dict],
        vector_weight: float,
        bm25_weight: float,
        top_k: int,
        rrf_k: int = 60,
    ) -> List[Dict[str, Any]]:
        """Merge two result lists using Reciprocal Rank Fusion."""
        scores = {}  # text_hash -> (score, result_dict)

        # Score vector results
        for rank, r in enumerate(vector_results):
            key = r['text'][:200]  # Use first 200 chars as key
            rrf_score = vector_weight / (rrf_k + rank + 1)
            if key in scores:
                scores[key] = (scores[key][0] + rrf_score, scores[key][1])
            else:
                scores[key] = (rrf_score, r)

        # Score BM25 results
        for rank, r in enumerate(bm25_results):
            key = r['text'][:200]
            rrf_score = bm25_weight / (rrf_k + rank + 1)
            if key in scores:
                scores[key] = (scores[key][0] + rrf_score, scores[key][1])
            else:
                scores[key] = (rrf_score, r)

        # Sort by combined score and take top_k
        ranked = sorted(scores.values(), key=lambda x: x[0], reverse=True)[:top_k]

        return [
            {**item[1], 'score': item[0]}
            for item in ranked
        ]

    def retrieve_with_context(
        self,
        query: str,
        course_id: Optional[int] = None,
        document_id: Optional[int] = None,
        top_k: Optional[int] = None,
        use_hybrid: bool = True,
    ) -> Dict[str, Any]:
        """
        Retrieve chunks and format as context + sources.
        Uses hybrid search (BM25 + Vector) by default.

        Args:
            query: User question
            course_id: Filter by course
            document_id: Filter by document (only for vector search)
            top_k: Number of results
            use_hybrid: Use hybrid search (default True)

        Returns:
            Dict with 'context', 'sources', 'has_results'
        """
        # Use hybrid search if course_id provided
        if use_hybrid and course_id is not None:
            results = self.hybrid_retrieve(query, course_id, top_k)
        else:
            results = self.retrieve(query, course_id, document_id, top_k)

        if not results:
            return {
                'context': '',
                'sources': [],
                'has_results': False,
            }

        # Format context as numbered blocks
        context_parts = []
        sources = []

        for i, result in enumerate(results, 1):
            meta = result['metadata']
            # Format a more readable source citation
            doc_title = meta.get('document_title', 'Unknown')
            page_num = meta.get('page_number')
            source_str = doc_title
            if page_num:
                source_str = f"{doc_title} - Trang {page_num}"

            context_parts.append(f"[{i}] {result['text']}\nNguồn: {source_str}")

            sources.append({
                'document_id': meta.get('document_id'),
                'document_title': doc_title,
                'page_number': page_num,
                'source': source_str,
                'relevance_score': result['score'],
            })

        return {
            'context': '\n\n'.join(context_parts),
            'sources': sources,
            'has_results': True,
        }