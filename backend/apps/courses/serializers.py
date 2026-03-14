from rest_framework import serializers
from .models import Course, Quiz, Question, QuizAttempt, ExamSchedule
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


class QuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = ['id', 'question_text', 'options', 'correct_answer', 'explanation', 'order']


class QuizSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, read_only=True)
    question_count = serializers.IntegerField(source='question_count', read_only=True)

    class Meta:
        model = Quiz
        fields = ['id', 'title', 'description', 'topic', 'question_count', 'questions', 'created_at']


class QuizAttemptSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)

    class Meta:
        model = QuizAttempt
        fields = ['id', 'student', 'student_name', 'score', 'total_questions', 'started_at', 'completed_at']


class ExamScheduleSerializer(serializers.ModelSerializer):
    exam_type_display = serializers.CharField(source='get_exam_type_display', read_only=True)

    class Meta:
        model = ExamSchedule
        fields = ['id', 'exam_date', 'exam_type', 'exam_type_display', 'room', 'notes', 'created_at']
