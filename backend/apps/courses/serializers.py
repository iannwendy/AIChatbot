from rest_framework import serializers
from .models import Course
from django.contrib.auth import get_user_model

User = get_user_model()


class CourseSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source='teacher.get_full_name', read_only=True)
    student_count = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = ['id', 'name', 'code', 'description', 'teacher', 'teacher_name',
                  'students', 'student_count', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']

    def get_student_count(self, obj):
        return obj.students.count()


class CourseCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating courses"""
    student_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False
    )

    class Meta:
        model = Course
        fields = ['name', 'code', 'description', 'teacher', 'student_ids']

    def create(self, validated_data):
        student_ids = validated_data.pop('student_ids', [])
        course = Course.objects.create(**validated_data)

        if student_ids:
            students = User.objects.filter(id__in=student_ids, role='student')
            course.students.set(students)

        return course


class EnrollmentSerializer(serializers.Serializer):
    """Serializer for course enrollment"""
    student_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=True
    )
