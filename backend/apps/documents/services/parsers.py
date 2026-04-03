"""
Document Parsers - Extract text from PDF, DOCX, TXT files with page tracking.
"""
import io
import logging
from abc import ABC, abstractmethod
from typing import List, Dict, Any

from PyPDF2 import PdfReader
from docx import Document as DocxDocument

logger = logging.getLogger(__name__)


class DocumentParser(ABC):
    """Base class for document parsers."""

    @abstractmethod
    def parse(self, file_content: bytes) -> List[Dict[str, Any]]:
        """
        Parse file content and return list of page dicts.
        Each dict: {'page_number': int, 'text': str, 'total_pages': int}
        """
        pass


class PDFParser(DocumentParser):
    """Extract text from PDF files, page by page."""

    def parse(self, file_content: bytes) -> List[Dict[str, Any]]:
        reader = PdfReader(io.BytesIO(file_content))
        total = len(reader.pages)
        pages = []

        for i, page in enumerate(reader.pages, start=1):
            text = page.extract_text() or ''
            if text.strip():
                pages.append({
                    'page_number': i,
                    'text': text.strip(),
                    'total_pages': total,
                })

        logger.info(f"PDF parsed: {len(pages)}/{total} pages with text")
        return pages


class DOCXParser(DocumentParser):
    """Extract text from DOCX files, split by headings into sections."""

    def parse(self, file_content: bytes) -> List[Dict[str, Any]]:
        doc = DocxDocument(io.BytesIO(file_content))
        sections = []
        current_text = []
        section_num = 1

        for para in doc.paragraphs:
            text = para.text.strip()
            if not text:
                continue

            # Split on headings to create logical sections
            if para.style.name.startswith('Heading') and current_text:
                sections.append({
                    'page_number': section_num,
                    'text': '\n'.join(current_text),
                    'total_pages': 0,  # Updated after processing
                })
                section_num += 1
                current_text = []

            current_text.append(text)

        # Add remaining text
        if current_text:
            sections.append({
                'page_number': section_num,
                'text': '\n'.join(current_text),
                'total_pages': 0,
            })

        # Update total_pages
        total = len(sections)
        for s in sections:
            s['total_pages'] = total

        logger.info(f"DOCX parsed: {total} sections")
        return sections


class TXTParser(DocumentParser):
    """Extract text from TXT files, split into logical chunks."""

    def parse(self, file_content: bytes) -> List[Dict[str, Any]]:
        text = file_content.decode('utf-8', errors='replace')
        lines = text.splitlines()

        # Group lines into ~1000-char blocks
        chunks = []
        current = []
        length = 0

        for line in lines:
            if length + len(line) > 1000 and current:
                chunks.append('\n'.join(current))
                current = []
                length = 0
            current.append(line)
            length += len(line)

        if current:
            chunks.append('\n'.join(current))

        total = len(chunks)
        pages = [
            {'page_number': i + 1, 'text': chunk.strip(), 'total_pages': total}
            for i, chunk in enumerate(chunks)
            if chunk.strip()
        ]

        logger.info(f"TXT parsed: {len(pages)} blocks")
        return pages


def extract_text_from_bytes(file_content: bytes, filename: str) -> str:
    """Extract all text from a file given its bytes and filename."""
    if not filename or '.' not in filename:
        return ''
    ext = filename.rsplit('.', 1)[-1].lower()
    try:
        pages = ParserFactory.parse(ext, file_content)
        return '\n\n'.join(p.get('text', '') for p in pages if p.get('text'))
    except Exception as e:
        logger.warning(f"extract_text_from_bytes failed for {filename}: {e}")
        return ''


def extract_pages_from_bytes(file_content: bytes, filename: str) -> List[Dict[str, Any]]:
    """
    Extract page-level structured data from a file.
    Returns list of {'page_number': int, 'text': str, 'total_pages': int}.
    Falls back to a single chunk if parsing fails.
    """
    if not filename or '.' not in filename:
        return []
    ext = filename.rsplit('.', 1)[-1].lower()
    try:
        return ParserFactory.parse(ext, file_content)
    except Exception as e:
        logger.warning(f"extract_pages_from_bytes failed for {filename}: {e}")
        return [{'page_number': 1, 'text': '', 'total_pages': 0}]


class ParserFactory:
    """Factory to get the right parser based on file type."""

    _parsers = {
        'pdf': PDFParser,
        'docx': DOCXParser,
        'txt': TXTParser,
    }

    @classmethod
    def parse(cls, file_type: str, file_content: bytes) -> List[Dict[str, Any]]:
        parser_class = cls._parsers.get(file_type.lower())
        if not parser_class:
            raise ValueError(f"Unsupported file type: {file_type}")
        return parser_class().parse(file_content)
