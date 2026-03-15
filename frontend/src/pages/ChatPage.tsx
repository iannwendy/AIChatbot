import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate, useOutletContext } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { HiOutlineCpuChip, HiChevronDown, HiChevronUp, HiOutlineBookOpen } from 'react-icons/hi2';
import WelcomeScreen from '../components/chat/WelcomeScreen';
import ShimmerLoader from '../components/chat/ShimmerLoader';
import SourceCitation from '../components/chat/SourceCitation';
import ChatInput from '../components/chat/ChatInput';
import { chatAPI, coursesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

/* ── Types ── */
interface Message {
  id: number;
  type: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: string[];
}

interface ModelOption {
  id: string;
  name: string;
}

interface CourseInfo {
  id: number;
  name: string;
  code: string;
  teacher_name?: string;
}

/* ── ChatPage Component ── */
const ChatPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme } = useTheme();
  const { refreshSessions } = useOutletContext<{ refreshSessions?: () => void }>();
  const chatId = searchParams.get('chat');
  const courseIdParam = searchParams.get('course');
  const courseId = courseIdParam ? parseInt(courseIdParam) : null;
  const isDark = theme === 'dark';

  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(chatId);
  const [selectedModel, setSelectedModel] = useState(() => localStorage.getItem('selected_model') || 'gemini-2.5-flash');
  const [showModelSelect, setShowModelSelect] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [availableModels] = useState<ModelOption[]>([
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Nhanh)' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (Thông minh)' },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
  ]);
  const [courseInfo, setCourseInfo] = useState<CourseInfo | null>(null);

  // Load course info from session data or URL params
  useEffect(() => {
    const loadCourseInfo = async () => {
      // First check if we have course_id in URL params
      if (courseId) {
        try {
          const res = await coursesAPI.getById(courseId);
          setCourseInfo(res.data);
          return;
        } catch (err) {
          console.error('Failed to load course from URL:', err);
        }
      }

      // If no course in URL but we have a session, load course from session
      if (sessionId || chatId) {
        const currentSessionId = sessionId || chatId;
        try {
          const res = await chatAPI.getMessages(currentSessionId!);
          const sessionData = res.data;
          if (sessionData.course_id) {
            const courseRes = await coursesAPI.getById(sessionData.course_id);
            setCourseInfo(courseRes.data);
          } else {
            setCourseInfo(null);
          }
        } catch (err) {
          console.error('Failed to load course from session:', err);
          setCourseInfo(null);
        }
      } else {
        setCourseInfo(null);
      }
    };

    loadCourseInfo();
  }, [courseId, sessionId, chatId]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const userScrolledUpRef = useRef(false);
  const isSendingRef = useRef(false);

  // Detect if user scrolled up
  const handleScroll = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    userScrolledUpRef.current = !atBottom;
  }, []);

  // Scroll to bottom helper - only when user is near bottom or during initial streaming
  const scrollToBottom = useCallback(() => {
    if (!userScrolledUpRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  // Load messages when chatId changes (skip if currently sending)
  useEffect(() => {
    if (chatId && !isSendingRef.current) {
      setSessionId(chatId);
      loadMessages(chatId);
    } else if (!chatId) {
      setMessages([]);
      setSessionId(null);
    }
  }, [chatId]);

  const loadMessages = async (id: string) => {
    try {
      const res = await chatAPI.getMessages(id);
      if (res.data.messages) {
        setMessages(
          res.data.messages.map((m: any) => ({
            id: m.id || Date.now(),
            type: m.message_type,
            content: m.content,
            timestamp: m.created_at || new Date().toISOString(),
            sources: m.sources || [],
          }))
        );
        // Scroll to bottom after loading history
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
        }, 100);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  const handleSend = useCallback(async (input: string) => {
    // Auto-create session if none exists - use chatId from URL if available
    let currentSessionId = sessionId || chatId;
    isSendingRef.current = true;

    if (!currentSessionId) {
      try {
        // Get course_id from URL params if available
        const courseIdFromUrl = searchParams.get('course');
        const courseId = courseIdFromUrl ? parseInt(courseIdFromUrl) : 0;

        const res = await chatAPI.createSession(courseId, 'Cuộc trò chuyện mới');
        currentSessionId = res.data.id.toString();
        setSessionId(currentSessionId);
        navigate(`/chat?chat=${currentSessionId}${courseIdFromUrl ? `&course=${courseIdFromUrl}` : ''}`, { replace: true });
      } catch (err) {
        console.error('Failed to create session:', err);
        isSendingRef.current = false;
        return;
      }
    }

    const userMessage: Message = {
      id: Date.now(),
      type: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };

    const assistantMessageId = Date.now() + 1;
    const assistantMessage: Message = {
      id: assistantMessageId,
      type: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      sources: [],
    };

    setMessages(prev => [...prev, userMessage, assistantMessage]);
    setIsStreaming(true);
    userScrolledUpRef.current = false;

    let fullResponse = '';

    try {
      console.log('[Chat] Sending stream request to session:', currentSessionId);
      const response = await chatAPI.sendMessageStream(currentSessionId!, input, selectedModel);
      console.log('[Chat] Stream response status:', response.status, response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Chat] Stream error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log('[Chat] Stream done. Full response length:', fullResponse.length);
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;

          try {
            const data = JSON.parse(line.slice(6));
            console.log('[Chat] SSE event:', data.type, data.type === 'chunk' ? `(${data.content?.length} chars)` : '');

            if (data.type === 'chunk') {
              fullResponse += data.content;
              // Update message - use functional update to get latest state
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantMessageId
                    ? { ...m, content: fullResponse }
                    : m
                )
              );
              // Scroll only if user hasn't scrolled up
              scrollToBottom();
            } else if (data.type === 'sources') {
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantMessageId
                    ? { ...m, sources: data.sources }
                    : m
                )
              );
            }
          } catch {
            // Skip malformed JSON lines
          }
        }
      }
    } catch (error) {
      console.error('Error streaming message:', error);
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantMessageId
            ? { ...m, content: 'Có lỗi xảy ra. Vui lòng thử lại.' }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
      isSendingRef.current = false;
      // Refresh sessions to update auto-generated title
      if (refreshSessions) {
        refreshSessions();
      }
    }
  }, [sessionId, chatId, searchParams, selectedModel, navigate, refreshSessions, scrollToBottom]);

  const handleSuggestionClick = (text: string) => {
    handleSend(text);
  };

  const handleNewChat = () => {
    setMessages([]);
    setSessionId(null);
    navigate('/chat');
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const selectedModelName = availableModels.find(m => m.id === selectedModel)?.name || selectedModel;

  return (
    <div className={`flex flex-col h-screen overflow-hidden ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
      {/* Model Selector Header */}
      <div className={`flex items-center justify-between px-4 py-2 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
        <div className="relative">
          <button
            onClick={() => setShowModelSelect(!showModelSelect)}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
              isDark ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <HiOutlineCpuChip className="w-4 h-4" />
            <span>{selectedModelName}</span>
            {showModelSelect ? <HiChevronUp className="w-4 h-4" /> : <HiChevronDown className="w-4 h-4" />}
          </button>

          {showModelSelect && (
            <div className={`absolute top-full left-0 mt-1 rounded-lg shadow-lg border py-1 min-w-[200px] z-10 ${
              isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              {availableModels.map(m => (
                <button
                  key={m.id}
                  onClick={() => {
                    setSelectedModel(m.id);
                    localStorage.setItem('selected_model', m.id);
                    setShowModelSelect(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm ${
                    selectedModel === m.id
                      ? 'bg-blue-50 text-blue-600'
                      : (isDark ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-50')
                  }`}
                >
                  {m.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Course Context Banner */}
      {courseInfo && (
        <div className={`flex items-center gap-3 px-4 py-2 border-b text-sm ${
          isDark ? 'bg-blue-900/20 border-gray-700 text-blue-300' : 'bg-blue-50 border-blue-100 text-blue-700'
        }`}>
          <HiOutlineBookOpen className="w-4 h-4 shrink-0" />
          <span className="font-medium">{courseInfo.name}</span>
          {courseInfo.teacher_name && (
            <span className={isDark ? 'text-blue-400/70' : 'text-blue-500'}>
              &middot; GV: {courseInfo.teacher_name}
            </span>
          )}
        </div>
      )}

      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className={`flex-1 overflow-y-auto custom-scrollbar ${messages.length === 0 ? 'flex flex-col' : ''}`}
      >
        {messages.length === 0 ? (
          <WelcomeScreen onSuggestionClick={handleSuggestionClick} />
        ) : (
          <div className="max-w-3xl w-full mx-auto space-y-6 px-4 py-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 animate-fade-in ${
                  message.type === 'user' ? 'flex-row-reverse' : ''
                }`}
              >
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 overflow-hidden ${
                  message.type === 'user'
                    ? 'bg-blue-500'
                    : (isDark ? 'bg-gray-700' : 'bg-gray-100')
                }`}>
                  {message.type === 'user' ? (
                    user?.avatar_url && !avatarError ? (
                      <img
                        src={user.avatar_url}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={() => setAvatarError(true)}
                      />
                    ) : (
                      <span className="text-sm font-medium text-white">
                        {user?.full_name?.[0] || user?.username?.[0] || 'U'}
                      </span>
                    )
                  ) : (
                    <img src="/tdtu-logo.png" alt="AI" className="w-5 h-5 object-contain" />
                  )}
                </div>

                {/* Message Bubble */}
                <div className={`flex-1 max-w-[75%] ${message.type === 'user' ? 'text-right' : ''}`}>
                  <div className={`inline-block p-3 rounded-2xl ${
                    message.type === 'user'
                      ? 'bg-blue-500 text-white rounded-tr-sm'
                      : (isDark ? 'bg-gray-800 text-gray-200 rounded-tl-sm' : 'bg-gray-50 text-gray-800 rounded-tl-sm')
                  }`}>
                    {message.type === 'assistant' ? (
                      <div className="markdown-content text-sm">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {message.content || (isStreaming && message.id === messages[messages.length - 1]?.id ? 'Đang trả lời...' : '')}
                        </ReactMarkdown>
                        {isStreaming && message.id === messages[messages.length - 1]?.id && (
                          <span className="inline-block w-2 h-4 bg-gray-400 ml-0.5 animate-pulse" />
                        )}
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>

                  {/* Source Citations */}
                  {message.type === 'assistant' && <SourceCitation sources={message.sources || []} />}

                  {/* Timestamp */}
                  <div className={`text-xs text-gray-400 mt-1 ${
                    message.type === 'user' ? 'text-right' : 'text-left'
                  }`}>
                    {formatTime(message.timestamp)}
                  </div>
                </div>
              </div>
            ))}

            {/* Show shimmer when streaming and waiting */}
            {isStreaming && messages[messages.length - 1]?.type === 'user' && (
              <div className="flex gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <img src="/tdtu-logo.png" alt="AI" className="w-5 h-5 object-contain" />
                </div>
                <div className="flex-1">
                  <ShimmerLoader />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <ChatInput onSend={handleSend} disabled={isStreaming} onNewChat={handleNewChat} />
    </div>
  );
};

export default ChatPage;
