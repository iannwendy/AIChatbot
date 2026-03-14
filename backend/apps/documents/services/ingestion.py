"""
Ingestion Pipeline - Orchestrates document processing: parse -> chunk -> embed -> store.
"""
import logging
from typing import Dict, Any

from .parsers import ParserFactory
from .chunker import TextChunker
from .vector_store import get_vector_store
from .config import CHUNK_SIZE, CHUNK_OVERLAP

logger = logging.getLogger(__name__)


class IngestionPipeline:
    """Full pipeline for processing documents into vector store."""

    def __init__(self):
        self.chunker = TextChunker(chunk_size=CHUNK_SIZE, chunk_overlap=CHUNK_OVERLAP)
        self.vector_store = get_vector_store()

    def process_document(self, document, force_reprocess: bool = False) -> Dict[str, Any]:
        """
        Process a document through the full RAG pipeline.

        Args:
            document: Django Document model instance
            force_reprocess: If True, delete existing chunks and re-process

        Returns:
            Dict with status, pages_extracted, chunks_created
        """
        # Check if already processed
        if document.is_processed and not force_reprocess:
            logger.info(f"Document {document.id} already processed, skipping")
            return {
                'status': 'skipped',
                'document_id': document.id,
                'message': 'Document already processed'
            }

        # Delete existing chunks if re-processing
        if force_reprocess and document.is_processed:
            logger.info(f"Re-processing document {document.id}, deleting old chunks")
            self.vector_store.delete_by_document_id(document.id)

        try:
            # Step 1: Read file content
            with document.file.open('rb') as f:
                file_content = f.read()

            # Step 2: Parse document
            logger.info(f"Parsing document {document.id} ({document.file_type})")
            pages = ParserFactory.parse(document.file_type, file_content)

            if not pages:
                raise ValueError("No text could be extracted from the document")

            # Step 3: Chunk text
            logger.info(f"Chunking {len(pages)} pages")
            chunks = self.chunker.chunk_pages(
                pages=pages,
                document_id=document.id,
                document_title=document.title,
                course_id=document.course_id,
            )

            if not chunks:
                raise ValueError("No chunks could be created from the document")

            # Step 4: Store in vector DB
            logger.info(f"Storing {len(chunks)} chunks in vector store")
            chunk_ids = self.vector_store.add_chunks(chunks)

            # Step 5: Update document status
            document.is_processed = True
            document.save(update_fields=['is_processed'])

            logger.info(
                f"Document {document.id} processed successfully: "
                f"{len(pages)} pages, {len(chunks)} chunks"
            )

            return {
                'status': 'success',
                'document_id': document.id,
                'pages_extracted': len(pages),
                'chunks_created': len(chunks),
            }

        except Exception as e:
            logger.error(f"Ingestion failed for document {document.id}: {str(e)}")
            # Mark as not processed on failure
            document.is_processed = False
            document.save(update_fields=['is_processed'])
            raise

    def delete_document(self, document_id: int) -> None:
        """Delete all vector chunks for a document."""
        self.vector_store.delete_by_document_id(document_id)
        logger.info(f"Deleted vector chunks for document {document_id}")