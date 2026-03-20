from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class Course(models.Model):
    """Course model"""
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)
    teacher = models.ForeignKey(User, on_delete=models.CASCADE, related_name='taught_courses', null=True, blank=True)
    students = models.ManyToManyField(User, related_name='enrolled_courses', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'courses'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.code} - {self.name}"


class ExamSchedule(models.Model):
    """Exam schedule for courses"""
    EXAM_TYPES = [
        ('midterm', 'Giữa kỳ'),
        ('final', 'Cuối kỳ'),
    ]

    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='exam_schedules')
    exam_date = models.DateTimeField()
    exam_type = models.CharField(max_length=20, choices=EXAM_TYPES)
    room = models.CharField(max_length=50, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'exam_schedules'
        ordering = ['exam_date']

    def __str__(self):
        return f"{self.course.code} - {self.get_exam_type_display()} - {self.exam_date}"


class Quiz(models.Model):
    """Quiz generated from course documents"""
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='quizzes')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    topic = models.CharField(max_length=100, blank=True)  # e.g., "Chapter 1"
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'quizzes'
        ordering = ['-created_at']

    def __str__(self):
        return self.title

    @property
    def question_count(self):
        return self.questions.count()


class Question(models.Model):
    """Individual question in a quiz"""
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='questions')
    question_text = models.TextField()
    options = models.JSONField()  # List of option strings
    correct_answer = models.IntegerField()  # Index of correct option (0-3)
    explanation = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'questions'
        ordering = ['order']

    def __str__(self):
        return self.question_text[:50] + "..."


class QuizAttempt(models.Model):
    """Student's attempt at a quiz"""
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='quiz_attempts')
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='attempts')
    score = models.PositiveIntegerField(default=0)
    total_questions = models.PositiveIntegerField(default=0)
    answers = models.JSONField(default=list)  # List of student's selected indices
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    class_group = models.CharField(max_length=100, blank=True, default='')  # e.g., "K17.2"
    time_spent_seconds = models.IntegerField(default=0)                       # seconds spent on quiz

    class Meta:
        db_table = 'quiz_attempts'
        ordering = ['-started_at']

    def __str__(self):
        return f"{self.student.username} - {self.quiz.title} - {self.score}/{self.total_questions}"


class QuizResult(models.Model):
    """Per-question result tracking for a quiz attempt"""
    attempt = models.ForeignKey(QuizAttempt, on_delete=models.CASCADE, related_name='results')
    question = models.ForeignKey('Question', on_delete=models.CASCADE)
    selected_option = models.IntegerField(null=True, blank=True)
    is_correct = models.BooleanField(default=False)
    time_spent_seconds = models.IntegerField(default=0)  # seconds spent on this question

    class Meta:
        db_table = 'quiz_results'
        ordering = ['id']

    def __str__(self):
        return f"Result: {self.attempt} - Q{self.question.order + 1} - {'✓' if self.is_correct else '✗'}"
