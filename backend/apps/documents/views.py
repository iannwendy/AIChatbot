from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from .models import Document
from .serializers import DocumentSerializer, DocumentUploadSerializer
from .services.ingestion import IngestionPipeline
from apps.courses.models import Course
import os
import logging

logger = logging.getLogger(__name__)

User = get_user_model()


class DocumentViewSet(viewsets.ModelViewSet):
    """Document management"""
    queryset = Document.objects.select_related('course', 'uploaded_by').all()
    serializer_class = DocumentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter documents based on user role"""
        user = self.request.user
        if user.role == 'student':
            # Students only see documents from their enrolled courses
            return Document.objects.filter(course__students=user)
        elif user.role == 'teacher':
            # Teachers see documents from courses they teach
            return Document.objects.filter(course__teacher=user)
        # Admins see all documents
        return Document.objects.select_related('course', 'uploaded_by').all()

    def create(self, request, *args, **kwargs):
        """Upload a new document"""
        serializer = DocumentUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        course = get_object_or_404(Course, id=serializer.validated_data['course_id'])

        # Check permission (only teacher of the course or admin can upload)
        if request.user.role == 'teacher' and course.teacher != request.user:
            return Response(
                {'error': 'You can only upload documents to your own courses'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get file and determine type
        uploaded_file = serializer.validated_data['file']
        ext = os.path.splitext(uploaded_file.name)[1].lower()
        file_type = ext[1:]  # Remove the dot

        # Create document
        document = Document.objects.create(
            title=serializer.validated_data['title'],
            file=uploaded_file,
            file_type=file_type,
            course=course,
            uploaded_by=request.user
        )

        response_serializer = DocumentSerializer(document, context={'request': request})
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def process(self, request, pk=None):
        """Process document for RAG - parse, chunk, embed, store"""
        document = self.get_object()

        if document.is_processed:
            return Response({
                'message': 'Document already processed',
                'document_id': document.id,
                'status': 'already_processed'
            })

        try:
            pipeline = IngestionPipeline()
            result = pipeline.process_document(document)

            return Response({
                'message': 'Document processed successfully',
                'document_id': document.id,
                'pages_extracted': result.get('pages_extracted', 0),
                'chunks_created': result.get('chunks_created', 0),
                'status': 'success'
            })
        except Exception as e:
            logger.error(f"Document processing failed for {pk}: {e}")
            return Response(
                {'error': str(e), 'status': 'error'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def reprocess(self, request, pk=None):  # noqa: ARG001
        """Reprocess a document (delete old chunks and re-embed)"""
        document = self.get_object()

        try:
            pipeline = IngestionPipeline()
            result = pipeline.process_document(document, force_reprocess=True)

            return Response({
                'message': 'Document reprocessed successfully',
                'document_id': document.id,
                'pages_extracted': result.get('pages_extracted', 0),
                'chunks_created': result.get('chunks_created', 0),
                'status': 'success'
            })
        except Exception as e:
            logger.error(f"Document reprocessing failed for {pk}: {e}")
            return Response(
                {'error': str(e), 'status': 'error'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def by_course(self, request):
        """Get documents for a specific course"""
        course_id = request.query_params.get('course_id')
        if not course_id:
            return Response(
                {'error': 'course_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        documents = self.queryset.filter(course_id=course_id)
        serializer = DocumentSerializer(documents, many=True, context={'request': request})
        return Response(serializer.data)
