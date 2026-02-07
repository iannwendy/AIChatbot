from django.contrib import admin
from .models import Document


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ['title', 'course', 'file_type', 'uploaded_by', 'is_processed', 'created_at']
    list_filter = ['file_type', 'is_processed', 'created_at']
    search_fields = ['title', 'course__name']
