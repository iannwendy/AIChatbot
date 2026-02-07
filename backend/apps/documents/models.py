from django.db import models
from django.contrib.auth import get_user_model
from apps.courses.models import Course

User = get_user_model()


class Document(models.Model):
    """Document model for course materials"""
    FILE_TYPES = [
        ('pdf', 'PDF'),
        ('docx', 'DOCX'),
        ('txt', 'TXT'),
    ]
    
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='documents')
    title = models.CharField(max_length=200)
    file = models.FileField(upload_to='documents/')
    file_type = models.CharField(max_length=10, choices=FILE_TYPES)
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE)
    is_processed = models.BooleanField(default=False)  # For RAG processing
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'documents'
        ordering = ['-created_at']
    
    def __str__(self):
        return self.title
