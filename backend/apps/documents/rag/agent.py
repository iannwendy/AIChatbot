"""
RAG Agent - LLM with tool calling capability.
Decides when to search documents vs query database.
"""
import logging
from typing import Dict, Any, Optional, List, Generator

from langchain_google_genai import ChatGoogleGenerativeAI
from django.conf import settings

from .tools import AVAILABLE_TOOLS, execute_tool
from .retriever import DocumentRetriever
from ..services.config import LLM_MODEL, LLM_TEMPERATURE, LLM_MAX_TOKENS, RETRIEVAL_TOP_K

logger = logging.getLogger(__name__)

GENERAL_SYSTEM_PROMPT = """Bạn là trợ lý AI thông minh cho một nền tảng giáo dục.
Nhiệm vụ của bạn là hỗ trợ sinh viên trong học tập.

Quy tắc:
1. Nếu có tài liệu khóa học được cung cấp, ưu tiên trả lời dựa trên tài liệu đó.
2. Nếu không có tài liệu, hãy trả lời dựa trên kiến thức chung của bạn.
3. Trả lời bằng tiếng Việt, rõ ràng và dễ hiểu.
4. Luôn thân thiện và hữu ích."""


class RAGAgent:
    """Agent that uses tool calling to decide how to answer."""

    def __init__(self, model: Optional[str] = None):
        api_key = settings.GEMINI_API_KEY
        if not api_key:
            raise ValueError("GEMINI_API_KEY not configured")

        self.model = model or LLM_MODEL
        self.llm = ChatGoogleGenerativeAI(
            model=self.model,
            temperature=LLM_TEMPERATURE,
            max_tokens=LLM_MAX_TOKENS,
            google_api_key=api_key,
            thinking_budget=0,
        )
        self.retriever = DocumentRetriever(top_k=RETRIEVAL_TOP_K)
        logger.info(f"RAGAgent initialized with model: {self.model}")

    def invoke(
        self,
        question: str,
        course_id: Optional[int] = None,
        course_name: str = "",
        conversation_history: Optional[List[Dict]] = None,
    ) -> Dict[str, Any]:
        """
        Agent decides which tool to use, executes it, then generates answer.

        Returns:
            Dict with 'answer', 'sources', 'tool_used'
        """
        # If no course_id, skip tool calling and use direct RAG
        if not course_id:
            return self._fallback_rag(question, course_id)

        # Build messages
        messages = [{"role": "system", "content": GENERAL_SYSTEM_PROMPT}]

        # Add conversation history
        for msg in (conversation_history or []):
            role = msg.get('role', 'user')
            if role in ('user', 'assistant'):
                messages.append({"role": role, "content": msg.get('content', '')})

        messages.append({"role": "user", "content": question})

        # Step 1: Ask LLM to decide which tool to use
        try:
            response = self.llm.invoke(
                messages,
                tools=AVAILABLE_TOOLS,
            )
        except Exception as e:
            logger.error(f"Agent LLM call failed: {e}")
            return self._fallback_rag(question, course_id)

        # Step 2: Check if LLM wants to call a tool
        if hasattr(response, 'tool_calls') and response.tool_calls:
            tool_call = response.tool_calls[0]
            tool_name = tool_call.get('name', '')
            tool_args = tool_call.get('args', {})

            logger.info(f"Agent calling tool: {tool_name} with args: {tool_args}")

            # Execute the tool
            tool_result = execute_tool(tool_name, tool_args, course_id, course_name)

            # Step 3: Build a new prompt with tool result for final answer
            final_prompt = (
                f"Kết quả từ tool '{tool_name}':\n{tool_result}\n\n"
                f"Dựa trên kết quả trên, hãy trả lời câu hỏi: {question}"
            )
            try:
                final_response = self.llm.invoke([
                    {"role": "system", "content": GENERAL_SYSTEM_PROMPT},
                    {"role": "user", "content": final_prompt},
                ])
                answer = final_response.content
            except Exception as e:
                logger.error(f"Agent final LLM call failed: {e}")
                answer = tool_result

            # Extract sources if search_documents was used
            sources = []
            if tool_name == "search_documents":
                retrieval = self.retriever.retrieve_with_context(
                    query=tool_args.get('query', question),
                    course_id=course_id,
                )
                sources = retrieval.get('sources', [])

            return {
                'answer': answer,
                'sources': sources,
                'tool_used': tool_name,
            }

        # No tool call — LLM answered directly
        return {
            'answer': response.content,
            'sources': [],
            'tool_used': None,
        }

    def stream(
        self,
        question: str,
        course_id: Optional[int] = None,
        course_name: str = "",
        conversation_history: Optional[List[Dict]] = None,
    ) -> Generator[str, None, None]:
        """
        Stream agent response. Falls back to non-streaming for tool calls.
        Yields chunks of text.
        """
        result = self.invoke(question, course_id, course_name, conversation_history)
        # Yield the answer in chunks for SSE compatibility
        answer = result.get('answer', '')
        chunk_size = 10
        for i in range(0, len(answer), chunk_size):
            yield answer[i:i + chunk_size]

    def _fallback_rag(self, question: str, course_id: Optional[int] = None) -> Dict[str, Any]:
        """Fallback to regular RAG search when agent fails."""
        retrieval = self.retriever.retrieve_with_context(
            query=question,
            course_id=course_id,
        )

        # Always try to answer - even without documents
        if retrieval['has_results']:
            prompt = (
                f"Dựa trên tài liệu:\n{retrieval['context']}\n\n"
                f"Trả lời câu hỏi: {question}"
            )
            sources = retrieval['sources']
        else:
            # No documents - answer from general knowledge
            prompt = f"Câu hỏi: {question}"
            sources = []

        try:
            response = self.llm.invoke([
                {"role": "system", "content": GENERAL_SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ])
            return {
                'answer': response.content,
                'sources': sources,
                'tool_used': 'search_documents' if retrieval['has_results'] else None,
            }
        except Exception as e:
            logger.error(f"Fallback RAG failed: {e}")
            return {
                'answer': 'Xin lỗi, đã xảy ra lỗi. Vui lòng thử lại.',
                'sources': [],
                'tool_used': None,
            }
