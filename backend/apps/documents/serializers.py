from rest_framework import serializers
from .models import Document
import os


class DocumentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.get_full_name', read_only=True)
    course_name = serializers.CharField(source='course.name', read_only=True)
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = ['id', 'title', 'file', 'file_type', 'course', 'course_name',
                  'uploaded_by', 'uploaded_by_name', 'is_processed',
                  'created_at', 'updated_at', 'file_url']
        read_only_fields = ['uploaded_by', 'created_at', 'updated_at', 'is_processed']

    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
        return None


class DocumentUploadSerializer(serializers.Serializer):
    """Serializer for document upload"""
    course_id = serializers.IntegerField()
    title = serializers.CharField(max_length=200)
    file = serializers.FileField()

    def validate_file(self, value):
        """Validate file type"""
        allowed_extensions = ['.pdf', '.docx', '.txt']
        ext = os.path.splitext(value.name)[1].lower()

        if ext not in allowed_extensions:
            raise serializers.ValidationError(
                f'File type not allowed. Allowed types: {", ".join(allowed_extensions)}'
            )

        # Limit file size to 50MB
        max_size = 50 * 1024 * 1024
        if value.size > max_size:
            raise serializers.ValidationError('File size exceeds 50MB limit')

        return value
