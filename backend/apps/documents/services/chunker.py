"""
Text Chunker - Split text into smaller chunks for embedding.
"""
import logging
from typing import List, Dict, Any

from langchain_text_splitters import RecursiveCharacterTextSplitter

from .config import CHUNK_SIZE, CHUNK_OVERLAP

logger = logging.getLogger(__name__)


class TextChunker:
    """Split text into overlapping chunks while preserving metadata."""

    def __init__(self, chunk_size: int = CHUNK_SIZE, chunk_overlap: int = CHUNK_OVERLAP):
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=['\n\n', '\n', '.', ' ', ''],
            keep_separator=False,
        )

    def chunk_pages(
        self,
        pages: List[Dict[str, Any]],
        document_id: int,
        document_title: str,
        course_id: int,
    ) -> List[Dict[str, Any]]:
        """
        Chunk each page into smaller pieces, preserving metadata.

        Args:
            pages: List of page dicts from parser
            document_id: Django document ID
            document_title: Document title
            course_id: Course ID for filtering

        Returns:
            List of chunk dicts with text and metadata
        """
        chunks = []

        for page in pages:
            page_text = page['text']
            page_num = page['page_number']

            # Skip empty pages
            if not page_text.strip():
                continue

            # Split page into chunks
            texts = self.splitter.split_text(page_text)

            for chunk_idx, text in enumerate(texts):
                if not text.strip():
                    continue

                chunk = {
                    'text': text,
                    'metadata': {
                        'document_id': document_id,
                        'document_title': document_title,
                        'course_id': course_id,
                        'page_number': page_num,
                        'chunk_index': chunk_idx,
                        'source': f"{document_title} - Trang {page_num}",
                    }
                }
                chunks.append(chunk)

        logger.info(f"Created {len(chunks)} chunks from {len(pages)} pages")
        return chunks