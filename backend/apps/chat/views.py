from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.http import StreamingHttpResponse
from django.db.models import Max
from bson import ObjectId
from datetime import datetime
from .models import Course
from .mongo_utils import get_collection
from apps.documents.rag.chain import RAGChain
from apps.documents.rag.agent import RAGAgent
from apps.documents.services.config import AVAILABLE_MODELS, MEMORY_WINDOW_SIZE
import json
import logging

logger = logging.getLogger(__name__)
User = get_user_model()


class ChatSessionViewSet(viewsets.ViewSet):
    """Chat session management using MongoDB"""
    permission_classes = [IsAuthenticated]

    def list(self, request):
        """List all chat sessions for current user"""
        sessions = get_collection('chat_sessions').find({
            'user_id': request.user.id
        }).sort('updated_at', -1)

        result = []
        for session in sessions:
            result.append({
                'id': str(session['_id']),
                'user_id': session['user_id'],
                'course_id': session['course_id'],
                'course_name': session.get('course_name', ''),
                'title': session.get('title', 'New Chat'),
                'created_at': session['created_at'].isoformat() if session.get('created_at') else None,
                'updated_at': session['updated_at'].isoformat() if session.get('updated_at') else None,
            })

        return Response(result)

    def create(self, request):
        """Create a new chat session"""
        course_id = request.data.get('course_id')
        title = request.data.get('title', 'New Chat')

        course = get_object_or_404(Course, id=course_id)

        # Check if user is enrolled in the course
        if request.user.role == 'student' and request.user not in course.students.all():
            return Response(
                {'error': 'You are not enrolled in this course'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Create session in MongoDB
        session_data = {
            'user_id': request.user.id,
            'course_id': course_id,
            'course_name': course.name,
            'title': title,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
        }

        result = get_collection('chat_sessions').insert_one(session_data)
        session_data['_id'] = result.inserted_id

        return Response({
            'id': str(session_data['_id']),
            'user_id': session_data['user_id'],
            'course_id': session_data['course_id'],
            'course_name': session_data['course_name'],
            'title': session_data['title'],
            'created_at': session_data['created_at'].isoformat(),
            'updated_at': session_data['updated_at'].isoformat(),
        }, status=status.HTTP_201_CREATED)

    def retrieve(self, request, pk=None):
        """Get a specific chat session with messages"""
        try:
            session = get_collection('chat_sessions').find_one({
                '_id': ObjectId(pk),
                'user_id': request.user.id
            })
        except:
            return Response({'error': 'Invalid session ID'}, status=status.HTTP_400_BAD_REQUEST)

        if not session:
            return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)

        # Get messages for this session
        messages = get_collection('chat_messages').find({
            'session_id': str(session['_id'])
        }).sort('created_at', 1)

        session_data = {
            'id': str(session['_id']),
            'user_id': session['user_id'],
            'course_id': session['course_id'],
            'course_name': session.get('course_name', ''),
            'title': session.get('title', 'New Chat'),
            'created_at': session['created_at'].isoformat() if session.get('created_at') else None,
            'updated_at': session['updated_at'].isoformat() if session.get('updated_at') else None,
            'messages': [{
                'id': str(msg['_id']),
                'message_type': msg['message_type'],
                'content': msg['content'],
                'sources': msg.get('sources', []),
                'created_at': msg['created_at'].isoformat() if msg.get('created_at') else None,
            } for msg in messages]
        }

        return Response(session_data)

    def destroy(self, request, pk=None):
        """Delete a chat session"""
        try:
            result = get_collection('chat_sessions').delete_one({
                '_id': ObjectId(pk),
                'user_id': request.user.id
            })

            # Also delete all messages in this session
            get_collection('chat_messages').delete_many({'session_id': pk})

            if result.deleted_count == 0:
                return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)

            return Response(status=status.HTTP_204_NO_CONTENT)
        except:
            return Response({'error': 'Invalid session ID'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def send_message(self, request, pk=None):
        """Send a message in chat session"""
        # Get session
        try:
            session = get_collection('chat_sessions').find_one({
                '_id': ObjectId(pk),
                'user_id': request.user.id
            })
        except:
            return Response({'error': 'Invalid session ID'}, status=status.HTTP_400_BAD_REQUEST)

        if not session:
            return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)

        content = request.data.get('content', '')
        if not content:
            return Response(
                {'error': 'Message content is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Save user message to MongoDB
        user_message_data = {
            'session_id': pk,
            'user_id': request.user.id,
            'message_type': 'user',
            'content': content,
            'sources': [],
            'created_at': datetime.utcnow(),
        }
        user_msg_result = get_collection('chat_messages').insert_one(user_message_data)
        user_message_data['_id'] = user_msg_result.inserted_id

        # Get course_id for retrieval
        course_id = session.get('course_id')

        # Get conversation history (last 10 messages)
        recent_messages = list(
            get_collection('chat_messages')
            .find({'session_id': pk})
            .sort('created_at', -1)
            .limit(10)
        )
        conversation_history = [
            {'role': m['message_type'], 'content': m['content']}
            for m in reversed(recent_messages)
            if m.get('message_type') in ('user', 'assistant')
        ]

        # Call RAG chain
        model = request.data.get('model')
        try:
            rag_chain = RAGChain(model=model)
            rag_result = rag_chain.invoke_with_history(
                question=content,
                course_id=course_id,
                conversation_history=conversation_history[:-1],  # Exclude current question
            )
            response_content = rag_result['answer']
            sources = rag_result['sources']
        except Exception as e:
            logger.error(f"RAG chain error: {e}")
            response_content = "Xin lỗi, đã xảy ra lỗi khi xử lý câu hỏi. Vui lòng thử lại."
            sources = []

        # Format sources for storage (extract source strings for frontend display)
        source_labels = [s.get('source', '') for s in sources if s.get('source')]

        # Save assistant message to MongoDB
        assistant_message_data = {
            'session_id': pk,
            'user_id': request.user.id,
            'message_type': 'assistant',
            'content': response_content,
            'sources': source_labels,
            'created_at': datetime.utcnow(),
        }
        assistant_msg_result = get_collection('chat_messages').insert_one(assistant_message_data)
        assistant_message_data['_id'] = assistant_msg_result.inserted_id

        # Update session timestamp
        get_collection('chat_sessions').update_one(
            {'_id': ObjectId(pk)},
            {'$set': {'updated_at': datetime.utcnow()}}
        )

        return Response({
            'user_message': {
                'id': str(user_message_data['_id']),
                'message_type': user_message_data['message_type'],
                'content': user_message_data['content'],
                'sources': user_message_data['sources'],
                'created_at': user_message_data['created_at'].isoformat(),
            },
            'assistant_message': {
                'id': str(assistant_message_data['_id']),
                'message_type': assistant_message_data['message_type'],
                'content': assistant_message_data['content'],
                'sources': assistant_message_data['sources'],
                'created_at': assistant_message_data['created_at'].isoformat(),
            }
        })

    @action(detail=True, methods=['post'], url_path='send_message_stream')
    def send_message_stream(self, request, pk=None):
        """Stream chat response using Server-Sent Events"""
        # Validate session
        try:
            session = get_collection('chat_sessions').find_one({
                '_id': ObjectId(pk),
                'user_id': request.user.id
            })
        except Exception:
            return Response({'error': 'Invalid session ID'}, status=status.HTTP_400_BAD_REQUEST)

        if not session:
            return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)

        content = request.data.get('content', '')
        if not content:
            return Response(
                {'error': 'Message content is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        model = request.data.get('model')

        # Save user message to MongoDB
        user_message_data = {
            'session_id': pk,
            'user_id': request.user.id,
            'message_type': 'user',
            'content': content,
            'sources': [],
            'created_at': datetime.utcnow(),
        }
        user_msg_result = get_collection('chat_messages').insert_one(user_message_data)
        user_message_id = str(user_msg_result.inserted_id)

        # Get course_id and conversation history
        course_id = session.get('course_id')
        recent_messages = list(
            get_collection('chat_messages')
            .find({'session_id': pk})
            .sort('created_at', -1)
            .limit(MEMORY_WINDOW_SIZE)
        )
        conversation_history = [
            {'role': m['message_type'], 'content': m['content']}
            for m in reversed(recent_messages)
            if m.get('message_type') in ('user', 'assistant')
        ]

        def event_stream():
            # Send start event with user message ID
            yield f"data: {json.dumps({'type': 'start', 'user_message_id': user_message_id})}\n\n"

            full_response = ""
            sources = []

            try:
                use_agent = request.data.get('use_agent', True)

                if use_agent:
                    # Use Agent with tool calling
                    agent = RAGAgent(model=model)
                    agent_result = agent.invoke(
                        question=content,
                        course_id=course_id,
                        course_name=session.get('course_name', ''),
                        conversation_history=conversation_history[:-1],
                    )
                    full_response = agent_result['answer']
                    sources = agent_result.get('sources', [])

                    # Stream the response in chunks for SSE
                    chunk_size = 10
                    for i in range(0, len(full_response), chunk_size):
                        chunk = full_response[i:i + chunk_size]
                        yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"
                else:
                    # Use regular RAG chain with streaming
                    rag_chain = RAGChain(model=model)

                    retrieval = rag_chain.retriever.retrieve_with_context(
                        query=content,
                        course_id=course_id,
                    )
                    sources = retrieval.get('sources', [])

                    for chunk in rag_chain.stream_with_history(
                        question=content,
                        course_id=course_id,
                        conversation_history=conversation_history[:-1],
                    ):
                        full_response += chunk
                        yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"

            except Exception as e:
                logger.error(f"Streaming RAG error: {e}")
                error_msg = "Xin lỗi, đã xảy ra lỗi khi xử lý câu hỏi."
                full_response = error_msg
                yield f"data: {json.dumps({'type': 'chunk', 'content': error_msg})}\n\n"

            # Format sources for storage
            source_labels = [s.get('source', '') for s in sources if s.get('source')]

            # Save assistant message to MongoDB
            assistant_message_data = {
                'session_id': pk,
                'user_id': request.user.id,
                'message_type': 'assistant',
                'content': full_response,
                'sources': source_labels,
                'created_at': datetime.utcnow(),
            }
            result = get_collection('chat_messages').insert_one(assistant_message_data)
            assistant_message_id = str(result.inserted_id)

            # Update session timestamp
            get_collection('chat_sessions').update_one(
                {'_id': ObjectId(pk)},
                {'$set': {'updated_at': datetime.utcnow()}}
            )

            # Send sources and done event
            yield f"data: {json.dumps({'type': 'sources', 'sources': source_labels})}\n\n"
            yield f"data: {json.dumps({'type': 'done', 'assistant_message_id': assistant_message_id})}\n\n"

        response = StreamingHttpResponse(event_stream(), content_type='text/event-stream')
        response['X-Accel-Buffering'] = 'no'
        response['Cache-Control'] = 'no-cache'
        return response

    @action(detail=False, methods=['get'])
    def models(self, request):
        """Get available LLM models"""
        return Response(AVAILABLE_MODELS)
