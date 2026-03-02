from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.contrib.auth import get_user_model
from .models import Course
from .serializers import CourseSerializer, CourseCreateSerializer, EnrollmentSerializer
from apps.users.models import Student

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
