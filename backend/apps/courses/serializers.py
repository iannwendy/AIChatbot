from rest_framework import serializers
from .models import Course, Quiz, Question, QuizAttempt, ExamSchedule, QuizResult
from django.contrib.auth import get_user_model

User = get_user_model()


class StudentBriefSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source='get_full_name', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'first_name', 'last_name', 'full_name']


class CourseSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source='teacher.get_full_name', read_only=True)
    student_count = serializers.SerializerMethodField()
    document_count = serializers.SerializerMethodField()
    students = StudentBriefSerializer(many=True, read_only=True)

    class Meta:
        model = Course
        fields = ['id', 'name', 'code', 'description', 'teacher', 'teacher_name',
                  'students', 'student_count', 'document_count', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']

    def get_student_count(self, obj):
        return obj.students.count()

    def get_document_count(self, obj):
        return obj.documents.count()


class CourseCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating courses"""
    teacher_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    student_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False
    )

    class Meta:
        model = Course
        fields = ['name', 'code', 'description', 'teacher', 'teacher_id', 'student_ids']
        extra_kwargs = {'teacher': {'required': False, 'allow_null': True}}

    def create(self, validated_data):
        teacher_id = validated_data.pop('teacher_id', None)
        student_ids = validated_data.pop('student_ids', [])

        if teacher_id and teacher_id > 0:
            validated_data['teacher'] = User.objects.filter(id=teacher_id).first()
        elif 'teacher' not in validated_data:
            validated_data['teacher'] = None

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
    """Question serializer WITHOUT correct answer (for students taking quiz)"""
    class Meta:
        model = Question
        fields = ['id', 'question_text', 'options', 'order']


class QuestionWithAnswerSerializer(serializers.ModelSerializer):
    """Question serializer WITH correct answer (for teachers / after submission)"""
    class Meta:
        model = Question
        fields = ['id', 'question_text', 'options', 'correct_answer', 'explanation', 'order']


class QuestionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating questions"""
    class Meta:
        model = Question
        fields = ['id', 'question_text', 'options', 'correct_answer', 'explanation', 'order']


class QuizSerializer(serializers.ModelSerializer):
    questions = QuestionWithAnswerSerializer(many=True, read_only=True)
    question_count = serializers.IntegerField(read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model = Quiz
        fields = ['id', 'title', 'description', 'topic', 'question_count', 'questions',
                  'created_by', 'created_by_name', 'created_at']
        read_only_fields = ['created_by', 'created_at']


class QuizStudentSerializer(serializers.ModelSerializer):
    """Quiz serializer for students (no correct answers)"""
    questions = QuestionSerializer(many=True, read_only=True)
    question_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Quiz
        fields = ['id', 'title', 'description', 'topic', 'question_count', 'questions', 'created_at']


class QuizCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating quizzes"""
    class Meta:
        model = Quiz
        fields = ['id', 'title', 'description', 'topic', 'course']
        read_only_fields = ['id']


class QuizAttemptSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)
    student_email = serializers.CharField(source='student.email', read_only=True)
    quiz_title = serializers.CharField(source='quiz.title', read_only=True)
    percentage = serializers.SerializerMethodField()

    class Meta:
        model = QuizAttempt
        fields = ['id', 'student', 'student_name', 'student_email', 'quiz', 'quiz_title',
                  'score', 'total_questions', 'percentage', 'time_spent_seconds',
                  'class_group', 'started_at', 'completed_at']

    def get_percentage(self, obj):
        if obj.total_questions > 0:
            return round(obj.score / obj.total_questions * 100, 1)
        return 0


class QuizResultSerializer(serializers.ModelSerializer):
    question_text = serializers.CharField(source='question.question_text', read_only=True)
    options = serializers.JSONField(source='question.options', read_only=True)
    correct_answer = serializers.IntegerField(source='question.correct_answer', read_only=True)
    explanation = serializers.CharField(source='question.explanation', read_only=True)

    class Meta:
        model = QuizResult
        fields = ['id', 'question', 'question_text', 'options', 'selected_option',
                  'correct_answer', 'is_correct', 'explanation', 'time_spent_seconds']


class ExamScheduleSerializer(serializers.ModelSerializer):
    exam_type_display = serializers.CharField(source='get_exam_type_display', read_only=True)

    class Meta:
        model = ExamSchedule
        fields = ['id', 'exam_date', 'exam_type', 'exam_type_display', 'room', 'notes', 'created_at']
