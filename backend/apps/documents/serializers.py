from rest_framework import serializers
from .models import Document
import os


class DocumentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.get_full_name', read_only=True)
    course_name = serializers.CharField(source='course.name', read_only=True)
    file_url = serializers.SerializerMethodField()
    file_name = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = ['id', 'title', 'file', 'file_name', 'file_type', 'course', 'course_name',
                  'uploaded_by', 'uploaded_by_name', 'is_processed',
                  'created_at', 'updated_at', 'file_url']
        read_only_fields = ['uploaded_by', 'created_at', 'updated_at', 'is_processed']

    def get_file_name(self, obj):
        if obj.file:
            return os.path.basename(obj.file.name)
        return ''

    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
        return None


class DocumentUploadSerializer(serializers.Serializer):
    """Serializer for document upload"""
    course_id = serializers.IntegerField(required=False)
    course = serializers.IntegerField(required=False)
    title = serializers.CharField(max_length=200)
    file = serializers.FileField()

    def validate(self, data):
        # Accept either course_id or course
        if not data.get('course_id') and not data.get('course'):
            raise serializers.ValidationError('course_id or course is required')
        if data.get('course') and not data.get('course_id'):
            data['course_id'] = data.get('course')
        return data

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
