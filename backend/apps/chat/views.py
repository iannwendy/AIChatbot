from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import ChatSession, ChatMessage
from .serializers import ChatSessionSerializer, ChatMessageSerializer


class ChatSessionViewSet(viewsets.ModelViewSet):
    """Chat session management"""
    queryset = ChatSession.objects.all()
    serializer_class = ChatSessionSerializer
    
    @action(detail=True, methods=['post'])
    def send_message(self, request, pk=None):
        """Send a message in chat session - placeholder"""
        # TODO: Implement RAG-based chat response
        return Response({
            'message': 'Echo: ' + request.data.get('content', ''),
            'sources': []
        })


class ChatMessageViewSet(viewsets.ReadOnlyModelViewSet):
    """Chat message read-only viewset"""
    queryset = ChatMessage.objects.all()
    serializer_class = ChatMessageSerializer
