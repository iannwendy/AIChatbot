"""
RAG Pipeline Configuration
"""
import os
from django.conf import settings

# ChromaDB Settings
CHROMA_HOST = os.getenv('CHROMA_HOST', 'chromadb')
CHROMA_PORT = int(os.getenv('CHROMA_PORT', '8000'))
CHROMA_COLLECTION_NAME = os.getenv('CHROMA_COLLECTION', 'document_chunks')

# Embedding Settings
EMBEDDING_MODEL = os.getenv('EMBEDDING_MODEL', 'models/text-embedding-004')

# LLM Settings
LLM_MODEL = os.getenv('LLM_MODEL', 'gemini-1.5-flash')
LLM_TEMPERATURE = float(os.getenv('LLM_TEMPERATURE', '0.3'))
LLM_MAX_TOKENS = int(os.getenv('LLM_MAX_TOKENS', '1000'))

# Chunking Settings
CHUNK_SIZE = int(os.getenv('CHUNK_SIZE', '1000'))
CHUNK_OVERLAP = int(os.getenv('CHUNK_OVERLAP', '200'))

# Retrieval Settings
RETRIEVAL_TOP_K = int(os.getenv('RETRIEVAL_TOP_K', '5'))

# Memory Settings
MEMORY_WINDOW_SIZE = int(os.getenv('MEMORY_WINDOW_SIZE', '10'))

# Available Models for Selection
AVAILABLE_MODELS = [
    {'id': 'gemini-1.5-flash', 'name': 'Gemini 1.5 Flash (Nhanh)', 'temperature': 0.3},
    {'id': 'gemini-1.5-pro', 'name': 'Gemini 1.5 Pro (Thông minh)', 'temperature': 0.3},
    {'id': 'gemini-2.0-flash', 'name': 'Gemini 2.0 Flash (Mới)', 'temperature': 0.3},
]
