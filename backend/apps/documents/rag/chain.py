"""
RAG Chain - Retrieval-Augmented Generation chain with LLM.
"""
import logging
from typing import Dict, Any, Optional, List, Generator

from langchain_google_genai import ChatGoogleGenerativeAI
from django.conf import settings

from .retriever import DocumentRetriever
from ..services.config import LLM_MODEL, LLM_TEMPERATURE, LLM_MAX_TOKENS, RETRIEVAL_TOP_K

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """Bạn là trợ lý AI thông minh cho một nền tảng giáo dục.
Nhiệm vụ của bạn là hỗ trợ sinh viên trong học tập.

Quy tắc:
1. Nếu có tài liệu khóa học được cung cấp trong phần Context, ưu tiên trả lời dựa trên tài liệu đó và trích dẫn nguồn [1], [2].
2. Nếu không có tài liệu, hãy trả lời dựa trên kiến thức chung của bạn.
3. Trả lời bằng tiếng Việt, rõ ràng và dễ hiểu.
4. Luôn thân thiện và hữu ích."""


class RAGChain:
    """RAG chain: retrieve context + call LLM."""

    def __init__(self, model: Optional[str] = None):
        api_key = settings.GEMINI_API_KEY
        if not api_key:
            raise ValueError("GEMINI_API_KEY not configured")

        self.model = model or LLM_MODEL
        self.retriever = DocumentRetriever(top_k=RETRIEVAL_TOP_K)
        self.llm = ChatGoogleGenerativeAI(
            model=self.model,
            temperature=LLM_TEMPERATURE,
            max_tokens=LLM_MAX_TOKENS,
            google_api_key=api_key,
            thinking_budget=0,  # Disable thinking for real-time streaming
        )
        logger.info(f"RAGChain initialized with model: {self.model}")

    def invoke(
        self,
        question: str,
        course_id: Optional[int] = None,
        document_id: Optional[int] = None,
        top_k: int = RETRIEVAL_TOP_K,
    ) -> Dict[str, Any]:
        """
        Single-turn RAG: retrieve context and generate answer.

        Args:
            question: User question
            course_id: Filter by course
            document_id: Filter by document
            top_k: Number of chunks to retrieve

        Returns:
            Dict with 'answer', 'sources', 'has_context'
        """
        # Retrieve relevant context
        retrieval = self.retriever.retrieve_with_context(
            query=question,
            course_id=course_id,
            document_id=document_id,
            top_k=top_k,
        )

        # Build messages - always try to answer
        if retrieval['has_results']:
            user_content = (
                f"Context từ tài liệu khóa học:\n{retrieval['context']}\n\n"
                f"Câu hỏi: {question}"
            )
        else:
            user_content = f"Câu hỏi: {question}"

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ]

        try:
            response = self.llm.invoke(messages)
            answer = response.content
        except Exception as e:
            logger.error(f"LLM call failed: {e}")
            answer = "Xin lỗi, đã xảy ra lỗi khi tạo câu trả lời. Vui lòng thử lại."

        return {
            'answer': answer,
            'sources': retrieval['sources'],
            'has_context': retrieval['has_results'],
        }

    def invoke_with_history(
        self,
        question: str,
        course_id: Optional[int] = None,
        conversation_history: Optional[List[Dict[str, Any]]] = None,
        top_k: int = RETRIEVAL_TOP_K,
    ) -> Dict[str, Any]:
        """
        Multi-turn RAG with conversation history.

        Args:
            question: Current user question
            course_id: Filter by course
            conversation_history: List of {'role': 'user'|'assistant', 'content': str}
            top_k: Number of chunks to retrieve

        Returns:
            Dict with 'answer', 'sources', 'has_context'
        """
        # Retrieve relevant context
        retrieval = self.retriever.retrieve_with_context(
            query=question,
            course_id=course_id,
            top_k=top_k,
        )

        # Build messages with history
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]

        # Add context as system message if available
        if retrieval['has_results']:
            messages.append({
                "role": "system",
                "content": f"Context tài liệu:\n{retrieval['context']}"
            })

        # Add conversation history
        for msg in (conversation_history or []):
            role = msg.get('role', 'user')
            if role in ('user', 'assistant'):
                messages.append({
                    "role": role,
                    "content": msg.get('content', '')
                })

        # Add current question
        messages.append({"role": "user", "content": question})

        try:
            response = self.llm.invoke(messages)
            answer = response.content
        except Exception as e:
            logger.error(f"LLM call failed: {e}")
            answer = "Xin lỗi, đã xảy ra lỗi khi tạo câu trả lời. Vui lòng thử lại."

        return {
            'answer': answer,
            'sources': retrieval['sources'],
            'has_context': retrieval['has_results'],
        }

    def stream_with_history(
        self,
        question: str,
        course_id: Optional[int] = None,
        conversation_history: Optional[List[Dict[str, Any]]] = None,
        top_k: int = RETRIEVAL_TOP_K,
    ) -> Generator[str, None, Dict[str, Any]]:
        """
        Stream response token-by-token with conversation history.

        Yields:
            str: Token chunks for streaming
        Returns:
            Dict with final 'answer', 'sources', 'has_context'
        """
        # Retrieve relevant context
        retrieval = self.retriever.retrieve_with_context(
            query=question,
            course_id=course_id,
            top_k=top_k,
        )

        # Build messages with history
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]

        # Add context as system message if available
        if retrieval['has_results']:
            messages.append({
                "role": "system",
                "content": f"Context tài liệu:\n{retrieval['context']}"
            })

        # Add conversation history
        for msg in (conversation_history or []):
            role = msg.get('role', 'user')
            if role in ('user', 'assistant'):
                messages.append({
                    "role": role,
                    "content": msg.get('content', '')
                })

        # Add current question
        messages.append({"role": "user", "content": question})

        # Stream response
        full_response = ""
        try:
            for chunk in self.llm.stream(messages):
                if chunk.content:
                    full_response += chunk.content
                    yield chunk.content
        except Exception as e:
            logger.error(f"LLM stream failed: {e}")
            yield "Xin lỗi, đã xảy ra lỗi khi tạo câu trả lời. Vui lòng thử lại."

        # Return final response for MongoDB storage
        return {
            'answer': full_response,
            'sources': retrieval['sources'],
            'has_context': retrieval['has_results'],
        }
