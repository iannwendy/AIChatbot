from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Student, Teacher

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Full user serializer with role info"""
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'avatar_url', 'first_name', 'last_name', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class StudentSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_id = serializers.IntegerField(write_only=True, required=False)
    student_id = serializers.CharField(required=False)

    class Meta:
        model = Student
        fields = ['id', 'user', 'user_id', 'student_id', 'created_at']
        read_only_fields = ['id', 'created_at']


class TeacherSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_id = serializers.IntegerField(write_only=True, required=False)
    teacher_id = serializers.CharField(required=False)

    class Meta:
        model = Teacher
        fields = ['id', 'user', 'user_id', 'teacher_id', 'created_at']
        read_only_fields = ['id', 'created_at']


class ImportStudentsSerializer(serializers.Serializer):
    """Serializer for importing students from Excel"""
    file = serializers.FileField()
    course_id = serializers.IntegerField(required=False)


class ImportTeachersSerializer(serializers.Serializer):
    """Serializer for importing teachers from Excel"""
    file = serializers.FileField()
