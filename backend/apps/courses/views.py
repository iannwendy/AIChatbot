from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from config.authentication import AdminRolePermission, AdminOrTeacherPermission
from .models import Course, Quiz, Question, QuizAttempt, ExamSchedule, QuizResult
from .serializers import (
    CourseSerializer, CourseCreateSerializer, EnrollmentSerializer,
    QuizSerializer, QuizStudentSerializer, QuizCreateSerializer,
    QuestionSerializer, QuestionWithAnswerSerializer, QuestionCreateSerializer,
    QuizAttemptSerializer, QuizResultSerializer,
    ExamScheduleSerializer
)
from apps.users.models import Student
from apps.documents.rag.retriever import DocumentRetriever

import json
import logging
import pandas as pd

logger = logging.getLogger(__name__)

User = get_user_model()


class CourseViewSet(viewsets.ModelViewSet):
    """Course management"""
    queryset = Course.objects.select_related('teacher').prefetch_related('students', 'documents').all()
    serializer_class = CourseSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'destroy', 'update', 'partial_update']:
            return [AdminRolePermission()]
        if self.action == 'import_students':
            return [AdminOrTeacherPermission()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == 'create':
            return CourseCreateSerializer
        return CourseSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == 'student':
            # Students only see their enrolled courses
            return Course.objects.filter(students=user)
        elif user.role == 'teacher':
            # Teachers see courses they teach
            return Course.objects.filter(teacher=user)
        # Admins see all courses
        return Course.objects.select_related('teacher').prefetch_related('students').all()

    @action(detail=True, methods=['post'])
    def enroll(self, request, pk=None):
        """Enroll students in a course"""
        course = self.get_object()
        student_ids = request.data.get('student_ids', [])

        students = User.objects.filter(id__in=student_ids, role='student')

        # Check for already enrolled students
        existing_ids = set(course.students.values_list('id', flat=True))
        already_enrolled = [sid for sid in student_ids if sid in existing_ids]

        if already_enrolled:
            # Get emails of already enrolled students for error message
            existing_students = User.objects.filter(id__in=already_enrolled)
            emails = ', '.join([u.email for u in existing_students[:3]])
            if len(already_enrolled) > 3:
                emails += f' (+{len(already_enrolled) - 3} more)'
            return Response({
                'error': f'Sinh viên đã có trong lớp: {emails}',
                'already_enrolled': already_enrolled,
                'student_count': course.students.count()
            }, status=status.HTTP_400_BAD_REQUEST)

        course.students.add(*students)

        return Response({
            'message': f'Enrolled {len(students)} students',
            'student_count': course.students.count()
        })

    @action(detail=True, methods=['post'])
    def unenroll(self, request, pk=None):
        """Unenroll students from a course"""
        course = self.get_object()
        student_ids = request.data.get('student_ids', [])

        students = User.objects.filter(id__in=student_ids, role='student')
        course.students.remove(*students)

        return Response({
            'message': f'Unenrolled {len(students)} students',
            'student_count': course.students.count()
        })

    @action(detail=True, methods=['post'], url_path='import-students')
    def import_students(self, request, pk=None):
        """Import students from CSV/Excel file to course"""
        course = self.get_object()

        # Teacher can only import to their own courses
        if request.user.role == 'teacher' and course.teacher_id != request.user.id:
            return Response(
                {'error': 'Bạn không có quyền thêm sinh viên vào môn học này'},
                status=status.HTTP_403_FORBIDDEN
            )

        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            if file.name.endswith('.csv'):
                df = pd.read_csv(file)
            else:
                df = pd.read_excel(file)
        except Exception as e:
            return Response({'error': f'Invalid file format: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

        required_columns = ['email']
        missing = [col for col in required_columns if col not in df.columns]
        if missing:
            return Response({
                'error': f'Missing required columns: {missing}',
                'required': required_columns
            }, status=status.HTTP_400_BAD_REQUEST)

        created_count = 0
        existing_count = 0
        errors = []

        with transaction.atomic():
            for idx, row in df.iterrows():
                try:
                    email = str(row['email']).strip()
                    if not email or email == 'nan':
                        errors.append(f"Row {idx + 2}: Invalid email")
                        continue

                    username = email.split('@')[0]
                    user, user_created = User.objects.get_or_create(
                        email=email,
                        defaults={
                            'username': username,
                            'role': 'student',
                            'first_name': str(row.get('first_name', '')).strip() if pd.notna(row.get('first_name')) else '',
                            'last_name': str(row.get('last_name', '')).strip() if pd.notna(row.get('last_name')) else '',
                        }
                    )

                    if not user_created and user.role != 'student':
                        user.role = 'student'
                        user.save()

                    if pd.notna(row.get('student_id')):
                        Student.objects.get_or_create(
                            user=user,
                            defaults={'student_id': str(row['student_id']).strip()}
                        )

                    if not course.students.filter(id=user.id).exists():
                        course.students.add(user)
                        created_count += 1
                    else:
                        existing_count += 1

                except Exception as e:
                    errors.append(f"Row {idx + 2}: {str(e)}")

        return Response({
            'message': f'Đã thêm {created_count} sinh viên vào môn học',
            'existing': existing_count,
            'errors': errors[:10] if errors else [],
            'total_added': created_count,
            'student_count': course.students.count()
        })

    @action(detail=False, methods=['get'])
    def my_courses(self, request):
        """Get courses for current user"""
        user = request.user
        if user.role == 'student':
            courses = Course.objects.filter(students=user).select_related('teacher')
        elif user.role == 'teacher':
            courses = Course.objects.filter(teacher=user).select_related('teacher')
        else:
            courses = Course.objects.select_related('teacher').all()

        serializer = CourseSerializer(courses, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='generate-quiz')
    def generate_quiz(self, request, pk=None):
        """Generate quiz from course documents using LLM"""
        course = self.get_object()
        num_questions = request.data.get('num_questions', 5)
        topic = request.data.get('topic', '')

        # Get document content for the course
        try:
            retriever = DocumentRetriever()
            results = retriever.retrieve(query=topic or course.name, course_id=course.id, top_k=10)
        except Exception as e:
            logger.error(f"Failed to retrieve documents: {e}")
            return Response({'error': 'Không lấy được nội dung tài liệu'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        if not results:
            return Response({'error': 'Không có tài liệu nào được xử lý. Vui lòng upload và xử lý tài liệu trước.'}, status=status.HTTP_400_BAD_REQUEST)

        # Build prompt for LLM
        context = "\n\n".join([r['text'][:500] for r in results[:5]])
        prompt = f"""Dựa trên nội dung sau, tạo {num_questions} câu hỏi trắc nghiệm.

Nội dung tài liệu:
{context}

Chủ đề: {topic or 'Tổng quát'}

Trả về JSON array với format:
[
  {{
    "question": "Câu hỏi",
    "options": ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
    "correct": 0,
    "explanation": "Giải thích"
  }}
]"""

        # Call LLM
        from langchain_google_genai import ChatGoogleGenerativeAI
        from django.conf import settings
        from apps.documents.services.config import LLM_MODEL

        try:
            llm = ChatGoogleGenerativeAI(model=LLM_MODEL, google_api_key=settings.GEMINI_API_KEY)
            response = llm.invoke([{"role": "user", "content": prompt}])
            content = response.content

            # Parse JSON
            if '```json' in content:
                content = content.split('```json')[1].split('```')[0]
            elif '```' in content:
                content = content.split('```')[1].split('```')[0]

            questions_data = json.loads(content.strip())
        except Exception as e:
            logger.error(f"Quiz generation failed: {e}")
            return Response({'error': f'Lỗi khi tạo câu hỏi: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Save quiz
        quiz = Quiz.objects.create(
            course=course,
            title=f"Quiz: {topic or 'Tổng hợp'}",
            topic=topic,
            description=f"{num_questions} câu hỏi về {topic or 'nội dung môn học'}",
            created_by=request.user,
        )

        for i, q in enumerate(questions_data):
            Question.objects.create(
                quiz=quiz,
                question_text=q.get('question', ''),
                options=q.get('options', []),
                correct_answer=q.get('correct', 0),
                explanation=q.get('explanation', ''),
                order=i,
            )

        serializer = QuizSerializer(quiz)
        return Response({
            'message': f'Tạo quiz với {len(questions_data)} câu hỏi',
            'quiz': serializer.data
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='submit-quiz/(?P<quiz_id>[^/.]+)')
    def submit_quiz(self, request, pk=None, quiz_id=None):
        """Submit quiz answers and get score"""
        quiz = Quiz.objects.get(id=quiz_id, course_id=pk)
        answers = request.data.get('answers', [])  # List of selected indices

        questions = list(quiz.questions.all())
        score = 0
        results = []

        for i, question in enumerate(questions):
            selected = answers[i] if i < len(answers) else None
            is_correct = selected == question.correct_answer
            if is_correct:
                score += 1

            results.append({
                'question': question.question_text,
                'selected': selected,
                'correct': question.correct_answer,
                'is_correct': is_correct,
                'explanation': question.explanation,
                'options': question.options,
            })

        # Save attempt
        attempt = QuizAttempt.objects.create(
            student=request.user,
            quiz=quiz,
            score=score,
            total_questions=len(questions),
            answers=answers,
            completed_at=timezone.now(),
        )

        return Response({
            'score': score,
            'total': len(questions),
            'percentage': round(score / len(questions) * 100, 1) if questions else 0,
            'results': results,
        })

    @action(detail=False, methods=['get'], url_path='quizzes')
    def list_quizzes(self, request):
        """List quizzes for a course"""
        course_id = request.query_params.get('course_id')
        if not course_id:
            return Response({'error': 'course_id required'}, status=status.HTTP_400_BAD_REQUEST)

        quizzes = Quiz.objects.filter(course_id=course_id).prefetch_related('questions')
        serializer = QuizSerializer(quizzes, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get', 'post'], url_path='exam-schedule')
    def exam_schedule(self, request, pk=None):
        """Get or create exam schedule for a course"""
        course = self.get_object()

        if request.method == 'GET':
            exams = course.exam_schedules.all()
            serializer = ExamScheduleSerializer(exams, many=True)
            return Response(serializer.data)

        # POST - create exam schedule
        exam_date = request.data.get('exam_date')
        exam_type = request.data.get('exam_type', 'final')
        room = request.data.get('room', '')
        notes = request.data.get('notes', '')

        if not exam_date:
            return Response({'error': 'exam_date required'}, status=status.HTTP_400_BAD_REQUEST)

        exam = ExamSchedule.objects.create(
            course=course,
            exam_date=exam_date,
            exam_type=exam_type,
            room=room,
            notes=notes,
        )

        serializer = ExamScheduleSerializer(exam)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class QuizViewSet(viewsets.ModelViewSet):
    """Quiz management - CRUD + student quiz taking + teacher progress tracking"""
    queryset = Quiz.objects.prefetch_related('questions').select_related('course', 'created_by').all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'create':
            return QuizCreateSerializer
        if self.request.user.role == 'student' and self.action == 'retrieve':
            return QuizStudentSerializer
        return QuizSerializer

    def get_queryset(self):
        user = self.request.user
        course_id = self.request.query_params.get('course_id')
        qs = Quiz.objects.prefetch_related('questions').select_related('course', 'created_by')
        if course_id:
            qs = qs.filter(course_id=course_id)
        if user.role == 'teacher':
            qs = qs.filter(course__teacher=user)
        elif user.role == 'student':
            qs = qs.filter(course__students=user)
        return qs

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy',
                           'add_questions', 'class_progress', 'update_questions']:
            return [AdminOrTeacherPermission()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    # ─── Teacher: Add questions to quiz ───
    @action(detail=True, methods=['post'], url_path='questions')
    def add_questions(self, request, pk=None):
        """Add one or more questions to a quiz"""
        quiz = self.get_object()
        questions_data = request.data.get('questions', [])
        if not questions_data:
            # Single question mode
            questions_data = [request.data]

        created = []
        for i, q in enumerate(questions_data):
            order = q.get('order', quiz.questions.count() + i)
            question = Question.objects.create(
                quiz=quiz,
                question_text=q.get('question_text', ''),
                options=q.get('options', []),
                correct_answer=q.get('correct_answer', 0),
                explanation=q.get('explanation', ''),
                order=order,
            )
            created.append(QuestionWithAnswerSerializer(question).data)

        return Response({
            'message': f'Đã thêm {len(created)} câu hỏi',
            'questions': created,
        }, status=status.HTTP_201_CREATED)

    # ─── Teacher: Update questions ───
    @action(detail=True, methods=['put'], url_path='update-questions')
    def update_questions(self, request, pk=None):
        """Update all questions in a quiz (replace all)"""
        quiz = self.get_object()
        questions_data = request.data.get('questions', [])

        quiz.questions.all().delete()
        created = []
        for i, q in enumerate(questions_data):
            question = Question.objects.create(
                quiz=quiz,
                question_text=q.get('question_text', ''),
                options=q.get('options', []),
                correct_answer=q.get('correct_answer', 0),
                explanation=q.get('explanation', ''),
                order=i,
            )
            created.append(QuestionWithAnswerSerializer(question).data)

        return Response({
            'message': f'Đã cập nhật {len(created)} câu hỏi',
            'questions': created,
        })

    # ─── Student: Start quiz attempt ───
    @action(detail=True, methods=['post'], url_path='start')
    def start_quiz(self, request, pk=None):
        """Student starts a quiz attempt"""
        quiz = self.get_object()
        user = request.user

        # Check if student is enrolled in the course
        if user.role == 'student' and not quiz.course.students.filter(id=user.id).exists():
            return Response({'error': 'Bạn không có quyền làm quiz này'}, status=status.HTTP_403_FORBIDDEN)

        # Create a new attempt
        attempt = QuizAttempt.objects.create(
            student=user,
            quiz=quiz,
            total_questions=quiz.questions.count(),
            class_group=request.data.get('class_group', ''),
        )

        # Return questions WITHOUT correct answers
        questions = QuestionSerializer(quiz.questions.all(), many=True).data

        return Response({
            'attempt_id': attempt.id,
            'quiz_id': quiz.id,
            'quiz_title': quiz.title,
            'total_questions': attempt.total_questions,
            'questions': questions,
        }, status=status.HTTP_201_CREATED)

    # ─── Student: Submit quiz answers ───
    @action(detail=True, methods=['post'], url_path='submit')
    def submit_quiz(self, request, pk=None):
        """Student submits quiz answers"""
        quiz = self.get_object()
        attempt_id = request.data.get('attempt_id')
        answers = request.data.get('answers', [])  # [{question_id, selected_option, time_spent?}]
        time_spent_seconds = request.data.get('time_spent_seconds', 0)

        # Find the attempt
        try:
            attempt = QuizAttempt.objects.get(id=attempt_id, student=request.user, quiz=quiz)
        except QuizAttempt.DoesNotExist:
            return Response({'error': 'Không tìm thấy bài làm'}, status=status.HTTP_404_NOT_FOUND)

        if attempt.completed_at:
            return Response({'error': 'Bài làm đã được nộp'}, status=status.HTTP_400_BAD_REQUEST)

        questions = {q.id: q for q in quiz.questions.all()}
        score = 0
        results = []

        with transaction.atomic():
            for ans in answers:
                q_id = ans.get('question_id')
                selected = ans.get('selected_option')
                q_time = ans.get('time_spent', 0)

                question = questions.get(q_id)
                if not question:
                    continue

                is_correct = selected == question.correct_answer
                if is_correct:
                    score += 1

                # Save per-question result
                QuizResult.objects.create(
                    attempt=attempt,
                    question=question,
                    selected_option=selected,
                    is_correct=is_correct,
                    time_spent_seconds=q_time,
                )

                results.append({
                    'question_id': q_id,
                    'question_text': question.question_text,
                    'options': question.options,
                    'selected_option': selected,
                    'correct_answer': question.correct_answer,
                    'is_correct': is_correct,
                    'explanation': question.explanation,
                })

            # Update attempt
            attempt.score = score
            attempt.total_questions = len(questions)
            attempt.answers = [a.get('selected_option') for a in answers]
            attempt.time_spent_seconds = time_spent_seconds
            attempt.completed_at = timezone.now()
            attempt.save()

        total = len(questions)
        return Response({
            'attempt_id': attempt.id,
            'score': score,
            'total': total,
            'percentage': round(score / total * 100, 1) if total > 0 else 0,
            'time_spent_seconds': time_spent_seconds,
            'results': results,
        })

    # ─── Student: Get quiz result after submission ───
    @action(detail=True, methods=['get'], url_path='result')
    def quiz_result(self, request, pk=None):
        """Get quiz result for a specific attempt"""
        quiz = self.get_object()
        attempt_id = request.query_params.get('attempt_id')

        try:
            if attempt_id:
                attempt = QuizAttempt.objects.get(id=attempt_id, quiz=quiz)
            else:
                # Get latest attempt for this user
                attempt = QuizAttempt.objects.filter(
                    student=request.user, quiz=quiz, completed_at__isnull=False
                ).first()
        except QuizAttempt.DoesNotExist:
            return Response({'error': 'Không tìm thấy kết quả'}, status=status.HTTP_404_NOT_FOUND)

        if not attempt:
            return Response({'error': 'Không tìm thấy kết quả'}, status=status.HTTP_404_NOT_FOUND)

        attempt_data = QuizAttemptSerializer(attempt).data
        results_data = QuizResultSerializer(attempt.results.all(), many=True).data

        return Response({
            'attempt': attempt_data,
            'results': results_data,
        })

    # ─── Student: Get my attempts for a quiz ───
    @action(detail=True, methods=['get'], url_path='my-attempts')
    def my_attempts(self, request, pk=None):
        """Get all attempts for current student on this quiz"""
        quiz = self.get_object()
        attempts = QuizAttempt.objects.filter(
            student=request.user, quiz=quiz
        ).order_by('-started_at')
        return Response(QuizAttemptSerializer(attempts, many=True).data)

    # ─── Teacher: View class quiz progress ───
    @action(detail=True, methods=['get'], url_path='class-progress')
    def class_progress(self, request, pk=None):
        """Teacher views quiz progress for students in a class"""
        quiz = self.get_object()
        class_group = request.query_params.get('class_group', '')

        # Get all students enrolled in the course
        students = quiz.course.students.all()
        if class_group:
            from apps.users.models import Student as StudentModel
            student_ids_in_class = StudentModel.objects.filter(
                class_group=class_group
            ).values_list('user_id', flat=True)
            students = students.filter(id__in=student_ids_in_class)

        # Get all attempts for this quiz
        attempts = QuizAttempt.objects.filter(
            quiz=quiz, completed_at__isnull=False
        ).select_related('student')

        if class_group:
            attempts = attempts.filter(student__in=students)

        # Build student progress list
        attempt_by_student = {}
        for att in attempts:
            if att.student_id not in attempt_by_student:
                attempt_by_student[att.student_id] = att
            elif att.score > attempt_by_student[att.student_id].score:
                attempt_by_student[att.student_id] = att  # Keep best score

        student_progress = []
        for student in students:
            best_attempt = attempt_by_student.get(student.id)
            student_progress.append({
                'student_id': student.id,
                'student_name': student.get_full_name() or student.username,
                'student_email': student.email,
                'completed': best_attempt is not None,
                'score': best_attempt.score if best_attempt else None,
                'total_questions': best_attempt.total_questions if best_attempt else quiz.questions.count(),
                'percentage': round(best_attempt.score / best_attempt.total_questions * 100, 1) if best_attempt and best_attempt.total_questions > 0 else None,
                'time_spent_seconds': best_attempt.time_spent_seconds if best_attempt else None,
                'completed_at': best_attempt.completed_at.isoformat() if best_attempt else None,
                'attempt_count': QuizAttempt.objects.filter(
                    student=student, quiz=quiz, completed_at__isnull=False
                ).count(),
            })

        # Sort: completed first (by score desc), then not completed
        student_progress.sort(key=lambda x: (not x['completed'], -(x['score'] or 0)))

        completed_count = sum(1 for s in student_progress if s['completed'])
        avg_score = None
        if completed_count > 0:
            total_score = sum(s['percentage'] for s in student_progress if s['completed'])
            avg_score = round(total_score / completed_count, 1)

        return Response({
            'quiz_id': quiz.id,
            'quiz_title': quiz.title,
            'course_name': quiz.course.name,
            'total_students': len(student_progress),
            'completed_count': completed_count,
            'not_completed_count': len(student_progress) - completed_count,
            'average_score': avg_score,
            'students': student_progress,
        })

    # ─── Teacher: Get all attempts for a quiz ───
    @action(detail=True, methods=['get'], url_path='all-attempts')
    def all_attempts(self, request, pk=None):
        """Teacher views all student attempts for a quiz"""
        quiz = self.get_object()
        attempts = QuizAttempt.objects.filter(
            quiz=quiz, completed_at__isnull=False
        ).select_related('student').order_by('-completed_at')
        return Response(QuizAttemptSerializer(attempts, many=True).data)
