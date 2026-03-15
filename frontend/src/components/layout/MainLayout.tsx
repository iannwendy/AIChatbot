import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar, { ChatSession } from './Sidebar';
import { chatAPI } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

/* ── Main Layout Component ── */
const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  // Fetch sessions from API
  const fetchSessions = useCallback(async () => {
    try {
      const res = await chatAPI.getSessions();
      // Handle both paginated ({ results: [...] }) and plain array responses
      const data = Array.isArray(res.data) ? res.data : res.data?.results || [];
      setSessions(data.map((s: any) => ({
        id: s.id?.toString() || s.session_id?.toString(),
        title: s.title,
        created_at: s.created_at,
        course_id: s.course_id,
      })));
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Create new chat
  const handleNewChat = async () => {
    try {
      const res = await chatAPI.createSession(0, 'Cuộc trò chuyện mới');
      const newSession: ChatSession = {
        id: res.data.id.toString(),
        title: res.data.title || 'Cuộc trò chuyện mới',
        created_at: res.data.created_at || new Date().toISOString(),
        course_id: res.data.course_id,
      };
      setSessions(prev => [newSession, ...prev]);
      setActiveChatId(newSession.id);
      // Navigate to chat page with this session
      navigate(`/chat?chat=${newSession.id}`);
    } catch (err) {
      console.error('Failed to create session:', err);
    }
  };

  // Select existing chat - preserve course_id from session
  const handleSelectChat = (id: string) => {
    setActiveChatId(id);
    // Find the session to get course_id
    const session = sessions.find(s => s.id === id);
    if (session?.course_id) {
      navigate(`/chat?chat=${id}&course=${session.course_id}`);
    } else {
      navigate(`/chat?chat=${id}`);
    }
  };

  // Rename chat
  const handleRenameChat = async (id: string, title: string) => {
    try {
      await chatAPI.renameSession(id, title);
      setSessions(prev =>
        prev.map(s => (s.id === id ? { ...s, title } : s))
      );
    } catch (err) {
      console.error('Failed to rename session:', err);
    }
  };

  // Delete chat
  const handleDeleteChat = async (id: string) => {
    try {
      await chatAPI.deleteSession(id);
      setSessions(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  // If on login page, don't show layout
  if (location.pathname === '/login' || location.pathname === '/admin-login') {
    return <Outlet />;
  }

  return (
    <div className={`flex h-screen overflow-hidden ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
      {/* Sidebar */}
      <Sidebar
        sessions={sessions}
        activeChatId={activeChatId}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        onRenameChat={handleRenameChat}
        onDeleteChat={handleDeleteChat}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <Outlet context={{ activeChatId, sessions, onNewChat: handleNewChat, refreshSessions: fetchSessions }} />
      </main>
    </div>
  );
};

export default MainLayout;