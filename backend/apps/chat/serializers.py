from rest_framework import serializers
from .models import ChatSession, ChatMessage


class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ['id', 'message_type', 'content', 'sources', 'created_at']
        read_only_fields = ['created_at']


class ChatSessionSerializer(serializers.ModelSerializer):
    messages = ChatMessageSerializer(many=True, read_only=True)
    course_name = serializers.CharField(source='course.name', read_only=True)
    last_message = serializers.SerializerMethodField()

    class Meta:
        model = ChatSession
        fields = ['id', 'title', 'course', 'course_name', 'messages',
                  'last_message', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']

    def get_last_message(self, obj):
        message = obj.messages.last()
        if message:
            return ChatMessageSerializer(message).data
        return None


class SendMessageSerializer(serializers.Serializer):
    """Serializer for sending a chat message"""
    content = serializers.CharField(required=True, allow_blank=False)
    course_id = serializers.IntegerField(required=True)
