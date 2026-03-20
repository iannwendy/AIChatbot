"""
Tool definitions for Agent function calling.
Includes both document search and administrative database queries.
"""
import logging
from typing import Dict, Any, Optional

from ..services.vector_store import get_vector_store
from ..services.bm25_index import get_bm25_index

logger = logging.getLogger(__name__)


# ============================================================
# TOOL DEFINITIONS - For LLM to choose from
# ============================================================

AVAILABLE_TOOLS = [
    # --- Document Search ---
    {
        "type": "function",
        "function": {
            "name": "search_documents",
            "description": "Tìm kiếm thông tin trong tài liệu khóa học. Sử dụng khi câu hỏi về nội dung bài giảng, kiến thức lý thuyết, chương trình học.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Câu hỏi tìm kiếm trong tài liệu"
                    }
                },
                "required": ["query"]
            }
        }
    },
    # --- Course Info ---
    {
        "type": "function",
        "function": {
            "name": "get_course_info",
            "description": "Lấy thông tin chung về môn học: mã môn, tên giáo viên, mô tả.",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
    # --- Exam Schedule ---
    {
        "type": "function",
        "function": {
            "name": "get_exam_schedule",
            "description": "Lấy lịch thi (giữa kỳ, cuối kỳ) của môn học. Dùng khi hỏi về lịch thi, ngày thi, phòng thi.",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
    # --- Timetable / Schedule ---
    {
        "type": "function",
        "function": {
            "name": "get_my_schedule",
            "description": "Lấy thời khóa biểu / lịch học của sinh viên. Dùng khi hỏi về thời khóa biểu, lịch học tuần, tiết học, phòng học.",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
    # --- Tuition Fee ---
    {
        "type": "function",
        "function": {
            "name": "get_tuition_fee",
            "description": "Tra cứu học phí sinh viên. Dùng khi hỏi về học phí, tình trạng thanh toán, hạn nộp học phí.",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
    # --- Scholarship ---
    {
        "type": "function",
        "function": {
            "name": "get_scholarships",
            "description": "Tra cứu học bổng sinh viên. Dùng khi hỏi về học bổng, điều kiện nhận học bổng, số tiền học bổng.",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
    # --- Enrollment / Grades ---
    {
        "type": "function",
        "function": {
            "name": "get_enrollments",
            "description": "Xem danh sách các môn đã đăng ký và điểm. Dùng khi hỏi về các môn đang học, điểm số, điểm giữa kỳ, điểm cuối kỳ.",
            "parameters": {
                "type": "object",
                "properties": {
                    "semester_id": {
                        "type": "integer",
                        "description": "ID học kỳ (không bắt buộc, mặc định là học kỳ hiện tại)"
                    }
                }
            }
        }
    },
    # --- Academic Records / GPA ---
    {
        "type": "function",
        "function": {
            "name": "get_academic_records",
            "description": "Xem bảng điểm tổng hợp, GPA, điểm tích lũy. Dùng khi hỏi về điểm trung bình, GPA, bảng điểm, tín chỉ tích lũy.",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
    # --- Academic Calendar ---
    {
        "type": "function",
        "function": {
            "name": "get_academic_calendar",
            "description": "Xem lịch học năm: ngày nghỉ lễ, kỳ thi, đăng ký môn, tốt nghiệp. Dùng khi hỏi về ngày nghỉ, lịch đăng ký, sự kiện học thuật.",
            "parameters": {
                "type": "object",
                "properties": {
                    "event_type": {
                        "type": "string",
                        "description": "Loại sự kiện: holiday, exam_period, registration, graduation, orientation, break"
                    }
                }
            }
        }
    },
    # --- Announcements ---
    {
        "type": "function",
        "function": {
            "name": "get_announcements",
            "description": "Xem thông báo hành chính mới nhất. Dùng khi hỏi về thông báo, tin tức trường, thông tin mới nhất.",
            "parameters": {
                "type": "object",
                "properties": {
                    "category": {
                        "type": "string",
                        "description": "Danh mục thông báo: academic, exam, tuition, scholarship, registration, event, facility, admin"
                    }
                }
            }
        }
    },
    # --- Library ---
    {
        "type": "function",
        "function": {
            "name": "get_library_records",
            "description": "Tra cứu sách đang mượn, lịch sử mượn sách. Dùng khi hỏi về sách mượn, hạn trả sách, thư viện.",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
    # --- Student ID Card ---
    {
        "type": "function",
        "function": {
            "name": "get_student_id_card",
            "description": "Tra cứu thông tin thẻ sinh viên. Dùng khi hỏi về thẻ sinh viên, mã thẻ, hạn sử dụng.",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
    # --- Dormitory ---
    {
        "type": "function",
        "function": {
            "name": "get_dormitory_info",
            "description": "Tra cứu thông tin ký túc xá, phòng ở. Dùng khi hỏi về KTX, phòng ở, giá phòng, đăng ký KTX.",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
    # --- Health Insurance ---
    {
        "type": "function",
        "function": {
            "name": "get_health_insurance",
            "description": "Tra cứu bảo hiểm y tế sinh viên. Dùng khi hỏi về BHYT, bảo hiểm, thẻ bảo hiểm.",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
    # --- Contact ---
    {
        "type": "function",
        "function": {
            "name": "get_contacts",
            "description": "Tra cứu thông tin liên hệ phòng ban. Dùng khi hỏi về số điện thoại, email, vị trí phòng ban, giờ làm việc.",
            "parameters": {
                "type": "object",
                "properties": {
                    "department_type": {
                        "type": "string",
                        "description": "Loại phòng ban: academic, student, finance, it, library, dorm, health, security, career"
                    }
                }
            }
        }
    },
    # --- Semester Info ---
    {
        "type": "function",
        "function": {
            "name": "get_current_semester",
            "description": "Lấy thông tin học kỳ hiện tại: tên học kỳ, ngày bắt đầu, ngày kết thúc, đăng ký. Dùng khi hỏi 'đang học kỳ mấy', 'khi nào hết học kỳ'.",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
    # --- Major Info ---
    {
        "type": "function",
        "function": {
            "name": "get_majors",
            "description": "Tra cứu danh sách ngành học, thông tin ngành. Dùng khi hỏi về ngành học, khoa, chuyên ngành.",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
]


# ============================================================
# TOOL EXECUTION
# ============================================================

def execute_tool(
    tool_name: str,
    params: Dict[str, Any],
    course_id: int = None,
    course_name: str = "",
    user_id: int = None,
) -> str:
    """
    Execute a tool and return the result as a string.

    Args:
        tool_name: Name of the tool to execute
        params: Parameters from the LLM
        course_id: Course ID for context
        course_name: Course name for display
        user_id: The logged-in user ID (for personal queries)

    Returns:
        Tool result as string
    """
    try:
        tool_map = {
            "search_documents": lambda: _search_documents(params.get("query", ""), course_id),
            "get_exam_schedule": lambda: _get_exam_schedule(course_id, course_name),
            "get_course_info": lambda: _get_course_info(course_id, course_name),
            "get_my_schedule": lambda: _get_my_schedule(user_id),
            "get_tuition_fee": lambda: _get_tuition_fee(user_id),
            "get_scholarships": lambda: _get_scholarships(user_id),
            "get_enrollments": lambda: _get_enrollments(user_id, params.get("semester_id")),
            "get_academic_records": lambda: _get_academic_records(user_id),
            "get_academic_calendar": lambda: _get_academic_calendar(params.get("event_type")),
            "get_announcements": lambda: _get_announcements(params.get("category")),
            "get_library_records": lambda: _get_library_records(user_id),
            "get_student_id_card": lambda: _get_student_id_card(user_id),
            "get_dormitory_info": lambda: _get_dormitory_info(user_id),
            "get_health_insurance": lambda: _get_health_insurance(user_id),
            "get_contacts": lambda: _get_contacts(params.get("department_type")),
            "get_current_semester": lambda: _get_current_semester(),
            "get_majors": lambda: _get_majors(),
        }

        handler = tool_map.get(tool_name)
        if handler:
            return handler()
        return f"Tool '{tool_name}' not found"

    except Exception as e:
        logger.error(f"Tool {tool_name} failed: {e}", exc_info=True)
        return f"Lỗi khi thực thi tool: {str(e)}"


# ============================================================
# TOOL IMPLEMENTATIONS
# ============================================================

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
            f"Giảng viên: {course.teacher.get_full_name() if course.teacher else 'Chưa phân công'}",
        ]
        if course.description:
            info.append(f"Mô tả: {course.description[:200]}")

        return "\n".join(info)
    except Exception as e:
        logger.error(f"Failed to get course info: {e}")
        return "Không thể lấy thông tin môn học."


def _get_my_schedule(user_id: int) -> str:
    """Get student's timetable for current semester."""
    from apps.academic.models import Schedule, Enrollment, Semester

    try:
        current_semester = Semester.objects.filter(is_current=True).first()
        if not current_semester:
            return "Không tìm thấy học kỳ hiện tại."

        enrolled_sections = Enrollment.objects.filter(
            student_id=user_id,
            semester=current_semester,
        ).select_related('course_section__course').values_list('course_section_id', flat=True)

        schedules = Schedule.objects.filter(
            course_section_id__in=enrolled_sections
        ).select_related('course_section__course', 'room').order_by('day_of_week', 'start_period')

        if not schedules:
            return f"Bạn chưa có thời khóa biểu cho {current_semester}."

        day_names = {2: 'Thứ 2', 3: 'Thứ 3', 4: 'Thứ 4', 5: 'Thứ 5', 6: 'Thứ 6', 7: 'Thứ 7', 8: 'Chủ nhật'}

        lines = [f"Thời khóa biểu {current_semester}:"]
        for s in schedules:
            day = day_names.get(s.day_of_week, f"Thứ {s.day_of_week}")
            room = f" | Phòng: {s.room}" if s.room else ""
            lines.append(
                f"- {day}: Tiết {s.start_period}-{s.end_period} | "
                f"{s.course_section.course.name} ({s.course_section.course.code}){room}"
            )

        return "\n".join(lines)
    except Exception as e:
        logger.error(f"Failed to get schedule: {e}")
        return "Không thể lấy thời khóa biểu."


def _get_tuition_fee(user_id: int) -> str:
    """Get student's tuition fee status."""
    from apps.academic.models import TuitionFee, Semester

    try:
        fees = TuitionFee.objects.filter(
            student_id=user_id
        ).select_related('semester__academic_year').order_by('-semester__academic_year__year', '-semester__semester')

        if not fees:
            return "Không tìm thấy thông tin học phí."

        status_names = {'pending': 'Chờ thanh toán', 'paid': 'Đã thanh toán', 'overdue': 'Quá hạn', 'exempted': 'Miễn giảm'}

        lines = ["Thông tin học phí:"]
        for fee in fees:
            status = status_names.get(fee.payment_status, fee.payment_status)
            lines.append(
                f"\n- {fee.semester}:"
                f"\n  Số tiền: {fee.amount:,.0f}đ"
            )
            if fee.discount > 0:
                lines.append(f"  Giảm: {fee.discount:,.0f}đ")
            lines.append(f"  Trạng thái: {status}")
            lines.append(f"  Hạn nộp: {fee.due_date.strftime('%d/%m/%Y')}")
            if fee.payment_date:
                lines.append(f"  Ngày thanh toán: {fee.payment_date.strftime('%d/%m/%Y')}")

        return "\n".join(lines)
    except Exception as e:
        logger.error(f"Failed to get tuition fee: {e}")
        return "Không thể lấy thông tin học phí."


def _get_scholarships(user_id: int) -> str:
    """Get student's scholarship information."""
    from apps.academic.models import Scholarship

    try:
        scholarships = Scholarship.objects.filter(
            student_id=user_id
        ).select_related('semester__academic_year').order_by('-semester__academic_year__year')

        if not scholarships:
            return "Bạn chưa có học bổng nào."

        lines = ["Thông tin học bổng:"]
        for s in scholarships:
            lines.append(
                f"\n- {s.name}:"
                f"\n  Loại: {s.get_scholarship_type_display()}"
                f"\n  Số tiền: {s.amount:,.0f}đ"
                f"\n  Học kỳ: {s.semester}"
                f"\n  Ngày cấp: {s.awarded_date.strftime('%d/%m/%Y')}"
                f"\n  Trạng thái: {'Hoạt động' if s.is_active else 'Hết hiệu lực'}"
            )
            if s.conditions:
                lines.append(f"  Điều kiện: {s.conditions}")

        return "\n".join(lines)
    except Exception as e:
        logger.error(f"Failed to get scholarships: {e}")
        return "Không thể lấy thông tin học bổng."


def _get_enrollments(user_id: int, semester_id: Optional[int] = None) -> str:
    """Get student's enrollment and grades."""
    from apps.academic.models import Enrollment, Semester

    try:
        if semester_id:
            enrollments = Enrollment.objects.filter(student_id=user_id, semester_id=semester_id)
        else:
            current_semester = Semester.objects.filter(is_current=True).first()
            if current_semester:
                enrollments = Enrollment.objects.filter(student_id=user_id, semester=current_semester)
            else:
                enrollments = Enrollment.objects.filter(student_id=user_id)

        enrollments = enrollments.select_related(
            'course_section__course', 'semester'
        ).order_by('-semester__academic_year__year', 'course_section__course__code')

        if not enrollments:
            return "Bạn chưa đăng ký môn nào trong học kỳ này."

        lines = ["Danh sách môn học đã đăng ký:"]
        for e in enrollments:
            section = e.course_section
            status_names = {'registered': 'Đã đăng ký', 'approved': 'Đã duyệt', 'dropped': 'Đã hủy'}

            lines.append(
                f"\n- {section.course.name} ({section.course.code} - Nhóm {section.section_number}):"
                f"\n  Trạng thái: {status_names.get(e.status, e.status)}"
                f"\n  Tín chỉ: {section.credits}"
            )
            if e.midterm_score is not None:
                lines.append(f"  Điểm giữa kỳ: {e.midterm_score}")
            if e.final_score is not None:
                lines.append(f"  Điểm cuối kỳ: {e.final_score}")
            if e.total_score is not None:
                lines.append(f"  Điểm tổng: {e.total_score}")
            if e.grade:
                lines.append(f"  Xếp loại: {e.grade}")

        return "\n".join(lines)
    except Exception as e:
        logger.error(f"Failed to get enrollments: {e}")
        return "Không thể lấy danh sách môn học."


def _get_academic_records(user_id: int) -> str:
    """Get student's academic records / GPA."""
    from apps.academic.models import AcademicRecord

    try:
        records = AcademicRecord.objects.filter(
            student_id=user_id
        ).select_related('semester__academic_year').order_by('semester__academic_year__year', 'semester__semester')

        if not records:
            return "Chưa có bảng điểm tổng hợp."

        lines = ["Bảng điểm tổng hợp:"]
        for r in records:
            lines.append(
                f"\n- {r.semester}:"
                f"\n  GPA học kỳ: {r.gpa}"
                f"\n  Tín chỉ đăng ký: {r.total_credits}"
                f"\n  Tín chỉ đạt: {r.earned_credits}"
                f"\n  GPA tích lũy: {r.cumulative_gpa}"
                f"\n  Tổng tín chỉ tích lũy: {r.cumulative_credits}"
            )

        # Show latest cumulative info
        latest = records.last()
        if latest:
            lines.append(f"\n--- Tổng kết ---")
            lines.append(f"GPA tích lũy hiện tại: {latest.cumulative_gpa}")
            lines.append(f"Tổng tín chỉ tích lũy: {latest.cumulative_credits}")

        return "\n".join(lines)
    except Exception as e:
        logger.error(f"Failed to get academic records: {e}")
        return "Không thể lấy bảng điểm."


def _get_academic_calendar(event_type: Optional[str] = None) -> str:
    """Get academic calendar events."""
    from apps.academic.models import AcademicCalendar, AcademicYear

    try:
        current_year = AcademicYear.objects.filter(is_current=True).first()
        if not current_year:
            return "Không tìm thấy năm học hiện tại."

        qs = AcademicCalendar.objects.filter(academic_year=current_year)
        if event_type:
            qs = qs.filter(event_type=event_type)

        events = qs.order_by('start_date')

        if not events:
            return f"Không có sự kiện nào trong lịch năm học {current_year}."

        type_names = {
            'holiday': 'Nghỉ lễ', 'exam_period': 'Kỳ thi', 'registration': 'Đăng ký',
            'graduation': 'Tốt nghiệp', 'orientation': 'Sinh hoạt', 'break': 'Nghỉ', 'other': 'Khác'
        }

        lines = [f"Lịch năm học {current_year}:"]
        for e in events:
            type_label = type_names.get(e.event_type, e.event_type)
            date_str = e.start_date.strftime('%d/%m/%Y')
            if e.end_date and e.end_date != e.start_date:
                date_str += f" - {e.end_date.strftime('%d/%m/%Y')}"
            lines.append(f"- [{type_label}] {e.title}: {date_str}")
            if e.description:
                lines.append(f"  {e.description}")

        return "\n".join(lines)
    except Exception as e:
        logger.error(f"Failed to get academic calendar: {e}")
        return "Không thể lấy lịch năm học."


def _get_announcements(category: Optional[str] = None) -> str:
    """Get recent announcements."""
    from apps.academic.models import Announcement

    try:
        qs = Announcement.objects.filter(is_active=True)
        if category:
            qs = qs.filter(category=category)

        announcements = qs.order_by('-publish_date')[:5]

        if not announcements:
            return "Không có thông báo mới."

        priority_names = {'urgent': 'KHẨN', 'high': 'Quan trọng', 'normal': '', 'low': ''}

        lines = ["Thông báo mới nhất:"]
        for a in announcements:
            priority = priority_names.get(a.priority, '')
            prefix = f"[{priority}] " if priority else ""
            lines.append(
                f"\n- {prefix}{a.title}"
                f"\n  Ngày: {a.publish_date.strftime('%d/%m/%Y')}"
                f"\n  {a.content[:200]}..."
            )

        return "\n".join(lines)
    except Exception as e:
        logger.error(f"Failed to get announcements: {e}")
        return "Không thể lấy thông báo."


def _get_library_records(user_id: int) -> str:
    """Get student's library records."""
    from apps.academic.models import LibraryRecord

    try:
        records = LibraryRecord.objects.filter(
            student_id=user_id
        ).order_by('-borrow_date')

        if not records:
            return "Bạn chưa có lịch sử mượn sách nào."

        status_names = {'borrowed': 'Đang mượn', 'returned': 'Đã trả', 'overdue': 'Quá hạn', 'lost': 'Mất'}

        lines = ["Lịch sử mượn sách:"]
        for r in records:
            status = status_names.get(r.status, r.status)
            lines.append(
                f"\n- \"{r.book_title}\" ({r.book_author})"
                f"\n  Ngày mượn: {r.borrow_date.strftime('%d/%m/%Y')}"
                f"\n  Hạn trả: {r.due_date.strftime('%d/%m/%Y')}"
                f"\n  Trạng thái: {status}"
            )
            if r.return_date:
                lines.append(f"  Ngày trả: {r.return_date.strftime('%d/%m/%Y')}")
            if r.late_fee > 0:
                lines.append(f"  Phí phạt: {r.late_fee:,.0f}đ")

        return "\n".join(lines)
    except Exception as e:
        logger.error(f"Failed to get library records: {e}")
        return "Không thể lấy thông tin thư viện."


def _get_student_id_card(user_id: int) -> str:
    """Get student ID card information."""
    from apps.academic.models import StudentIDCard

    try:
        card = StudentIDCard.objects.filter(student_id=user_id).order_by('-issue_date').first()

        if not card:
            return "Không tìm thấy thông tin thẻ sinh viên."

        status_names = {'active': 'Hoạt động', 'expired': 'Hết hạn', 'lost': 'Mất', 'frozen': 'Khóa'}

        lines = [
            "Thông tin thẻ sinh viên:",
            f"- Mã thẻ: {card.card_number}",
            f"- Ngày cấp: {card.issue_date.strftime('%d/%m/%Y')}",
            f"- Hạn sử dụng: {card.expiry_date.strftime('%d/%m/%Y')}",
            f"- Trạng thái: {status_names.get(card.status, card.status)}",
        ]

        return "\n".join(lines)
    except Exception as e:
        logger.error(f"Failed to get student ID card: {e}")
        return "Không thể lấy thông tin thẻ sinh viên."


def _get_dormitory_info(user_id: int) -> str:
    """Get dormitory info for student."""
    from apps.academic.models import DormitoryAssignment, Dormitory, Semester

    try:
        # Check if student has an assignment
        assignment = DormitoryAssignment.objects.filter(
            student_id=user_id,
            status='approved',
        ).select_related('dormitory', 'semester').order_by('-semester__academic_year__year').first()

        if assignment:
            dorm = assignment.dormitory
            lines = [
                "Thông tin KTX của bạn:",
                f"- Tòa: {dorm.get_building_display()}",
                f"- Phòng: {dorm.room_number}",
                f"- Loại: {dorm.get_room_type_display()}",
                f"- Tầng: {dorm.floor}",
                f"- Giá/kỳ: {dorm.price_per_semester:,.0f}đ",
                f"- Tiện nghi: {', '.join(dorm.amenities)}",
                f"- Ngày nhận phòng: {assignment.check_in_date.strftime('%d/%m/%Y')}",
                f"- Học kỳ: {assignment.semester}",
            ]
        else:
            lines = [
                "Bạn chưa đăng ký KTX.",
                "",
                "Thông tin KTX chung:",
            ]

            for building_code, building_name in Dormitory.BUILDING_CHOICES:
                rooms = Dormitory.objects.filter(building=building_code)
                if rooms.exists():
                    prices = rooms.values_list('price_per_semester', flat=True)
                    min_price = min(prices) if prices else 0
                    max_price = max(prices) if prices else 0
                    lines.append(f"- {building_name}: Giá từ {min_price:,.0f}đ - {max_price:,.0f}đ/kỳ")

        return "\n".join(lines)
    except Exception as e:
        logger.error(f"Failed to get dormitory info: {e}")
        return "Không thể lấy thông tin KTX."


def _get_health_insurance(user_id: int) -> str:
    """Get student's health insurance info."""
    from apps.academic.models import HealthInsurance

    try:
        insurance = HealthInsurance.objects.filter(
            student_id=user_id
        ).order_by('-expiry_date').first()

        if not insurance:
            return "Không tìm thấy thông tin bảo hiểm y tế."

        status_names = {'active': 'Còn hiệu lực', 'expired': 'Hết hạn', 'pending': 'Chờ cấp'}

        lines = [
            "Thông tin bảo hiểm y tế:",
            f"- Số thẻ BHYT: {insurance.insurance_number}",
            f"- Ngày cấp: {insurance.issue_date.strftime('%d/%m/%Y')}",
            f"- Hạn sử dụng: {insurance.expiry_date.strftime('%d/%m/%Y')}",
            f"- Trạng thái: {status_names.get(insurance.status, insurance.status)}",
            f"- Nơi khám bệnh: {insurance.hospital_name or 'Chưa đăng ký'}",
            f"- Đơn vị cấp: {insurance.provider}",
        ]

        return "\n".join(lines)
    except Exception as e:
        logger.error(f"Failed to get health insurance: {e}")
        return "Không thể lấy thông tin BHYT."


def _get_contacts(department_type: Optional[str] = None) -> str:
    """Get department contact information."""
    from apps.academic.models import Contact

    try:
        qs = Contact.objects.filter(is_active=True)
        if department_type:
            qs = qs.filter(department_type=department_type)

        contacts = qs.order_by('department_type', 'name')

        if not contacts:
            return "Không tìm thấy thông tin liên hệ."

        lines = ["Thông tin liên hệ phòng ban:"]
        for c in contacts:
            lines.append(f"\n- {c.name} ({c.get_department_type_display()}):")
            if c.phone:
                lines.append(f"  SĐT: {c.phone}")
            if c.email:
                lines.append(f"  Email: {c.email}")
            if c.location:
                lines.append(f"  Vị trí: {c.location}")
            if c.office_hours:
                lines.append(f"  Giờ làm việc: {c.office_hours}")

        return "\n".join(lines)
    except Exception as e:
        logger.error(f"Failed to get contacts: {e}")
        return "Không thể lấy thông tin liên hệ."


def _get_current_semester() -> str:
    """Get current semester info."""
    from apps.academic.models import Semester

    try:
        semester = Semester.objects.filter(is_current=True).select_related('academic_year').first()
        if not semester:
            return "Không tìm thấy học kỳ hiện tại."

        lines = [
            f"Học kỳ hiện tại: {semester}",
            f"Năm học: {semester.academic_year.year}",
            f"Bắt đầu: {semester.start_date.strftime('%d/%m/%Y')}",
            f"Kết thúc: {semester.end_date.strftime('%d/%m/%Y')}",
        ]
        if semester.registration_start:
            lines.append(f"Đăng ký mở: {semester.registration_start.strftime('%d/%m/%Y')}")
        if semester.registration_end:
            lines.append(f"Đăng ký đóng: {semester.registration_end.strftime('%d/%m/%Y')}")

        return "\n".join(lines)
    except Exception as e:
        logger.error(f"Failed to get current semester: {e}")
        return "Không thể lấy thông tin học kỳ."


def _get_majors() -> str:
    """Get list of majors."""
    from apps.academic.models import Major

    try:
        majors = Major.objects.all().order_by('code')

        if not majors:
            return "Không có thông tin ngành học."

        lines = ["Danh sách ngành học:"]
        for m in majors:
            lines.append(
                f"- {m.code}: {m.name}"
                f"\n  Khoa: {m.faculty}"
                f"\n  Thời gian: {m.duration_years} năm"
                f"\n  Tổng tín chỉ: {m.total_credits_required}"
            )

        return "\n".join(lines)
    except Exception as e:
        logger.error(f"Failed to get majors: {e}")
        return "Không thể lấy thông tin ngành học."
