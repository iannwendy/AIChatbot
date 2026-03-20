"""
RAG Agent - LLM with tool calling capability.
Decides when to search documents vs query administrative database.

Flow:
  User question → LLM (with tool definitions) → LLM decides:
    A) Call search_documents  → RAG pipeline → answer from documents
    B) Call admin tool (get_tuition_fee, get_schedule, etc.) → SQL query → answer from DB
    C) Answer directly from general knowledge
"""
import logging
from typing import Dict, Any, Optional, List, Generator

from langchain_google_genai import ChatGoogleGenerativeAI
from django.conf import settings

from .tools import AVAILABLE_TOOLS, execute_tool
from .retriever import DocumentRetriever
from ..services.config import LLM_MODEL, LLM_TEMPERATURE, LLM_MAX_TOKENS, RETRIEVAL_TOP_K

logger = logging.getLogger(__name__)

AGENT_SYSTEM_PROMPT = """Bạn là trợ lý AI thông minh hỗ trợ sinh viên đại học.

BẠN CÓ CÁC CÔNG CỤ (tools) ĐỂ TRA CỨU THÔNG TIN:
- Nếu câu hỏi về NỘI DUNG HỌC TẬP (lý thuyết, bài giảng, kiến thức môn học): dùng tool "search_documents"
- Nếu câu hỏi về HÀNH CHÍNH (lịch thi, học phí, thời khóa biểu, điểm, KTX, thư viện...): dùng tool hành chính tương ứng
- Nếu câu hỏi chung chung: trả lời trực tiếp không cần tool

QUY TẮC CHỌN TOOL:
1. "Lịch thi", "thi khi nào", "phòng thi" → get_exam_schedule
2. "Thời khóa biểu", "lịch học", "học phòng nào" → get_my_schedule
3. "Học phí", "đóng tiền", "hạn nộp" → get_tuition_fee
4. "Học bổng", "nhận học bổng" → get_scholarships
5. "Điểm", "bảng điểm", "GPA", "tín chỉ tích lũy" → get_academic_records hoặc get_enrollments
6. "Môn đã đăng ký", "danh sách môn" → get_enrollments
7. "Nghỉ lễ", "lịch năm học", "khi nào đăng ký" → get_academic_calendar
8. "Thông báo", "tin tức" → get_announcements
9. "Thẻ sinh viên", "mã thẻ" → get_student_id_card
10. "Mượn sách", "thư viện", "sách" → get_library_records
11. "KTX", "ký túc xá", "phòng ở" → get_dormitory_info
12. "Bảo hiểm", "BHYT" → get_health_insurance
13. "Liên hệ", "phòng ban", "số điện thoại", "email" → get_contacts
14. "Học kỳ hiện tại", "đang học kỳ mấy" → get_current_semester
15. "Ngành học", "chuyên ngành" → get_majors
16. Kiến thức môn học, lý thuyết → search_documents

PHONG CÁCH TRẢ LỜI:
- Tiếng Việt, rõ ràng, thân thiện
- Dùng markdown khi cần (bảng, danh sách)
- Trích dẫn nguồn [1], [2] nếu dùng search_documents"""


class RAGAgent:
    """Agent that uses tool calling to decide how to answer.

    The agent uses LLM function calling to route questions:
    - Academic knowledge → Vector DB (RAG pipeline)
    - Administrative queries → SQL Database (Django ORM)
    - General questions → Direct LLM response
    """

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
        user_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Agent decides which tool to use, executes it, then generates answer.

        Args:
            question: User's question
            course_id: Current course ID (for course-specific queries)
            course_name: Current course name
            conversation_history: Previous chat messages
            user_id: Logged-in user's ID (for personal queries like grades, fees)

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

            # Execute the tool with user_id for personal queries
            tool_result = execute_tool(
                tool_name=tool_name,
                params=tool_args,
                course_id=course_id,
                course_name=course_name,
                user_id=user_id,
            )

            logger.info(f"Tool result preview: {tool_result[:200]}...")

            # Step 3: Build final prompt with tool result for a natural answer
            final_prompt = (
                f"Kết quả tra cứu từ hệ thống (tool '{tool_name}'):\n"
                f"---\n{tool_result}\n---\n\n"
                f"Dựa trên dữ liệu trên, hãy trả lời câu hỏi của sinh viên một cách tự nhiên, "
                f"thân thiện và dễ hiểu: {question}"
            )
            try:
                final_response = self.llm.invoke([
                    {"role": "system", "content": AGENT_SYSTEM_PROMPT},
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
        user_id: Optional[int] = None,
    ) -> Generator[str, None, None]:
        """
        Stream agent response. Tool calls are non-streaming, then result is chunked.
        Yields chunks of text for SSE.
        """
        result = self.invoke(
            question=question,
            course_id=course_id,
            course_name=course_name,
            conversation_history=conversation_history,
            user_id=user_id,
        )
        # Yield the answer in chunks for SSE compatibility
        answer = result.get('answer', '')
        chunk_size = 10
        for i in range(0, len(answer), chunk_size):
            yield answer[i:i + chunk_size]

    def get_tool_used(self) -> Optional[str]:
        """Return the last tool used (for logging/debugging)."""
        return getattr(self, '_last_tool_used', None)

    def _fallback_rag(self, question: str, course_id: Optional[int] = None) -> Dict[str, Any]:
        """Fallback to regular RAG search when agent fails."""
        retrieval = self.retriever.retrieve_with_context(
            query=question,
            course_id=course_id,
        )

        if retrieval['has_results']:
            prompt = (
                f"Dựa trên tài liệu:\n{retrieval['context']}\n\n"
                f"Trả lời câu hỏi: {question}"
            )
            sources = retrieval['sources']
        else:
            prompt = f"Câu hỏi: {question}"
            sources = []

        try:
            response = self.llm.invoke([
                {"role": "system", "content": AGENT_SYSTEM_PROMPT},
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
