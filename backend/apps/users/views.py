from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from .models import Student, Teacher

User = get_user_model()


class UserViewSet(viewsets.ModelViewSet):
    """User management - placeholder"""
    queryset = User.objects.all()
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get current user info"""
        return Response({'message': 'Get current user - to be implemented'})


class StudentViewSet(viewsets.ModelViewSet):
    """Student management - placeholder"""
    queryset = Student.objects.all()


class TeacherViewSet(viewsets.ModelViewSet):
    """Teacher management - placeholder"""
    queryset = Teacher.objects.all()
