"""
Tool definitions for Agent function calling.
"""
import logging
from typing import Dict, Any, List, Optional

from ..services.vector_store import get_vector_store
from ..services.bm25_index import get_bm25_index

logger = logging.getLogger(__name__)


# Tool definitions for LLM to choose from
AVAILABLE_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_documents",
            "description": "Tìm kiếm thông tin trong tài liệu khóa học. Sử dụng khi câu hỏi về nội dung bài giảng, kiến thức lý thuyết.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Câu hỏi tìm kiếm"
                    }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_exam_schedule",
            "description": "Lấy lịch thi của môn học. Sử dụng khi hỏi về lịch thi, ngày thi, phòng thi.",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_course_info",
            "description": "Lấy thông tin chung về môn học như mã môn, tên giáo viên, mô tả.",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    }
]


def execute_tool(
    tool_name: str,
    params: Dict[str, Any],
    course_id: int,
    course_name: str = "",
) -> str:
    """
    Execute a tool and return the result as a string.

    Args:
        tool_name: Name of the tool to execute
        params: Parameters for the tool
        course_id: Course ID for context
        course_name: Course name for display

    Returns:
        Tool result as string
    """
    try:
        if tool_name == "search_documents":
            return _search_documents(params.get("query", ""), course_id)
        elif tool_name == "get_exam_schedule":
            return _get_exam_schedule(course_id, course_name)
        elif tool_name == "get_course_info":
            return _get_course_info(course_id, course_name)
        else:
            return f"Tool '{tool_name}' not found"
    except Exception as e:
        logger.error(f"Tool {tool_name} failed: {e}")
        return f"Lỗi khi thực thi tool: {str(e)}"


def _search_documents(query: str, course_id: int) -> str:
    """Search course documents using hybrid retrieval."""
    from .retriever import DocumentRetriever

    retriever = DocumentRetriever()
    results = retriever.hybrid_retrieve(
        query=query,
        course_id=course_id,
        top_k=3,
    )

    if not results:
        return "Không tìm thấy thông tin liên quan trong tài liệu."

    context = []
    for i, r in enumerate(results, 1):
        meta = r.get("metadata", {})
        source = meta.get("source", "Unknown")
        context.append(f"[{i}] {r['text'][:300]}...\nNguồn: {source}")

    return "\n\n".join(context)


def _get_exam_schedule(course_id: int, course_name: str) -> str:
    """Get exam schedule from database."""
    from apps.courses.models import ExamSchedule

    try:
        exams = ExamSchedule.objects.filter(course_id=course_id).order_by("exam_date")
        if not exams:
            return f"Không có lịch thi cho môn {course_name}."

        lines = [f"Lịch thi môn {course_name}:"]
        for exam in exams:
            exam_type = exam.get_exam_type_display()
            lines.append(f"- {exam_type}: {exam.exam_date.strftime('%d/%m/%Y %H:%M')}")
            if exam.room:
                lines.append(f"  Phòng: {exam.room}")
            if exam.notes:
                lines.append(f"  Ghi chú: {exam.notes}")

        return "\n".join(lines)
    except Exception as e:
        logger.error(f"Failed to get exam schedule: {e}")
        return "Không thể lấy lịch thi."


def _get_course_info(course_id: int, course_name: str) -> str:
    """Get general course information."""
    from apps.courses.models import Course

    try:
        course = Course.objects.get(id=course_id)
        info = [
            f"Môn học: {course.name}",
            f"Mã môn: {course.code}",
            f"Giảng viên: {course.teacher.get_full_name() or course.teacher.username}",
        ]
        if course.description:
            info.append(f"Mô tả: {course.description[:200]}")

        return "\n".join(info)
    except Exception as e:
        logger.error(f"Failed to get course info: {e}")
        return "Không thể lấy thông tin môn học."
