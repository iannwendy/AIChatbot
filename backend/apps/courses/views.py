from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import Course, Quiz, Question, QuizAttempt, ExamSchedule
from .serializers import (
    CourseSerializer, CourseCreateSerializer, EnrollmentSerializer,
    QuizSerializer, QuestionSerializer, QuizAttemptSerializer, ExamScheduleSerializer
)
from apps.users.models import Student
from apps.documents.rag.retriever import DocumentRetriever

import json
import logging

logger = logging.getLogger(__name__)

User = get_user_model()


class CourseViewSet(viewsets.ModelViewSet):
    """Course management"""
    queryset = Course.objects.select_related('teacher').prefetch_related('students').all()
    serializer_class = CourseSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'destroy', 'update', 'partial_update']:
            return [IsAdminUser()]
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

    @action(detail=False, methods=['get'])
    def my_courses(self, request):
        """Get courses for current user"""
        user = request.user
        if user.role == 'student':
            courses = Course.objects.filter(students=user)
        elif user.role == 'teacher':
            courses = Course.objects.filter(teacher=user)
        else:
            courses = Course.objects.all()

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
        from langchain_openai import ChatOpenAI
        from django.conf import settings

        try:
            llm = ChatOpenAI(model='gpt-4o-mini', api_key=settings.OPENAI_API_KEY)
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
