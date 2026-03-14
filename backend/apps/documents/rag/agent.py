"""
RAG Agent - LLM with tool calling capability.
Decides when to search documents vs query database.
"""
import logging
from typing import Dict, Any, Optional, List, Generator

from langchain_openai import ChatOpenAI
from django.conf import settings

from .tools import AVAILABLE_TOOLS, execute_tool
from .retriever import DocumentRetriever
from ..services.config import LLM_MODEL, LLM_TEMPERATURE, LLM_MAX_TOKENS, RETRIEVAL_TOP_K

logger = logging.getLogger(__name__)

AGENT_SYSTEM_PROMPT = """Bạn là trợ lý giảng dạy AI cho một nền tảng giáo dục.

Bạn có các công cụ (tools) sau:
- search_documents: Tìm kiếm trong tài liệu khóa học
- get_exam_schedule: Lấy lịch thi
- get_course_info: Lấy thông tin môn học

Quy tắc:
1. Nếu câu hỏi về kiến thức, lý thuyết → dùng search_documents
2. Nếu hỏi về lịch thi, ngày thi → dùng get_exam_schedule
3. Nếu hỏi thông tin chung về môn → dùng get_course_info
4. CHỈ trả lời dựa trên kết quả từ tools. Nếu không tìm thấy, nói rõ.
5. Trích dẫn nguồn [1], [2] khi dùng search_documents.
6. Trả lời bằng tiếng Việt."""


class RAGAgent:
    """Agent that uses tool calling to decide how to answer."""

    def __init__(self, model: Optional[str] = None):
        api_key = settings.OPENAI_API_KEY
        if not api_key:
            raise ValueError("OPENAI_API_KEY not configured")

        self.model = model or LLM_MODEL
        self.llm = ChatOpenAI(
            model=self.model,
            temperature=LLM_TEMPERATURE,
            max_tokens=LLM_MAX_TOKENS,
            api_key=api_key,
        )
        self.retriever = DocumentRetriever(top_k=RETRIEVAL_TOP_K)
        logger.info(f"RAGAgent initialized with model: {self.model}")

    def invoke(
        self,
        question: str,
        course_id: int,
        course_name: str = "",
        conversation_history: Optional[List[Dict]] = None,
    ) -> Dict[str, Any]:
        """
        Agent decides which tool to use, executes it, then generates answer.

        Returns:
            Dict with 'answer', 'sources', 'tool_used'
        """
        # Build messages
        messages = [{"role": "system", "content": AGENT_SYSTEM_PROMPT}]

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
                tool_choice="auto",
            )
        except Exception as e:
            logger.error(f"Agent LLM call failed: {e}")
            # Fallback to regular RAG
            return self._fallback_rag(question, course_id)

        # Step 2: Check if LLM wants to call a tool
        if hasattr(response, 'tool_calls') and response.tool_calls:
            tool_call = response.tool_calls[0]
            tool_name = tool_call['name']
            tool_args = tool_call.get('args', {})

            logger.info(f"Agent calling tool: {tool_name} with args: {tool_args}")

            # Execute the tool
            tool_result = execute_tool(tool_name, tool_args, course_id, course_name)

            # Step 3: Send tool result back to LLM for final answer
            messages.append({"role": "assistant", "content": "", "tool_calls": [tool_call]})
            messages.append({
                "role": "tool",
                "content": tool_result,
                "tool_call_id": tool_call.get('id', 'call_1'),
            })

            try:
                final_response = self.llm.invoke(messages)
                answer = final_response.content
            except Exception as e:
                logger.error(f"Agent final LLM call failed: {e}")
                answer = tool_result  # Use raw tool result as fallback

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
        course_id: int,
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

    def _fallback_rag(self, question: str, course_id: int) -> Dict[str, Any]:
        """Fallback to regular RAG search when agent fails."""
        retrieval = self.retriever.retrieve_with_context(
            query=question,
            course_id=course_id,
        )

        if not retrieval['has_results']:
            return {
                'answer': 'Không tìm thấy thông tin liên quan trong tài liệu.',
                'sources': [],
                'tool_used': 'search_documents',
            }

        # Build simple prompt
        prompt = (
            f"Dựa trên tài liệu:\n{retrieval['context']}\n\n"
            f"Trả lời câu hỏi: {question}"
        )

        try:
            response = self.llm.invoke([
                {"role": "system", "content": AGENT_SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ])
            return {
                'answer': response.content,
                'sources': retrieval['sources'],
                'tool_used': 'search_documents',
            }
        except Exception as e:
            logger.error(f"Fallback RAG failed: {e}")
            return {
                'answer': 'Xin lỗi, đã xảy ra lỗi. Vui lòng thử lại.',
                'sources': [],
                'tool_used': None,
            }
