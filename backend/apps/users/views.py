from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.contrib.auth import get_user_model
from django.db import transaction
from .models import Student, Teacher
from .serializers import (
    UserSerializer, StudentSerializer, TeacherSerializer,
    ImportStudentsSerializer, ImportTeachersSerializer
)
import pandas as pd
import io

User = get_user_model()


class UserViewSet(viewsets.ModelViewSet):
    """User management"""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'destroy', 'update', 'partial_update']:
            return [IsAdminUser()]
        return [IsAuthenticated()]

    def get_queryset(self):
        queryset = User.objects.all()
        role = self.request.query_params.get('role')
        if role:
            queryset = queryset.filter(role=role)
        return queryset.order_by('-date_joined')

    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get current user info"""
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def students(self, request):
        """Get all students (from User model by role)"""
        students = User.objects.filter(role='student').order_by('-date_joined')
        serializer = self.get_serializer(students, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def teachers(self, request):
        """Get all teachers (from User model by role)"""
        teachers = User.objects.filter(role='teacher').order_by('-date_joined')
        serializer = self.get_serializer(teachers, many=True)
        return Response(serializer.data)


class StudentViewSet(viewsets.ModelViewSet):
    """Student management - queries User model by role"""
    queryset = User.objects.filter(role='student').order_by('-date_joined')
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'destroy', 'update', 'partial_update']:
            return [IsAdminUser()]
        return [IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        """Create student with user account"""
        data = request.data
        with transaction.atomic():
            user_data = {
                'username': data.get('email', '').split('@')[0],
                'email': data.get('email'),
                'first_name': data.get('first_name', ''),
                'last_name': data.get('last_name', ''),
                'role': 'student',
            }
            user, created = User.objects.get_or_create(
                email=user_data['email'],
                defaults=user_data
            )
            if not created:
                user.role = 'student'
                user.save()

            # Also create student profile if student_id provided
            if data.get('student_id'):
                Student.objects.get_or_create(
                    user=user,
                    defaults={'student_id': data.get('student_id', '')}
                )

        serializer = self.get_serializer(user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class TeacherViewSet(viewsets.ModelViewSet):
    """Teacher management - queries User model by role"""
    queryset = User.objects.filter(role='teacher').order_by('-date_joined')
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'destroy', 'update', 'partial_update']:
            return [IsAdminUser()]
        return [IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        """Create teacher with user account"""
        data = request.data
        with transaction.atomic():
            user_data = {
                'username': data.get('email', '').split('@')[0],
                'email': data.get('email'),
                'first_name': data.get('first_name', ''),
                'last_name': data.get('last_name', ''),
                'role': 'teacher',
            }
            user, created = User.objects.get_or_create(
                email=user_data['email'],
                defaults=user_data
            )
            if not created:
                user.role = 'teacher'
                user.save()

            # Also create teacher profile if teacher_id provided
            if data.get('teacher_id'):
                Teacher.objects.get_or_create(
                    user=user,
                    defaults={'teacher_id': data.get('teacher_id', '')}
                )

        serializer = self.get_serializer(user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ImportViewSet(viewsets.ViewSet):
    """Import students/teachers from Excel"""
    permission_classes = [IsAuthenticated, IsAdminUser]

    @action(detail=False, methods=['post'], url_path='students')
    def import_students(self, request):
        """Import students from Excel file"""
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            df = pd.read_excel(file)
            required_columns = ['email', 'student_id']

            # Check required columns
            missing = [col for col in required_columns if col not in df.columns]
            if missing:
                return Response({
                    'error': f'Missing required columns: {missing}',
                    'required': required_columns
                }, status=status.HTTP_400_BAD_REQUEST)

            created_count = 0
            errors = []

            with transaction.atomic():
                for idx, row in df.iterrows():
                    try:
                        username = str(row['email']).split('@')[0]
                        user, user_created = User.objects.get_or_create(
                            email=row['email'],
                            defaults={
                                'username': username,
                                'role': 'student',
                                'first_name': str(row.get('first_name', '')),
                                'last_name': str(row.get('last_name', '')),
                            }
                        )

                        student, created = Student.objects.get_or_create(
                            user=user,
                            defaults={'student_id': str(row['student_id'])}
                        )

                        if created or user_created:
                            created_count += 1
                    except Exception as e:
                        errors.append(f"Row {idx + 2}: {str(e)}")

            return Response({
                'message': f'Successfully imported {created_count} students',
                'errors': errors[:10] if errors else [],  # Limit errors
                'total_created': created_count
            })

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], url_path='teachers')
    def import_teachers(self, request):
        """Import teachers from Excel file"""
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            df = pd.read_excel(file)
            required_columns = ['email', 'teacher_id']

            missing = [col for col in required_columns if col not in df.columns]
            if missing:
                return Response({
                    'error': f'Missing required columns: {missing}',
                    'required': required_columns
                }, status=status.HTTP_400_BAD_REQUEST)

            created_count = 0
            errors = []

            with transaction.atomic():
                for idx, row in df.iterrows():
                    try:
                        username = str(row['email']).split('@')[0]
                        user, user_created = User.objects.get_or_create(
                            email=row['email'],
                            defaults={
                                'username': username,
                                'role': 'teacher',
                                'first_name': str(row.get('first_name', '')),
                                'last_name': str(row.get('last_name', '')),
                            }
                        )

                        teacher, created = Teacher.objects.get_or_create(
                            user=user,
                            defaults={'teacher_id': str(row['teacher_id'])}
                        )

                        if created or user_created:
                            created_count += 1
                    except Exception as e:
                        errors.append(f"Row {idx + 2}: {str(e)}")

            return Response({
                'message': f'Successfully imported {created_count} teachers',
                'errors': errors[:10] if errors else [],
                'total_created': created_count
            })

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
