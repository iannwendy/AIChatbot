from django.db import models
from django.contrib.auth import get_user_model
from apps.courses.models import Course

User = get_user_model()


class ChatSession(models.Model):
    """Chat session model"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_sessions')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='chat_sessions')
    title = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'chat_sessions'
        ordering = ['-updated_at']


class ChatMessage(models.Model):
    """Chat message model"""
    MESSAGE_TYPES = [
        ('user', 'User'),
        ('assistant', 'Assistant'),
    ]
    
    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name='messages')
    message_type = models.CharField(max_length=20, choices=MESSAGE_TYPES)
    content = models.TextField()
    sources = models.JSONField(default=list, blank=True)  # For source citations
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'chat_messages'
        ordering = ['created_at']
