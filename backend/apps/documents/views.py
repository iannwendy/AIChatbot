from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Document
from .serializers import DocumentSerializer


class DocumentViewSet(viewsets.ModelViewSet):
    """Document management"""
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer
    
    @action(detail=True, methods=['post'])
    def process(self, request, pk=None):
        """Process document for RAG - placeholder"""
        # TODO: Implement document processing (chunking, embedding)
        return Response({'message': 'Document processing - to be implemented'})
