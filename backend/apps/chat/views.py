from rest_framework import viewsets, status
from rest_framework.authentication import SessionAuthentication
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.http import StreamingHttpResponse
from django.db.models import Max
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from bson import ObjectId
from datetime import datetime
from .models import Course
from .mongo_utils import get_collection
from apps.documents.rag.agent import RAGAgent
from apps.documents.services.config import AVAILABLE_MODELS, MEMORY_WINDOW_SIZE
import json
import logging
import time

logger = logging.getLogger(__name__)
User = get_user_model()


class CsrfExemptSessionAuthentication(SessionAuthentication):
    """Session authentication without CSRF enforcement for API endpoints."""
    def enforce_csrf(self, request):
        return  # Skip CSRF check


@method_decorator(csrf_exempt, name='dispatch')
class ChatSessionViewSet(viewsets.ViewSet):
    """Chat session management using MongoDB"""
    authentication_classes = [CsrfExemptSessionAuthentication]
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
        course_id = request.data.get('course_id', 0)
        title = request.data.get('title', 'New Chat')

        course = None
        if course_id and course_id != 0:
            course = get_object_or_404(Course, id=course_id)
            if request.user.role == 'student' and request.user not in course.students.all():
                return Response(
                    {'error': 'You are not enrolled in this course'},
                    status=status.HTTP_403_FORBIDDEN
                )

        session_data = {
            'user_id': request.user.id,
            'course_id': course_id if course_id != 0 else None,
            'course_name': course.name if course else 'General Chat',
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
                'practice_quiz': msg.get('practice_quiz'),
                'created_at': msg['created_at'].isoformat() if msg.get('created_at') else None,
            } for msg in messages]
        }

        return Response(session_data)

    def partial_update(self, request, pk=None):
        """Update session (e.g., rename)"""
        try:
            session = get_collection('chat_sessions').find_one({
                '_id': ObjectId(pk),
                'user_id': request.user.id
            })
        except:
            return Response({'error': 'Invalid session ID'}, status=status.HTTP_400_BAD_REQUEST)

        if not session:
            return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)

        update_data = {}
        if 'title' in request.data:
            update_data['title'] = request.data['title']

        if update_data:
            update_data['updated_at'] = datetime.utcnow()
            get_collection('chat_sessions').update_one(
                {'_id': ObjectId(pk)},
                {'$set': update_data}
            )

        session = get_collection('chat_sessions').find_one({'_id': ObjectId(pk)})
        return Response({
            'id': str(session['_id']),
            'title': session.get('title', 'New Chat'),
            'updated_at': session.get('updated_at').isoformat() if session.get('updated_at') else None,
        })

    @action(detail=True, methods=['patch'], url_path='update_practice_quiz')
    def update_practice_quiz(self, request, pk=None):
        """Update practice quiz answers/results in a chat message."""
        message_id = request.data.get('message_id')
        if not message_id:
            return Response({'error': 'message_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            msg_obj_id = ObjectId(message_id)
        except Exception:
            return Response({'error': 'Invalid message_id'}, status=status.HTTP_400_BAD_REQUEST)

        msg = get_collection('chat_messages').find_one({
            '_id': msg_obj_id,
            'session_id': pk,
            'user_id': request.user.id,
        })
        if not msg:
            return Response({'error': 'Message not found'}, status=status.HTTP_404_NOT_FOUND)

        if 'practice_quiz' not in msg:
            return Response({'error': 'Message has no practice quiz'}, status=status.HTTP_400_BAD_REQUEST)

        answers = request.data.get('answers')
        result_data = request.data.get('result')

        update_fields = {}
        if answers is not None:
            update_fields['practice_quiz.answers'] = answers
        if result_data is not None:
            update_fields['practice_quiz.result'] = result_data

        if update_fields:
            get_collection('chat_messages').update_one(
                {'_id': msg_obj_id},
                {'$set': update_fields}
            )

        return Response({'status': 'ok'})

    def destroy(self, request, pk=None):
        """Delete a chat session"""
        try:
            result = get_collection('chat_sessions').delete_one({
                '_id': ObjectId(pk),
                'user_id': request.user.id
            })
            get_collection('chat_messages').delete_many({'session_id': pk})

            if result.deleted_count == 0:
                return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)

            return Response(status=status.HTTP_204_NO_CONTENT)
        except:
            return Response({'error': 'Invalid session ID'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def send_message(self, request, pk=None):
        """Send a message in chat session (non-streaming)"""
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

        course_id = session.get('course_id')

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

        model = request.data.get('model')
        try:
            if course_id:
                try:
                    course = Course.objects.get(id=course_id)
                    course_name = course.name
                except Course.DoesNotExist:
                    course_name = ""
            else:
                course_name = session.get('course_name', '')

            rag_agent = RAGAgent(model=model)
            rag_result = rag_agent.invoke(
                question=content,
                course_id=course_id,
                course_name=course_name,
                conversation_history=conversation_history[:-1],
                user_id=request.user.id,
            )
            response_content = rag_result['answer']
            sources = rag_result['sources']
        except Exception as e:
            logger.error(f"RAG chain error: {e}")
            response_content = "Xin lỗi, đã xảy ra lỗi khi xử lý câu hỏi. Vui lòng thử lại."
            sources = []

        source_labels = [s.get('source', '') for s in sources if s.get('source')]

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
        """Stream chat response using Server-Sent Events — tokens arrive in real-time."""
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
            from langchain_google_genai import ChatGoogleGenerativeAI
            from apps.documents.services.config import LLM_MODEL
            from apps.documents.rag.tools import AVAILABLE_TOOLS, execute_tool
            from apps.documents.rag.agent import AGENT_SYSTEM_PROMPT
            from django.conf import settings

            logger.info(f"[Stream] Starting for session {pk}, question: {content[:50]}")
            yield f"data: {json.dumps({'type': 'start', 'user_message_id': user_message_id})}\n\n"

            full_response = ""
            sources = []
            tool_used = None
            tool_result_raw = None

            try:
                # ── Non-streaming LLM: for tool decision detection ─────────────
                # IMPORTANT: streaming=True changes invoke() to return AsyncIterator,
                # which cannot access tool_calls. We need a separate non-streaming instance.
                llm_non_streaming = ChatGoogleGenerativeAI(
                    model=model or LLM_MODEL,
                    google_api_key=settings.GEMINI_API_KEY,
                    temperature=0.7,
                    max_tokens=4096,
                    streaming=False,
                )

                # ── Streaming-capable LLM: for token-by-token streaming ─────────
                # Use stream() method (not streaming=True + invoke()) for real token streaming
                llm_streaming = ChatGoogleGenerativeAI(
                    model=model or LLM_MODEL,
                    google_api_key=settings.GEMINI_API_KEY,
                    temperature=0.7,
                    max_tokens=4096,
                )

                # Course context
                if course_id:
                    try:
                        course = Course.objects.get(id=course_id)
                        course_name = course.name
                    except Course.DoesNotExist:
                        course_name = ""
                else:
                    course_name = session.get('course_name', '')

                # Build LLM messages
                messages = [{"role": "system", "content": AGENT_SYSTEM_PROMPT}]
                for msg in conversation_history[:-1]:
                    role = msg.get('role', 'user')
                    if role in ('user', 'assistant'):
                        messages.append({"role": role, "content": msg.get('content', '')})
                messages.append({"role": "user", "content": content})

                # ── LLM call #1: detect tool (non-streaming → returns BaseMessage) ─
                logger.info("[Stream] LLM call #1 — tool decision (non-streaming)")
                response = llm_non_streaming.invoke(messages, tools=AVAILABLE_TOOLS)
                logger.info(f"[Stream] LLM response type: {type(response)}, content: {str(response.content)[:200]}")

                # Check tool_calls attribute safely
                response_tool_calls = getattr(response, 'tool_calls', None)
                tool_called = response_tool_calls and len(response_tool_calls) > 0
                logger.info(f"[Stream] tool_called={tool_called}, tool_calls={response_tool_calls}")

                if tool_called:
                    # ── Tool mode ─────────────────────────────────────────────
                    tool_call = response.tool_calls[0]
                    tool_name = tool_call.get('name', '')
                    tool_args = tool_call.get('args', {})
                    tool_used = tool_name
                    logger.info(f"[Stream] Tool called: {tool_name} | args: {tool_args}")

                    # Notify frontend that a tool is running
                    yield f"data: {json.dumps({'type': 'tool_call', 'tool': tool_name})}\n\n"

                    # Execute the tool (synchronous — fast)
                    tool_result_raw = execute_tool(
                        tool_name=tool_name,
                        params=tool_args,
                        course_id=course_id,
                        course_name=course_name,
                        user_id=request.user.id,
                    )
                    logger.info(f"[Stream] Tool result: {tool_result_raw[:200]}...")

                    # Emit practice quiz immediately if generated
                    if tool_name == 'generate_practice_quiz':
                        try:
                            quiz_data = json.loads(tool_result_raw)
                            if 'questions' in quiz_data:
                                quiz_payload = json.dumps({
                                    'type': 'practice_quiz',
                                    'questions': quiz_data['questions'],
                                    'topic': quiz_data.get('topic', ''),
                                })
                                yield f"data: {quiz_payload}\n\n"
                        except Exception as e:
                            logger.error(f"Failed to emit practice quiz: {e}")

                    # ── LLM call #2: stream natural answer token-by-token ────
                    # (use streaming LLM so tokens arrive as they are generated)
                    final_prompt = (
                        f"Kết quả tra cứu từ hệ thống (tool '{tool_name}'):\n"
                        f"---\n{tool_result_raw}\n---\n\n"
                        f"Dựa trên dữ liệu trên, hãy trả lời câu hỏi của sinh viên "
                        f"một cách tự nhiên, thân thiện và dễ hiểu:\n{content}"
                    )
                    logger.info("[Stream] LLM call #2 — streaming final answer")
                    final_response = llm_streaming.stream([
                        {"role": "system", "content": AGENT_SYSTEM_PROMPT},
                        {"role": "user", "content": final_prompt},
                    ])

                    # Stream each token as it arrives from Gemini
                    for chunk in final_response:
                        if hasattr(chunk, 'content') and chunk.content:
                            full_response += chunk.content
                            yield f"data: {json.dumps({'type': 'chunk', 'content': chunk.content})}\n\n"
                            # Small delay so streaming feels natural on short answers
                            time.sleep(0.02)

                    logger.info(f"[Stream] Tool-mode done. Response length: {len(full_response)}")

                    # Extract sources for search_documents
                    if tool_name == 'search_documents':
                        from apps.documents.rag.retriever import DocumentRetriever
                        retriever = DocumentRetriever()
                        retrieval = retriever.retrieve_with_context(
                            query=tool_args.get('query', content),
                            course_id=course_id,
                        )
                        sources = retrieval.get('sources', [])

                else:
                    # ── Direct answer: stream tokens as they arrive ────────────
                    # Use streaming LLM so tokens arrive in real-time
                    logger.info("[Stream] No tool — streaming direct answer")
                    direct_response = llm_streaming.stream(messages)

                    for chunk in direct_response:
                        if hasattr(chunk, 'content') and chunk.content:
                            full_response += chunk.content
                            yield f"data: {json.dumps({'type': 'chunk', 'content': chunk.content})}\n\n"
                            time.sleep(0.02)
                    logger.info(f"[Stream] Direct streaming done. Length: {len(full_response)}")

            except Exception as e:
                logger.error(f"Streaming error: {e}", exc_info=True)
                error_msg = "Xin lỗi, đã xảy ra lỗi khi xử lý câu hỏi. Vui lòng thử lại sau."
                full_response = error_msg
                yield f"data: {json.dumps({'type': 'chunk', 'content': error_msg})}\n\n"

            # ── Post-processing: save to MongoDB ───────────────────────────────
            source_labels = [s.get('source', '') for s in sources if s.get('source')]
            sources_for_frontend = [
                {
                    'document_title': s.get('document_title', ''),
                    'page_number': s.get('page_number'),
                    'source': s.get('source', ''),
                }
                for s in sources if s.get('source')
            ]

            assistant_message_data = {
                'session_id': pk,
                'user_id': request.user.id,
                'message_type': 'assistant',
                'content': full_response,
                'sources': source_labels,
                'created_at': datetime.utcnow(),
            }

            if tool_used == 'generate_practice_quiz' and tool_result_raw:
                try:
                    quiz_data = json.loads(tool_result_raw)
                    if 'questions' in quiz_data:
                        assistant_message_data['practice_quiz'] = {
                            'questions': quiz_data['questions'],
                            'topic': quiz_data.get('topic', ''),
                            'answers': None,
                            'result': None,
                        }
                except Exception as e:
                    logger.error(f"Failed to attach practice quiz: {e}")

            db_result = get_collection('chat_messages').insert_one(assistant_message_data)
            assistant_message_id = str(db_result.inserted_id)

            # Auto-generate session title from first message
            session = get_collection('chat_sessions').find_one({'_id': ObjectId(pk)})
            if session and session.get('title', '').startswith('Cuộc trò chuyện mới'):
                title = content[:50] + '...' if len(content) > 50 else content
                get_collection('chat_sessions').update_one(
                    {'_id': ObjectId(pk)},
                    {'$set': {'title': title, 'updated_at': datetime.utcnow()}}
                )

            get_collection('chat_sessions').update_one(
                {'_id': ObjectId(pk)},
                {'$set': {'updated_at': datetime.utcnow()}}
            )

            # Final events
            yield f"data: {json.dumps({'type': 'sources', 'sources': sources_for_frontend})}\n\n"
            yield f"data: {json.dumps({'type': 'done', 'assistant_message_id': assistant_message_id})}\n\n"

        response = StreamingHttpResponse(event_stream(), content_type='text/event-stream')
        response['X-Accel-Buffering'] = 'no'
        response['Cache-Control'] = 'no-cache'
        return response

    @action(detail=False, methods=['get'])
    def models(self, request):
        """Get available LLM models"""
        return Response(AVAILABLE_MODELS)
