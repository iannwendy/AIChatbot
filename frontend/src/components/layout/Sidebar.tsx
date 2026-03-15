import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  HiPlus,
  HiOutlineChatBubbleLeftRight,
  HiOutlineCog6Tooth,
  HiOutlineQuestionMarkCircle,
  HiOutlineArrowRightOnRectangle,
  HiEllipsisHorizontal,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineBars3,
  HiOutlineXMark,
  HiOutlineDocumentText,
  HiOutlineEnvelope,
  HiOutlineExclamationCircle,
} from 'react-icons/hi2';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

/* ── Types ── */
export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  course_id?: number;
}

interface SidebarProps {
  sessions: ChatSession[];
  activeChatId: string | null;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onRenameChat: (id: string, title: string) => void;
  onDeleteChat: (id: string) => void;
}

/* ── Helpers ── */
function groupByDate(sessions: ChatSession[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const week = new Date(today.getTime() - 7 * 86400000);

  const groups: { label: string; items: ChatSession[] }[] = [
    { label: 'Hôm nay', items: [] },
    { label: 'Hôm qua', items: [] },
    { label: '7 ngày trước', items: [] },
    { label: 'Cũ hơn', items: [] },
  ];

  sessions.forEach(s => {
    const d = new Date(s.created_at);
    if (d >= today) groups[0].items.push(s);
    else if (d >= yesterday) groups[1].items.push(s);
    else if (d >= week) groups[2].items.push(s);
    else groups[3].items.push(s);
  });

  return groups.filter(g => g.items.length > 0);
}

/* ── Context Menu ── */
const ContextMenu: React.FC<{
  x: number;
  y: number;
  onRename: () => void;
  onDelete: () => void;
  onClose: () => void;
}> = ({ x, y, onRename, onDelete, onClose }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-[#2a2b2d] rounded-lg shadow-xl py-1 min-w-[140px] border border-[#444]"
      style={{ top: y, left: x }}
    >
      <button
        onClick={onRename}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-sidebar-text hover:bg-sidebar-hover"
      >
        <HiOutlinePencil className="w-4 h-4" /> Đổi tên
      </button>
      <button
        onClick={onDelete}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-sidebar-hover"
      >
        <HiOutlineTrash className="w-4 h-4" /> Xóa
      </button>
    </div>
  );
};

/* ── Main Sidebar Component ── */
const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  activeChatId,
  onNewChat,
  onSelectChat,
  onRenameChat,
  onDeleteChat,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { theme } = useTheme();

  const isDark = theme === 'dark';

  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [avatarError, setAvatarError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset avatar error when user changes (e.g., after login)
  useEffect(() => {
    setAvatarError(false);
  }, [user?.id]);

  const grouped = groupByDate(sessions);

  // Focus input when editing
  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  // Close menu on navigation
  useEffect(() => {
    setMenu(null);
    setIsMobileOpen(false);
    setShowHelp(false);
  }, [location.pathname]);

  const handleContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setMenu({ id, x: e.clientX, y: e.clientY });
  };

  const startRename = () => {
    if (!menu) return;
    const session = sessions.find(s => s.id === menu.id);
    if (session) {
      setEditingId(menu.id);
      setEditTitle(session.title);
    }
    setMenu(null);
  };

  const confirmRename = () => {
    if (editingId && editTitle.trim()) {
      onRenameChat(editingId, editTitle.trim());
    }
    setEditingId(null);
    setEditTitle('');
  };

  const handleDelete = () => {
    if (menu) {
      onDeleteChat(menu.id);
      if (activeChatId === menu.id) onNewChat();
    }
    setMenu(null);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Hide sidebar on login page
  if (location.pathname === '/login') return null;

  const sidebarContent = (
    <div className={`flex flex-col h-full w-full overflow-hidden ${isDark ? 'bg-sidebar-bg text-sidebar-text' : 'bg-gray-100 text-gray-700'}`}>
      {/* Top: Logo & New Chat */}
      <div className={`p-3 border-b ${isDark ? 'border-[#3c4043]' : 'border-gray-200'}`}>
        <div
          onClick={() => navigate('/chat')}
          className="flex items-center gap-3 mb-3 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <img src="/logo_2.png" alt="TDTU" className="w-10 h-10 object-contain" />
          <span className="font-medium text-base">AI Assistant</span>
        </div>
        <button
          onClick={onNewChat}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-full transition-colors text-sm ${
            isDark ? 'bg-[#2a2b2d] hover:bg-sidebar-hover' : 'bg-gray-200 hover:bg-gray-300'
          }`}
        >
          <HiPlus className="w-5 h-5" />
          <span>New chat</span>
        </button>
      </div>

      {/* Recent Chats - scrollable area */}
      <div className={`flex-1 overflow-y-auto overflow-x-hidden sidebar-scrollbar p-2`}>
        <div className={`text-xs ${isDark ? 'text-sidebar-muted' : 'text-gray-500'} px-3 py-2 uppercase tracking-wide`}>Recent</div>
        {grouped.map(group => (
          <div key={group.label} className="mb-4">
            <div className={`text-xs ${isDark ? 'text-sidebar-muted' : 'text-gray-500'} px-3 py-1`}>{group.label}</div>
            {group.items.map(session => (
              <div
                key={session.id}
                onClick={() => onSelectChat(session.id)}
                onContextMenu={e => handleContextMenu(e, session.id)}
                className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors overflow-hidden min-w-0 ${
                  activeChatId === session.id
                    ? (isDark ? 'bg-sidebar-active' : 'bg-gray-300')
                    : (isDark ? 'hover:bg-sidebar-hover' : 'hover:bg-gray-200')
                }`}
              >
                <HiOutlineChatBubbleLeftRight className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-sidebar-muted' : 'text-gray-500'}`} />
                {editingId === session.id ? (
                  <input
                    ref={inputRef}
                    type="text"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    onBlur={confirmRename}
                    onKeyDown={e => {
                      if (e.key === 'Enter') confirmRename();
                      if (e.key === 'Escape') {
                        setEditingId(null);
                        setEditTitle('');
                      }
                    }}
                    className="flex-1 min-w-0 bg-transparent border-none outline-none text-sm"
                    onClick={e => e.stopPropagation()}
                  />
                ) : (
                  <span className="flex-1 min-w-0 truncate text-sm">{session.title}</span>
                )}
                <button
                  onClick={e => {
                    e.stopPropagation();
                    handleContextMenu(e, session.id);
                  }}
                  className={`flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded ${isDark ? 'hover:bg-sidebar-active' : 'hover:bg-gray-300'}`}
                >
                  <HiEllipsisHorizontal className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ))}
        {sessions.length === 0 && (
          <div className={`text-sm px-3 py-4 text-center ${isDark ? 'text-sidebar-muted' : 'text-gray-500'}`}>
            Chưa có cuộc trò chuyện nào
          </div>
        )}
      </div>

      {/* Bottom: Help, Settings, User — pinned to bottom */}
      <div className={`mt-auto p-2 border-t ${isDark ? 'border-[#3c4043]' : 'border-gray-200'}`}>
        <button
          onClick={() => navigate('/settings')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm ${
            isDark ? 'hover:bg-sidebar-hover' : 'hover:bg-gray-200'
          }`}
        >
          <HiOutlineCog6Tooth className="w-5 h-5" />
          <span>Cài đặt</span>
        </button>
        <div className="relative">
          <button
            onClick={() => setShowHelp(!showHelp)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm ${
              isDark ? 'hover:bg-sidebar-hover' : 'hover:bg-gray-200'
            }`}
          >
            <HiOutlineQuestionMarkCircle className="w-5 h-5" />
            <span>Hỗ trợ</span>
          </button>

          {/* Help Popup */}
          {showHelp && (
            <div className={`absolute bottom-full left-0 mb-1 w-56 rounded-lg shadow-lg border py-1 z-20 ${
              isDark ? 'bg-[#2a2b2d] border-[#444]' : 'bg-white border-gray-200'
            }`}>
              <button className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors ${
                isDark ? 'hover:bg-sidebar-hover text-gray-300' : 'hover:bg-gray-100 text-gray-700'
              }`}>
                <HiOutlineDocumentText className="w-4 h-4" />
                <span>Hướng dẫn sử dụng</span>
              </button>
              <button className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors ${
                isDark ? 'hover:bg-sidebar-hover text-gray-300' : 'hover:bg-gray-100 text-gray-700'
              }`}>
                <HiOutlineEnvelope className="w-4 h-4" />
                <span>Liên hệ hỗ trợ</span>
              </button>
              <button className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors ${
                isDark ? 'hover:bg-sidebar-hover text-gray-300' : 'hover:bg-gray-100 text-gray-700'
              }`}>
                <HiOutlineExclamationCircle className="w-4 h-4" />
                <span>Báo lỗi hệ thống</span>
              </button>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className={`mt-2 pt-2 border-t ${isDark ? 'border-[#3c4043]' : 'border-gray-200'}`}>
          <div
            onClick={() => navigate('/profile')}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
              isDark ? 'hover:bg-sidebar-hover' : 'hover:bg-gray-200'
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
              {user?.avatar_url && !avatarError ? (
                <img src={user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" onError={() => setAvatarError(true)} />
              ) : (
                user?.full_name?.[0] || user?.username?.[0] || 'U'
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{user?.full_name || user?.username}</div>
              <div className={`text-xs truncate ${isDark ? 'text-sidebar-muted' : 'text-gray-500'}`}>{user?.email}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm ${
              isDark ? 'hover:bg-sidebar-hover text-sidebar-muted' : 'hover:bg-gray-200 text-gray-500'
            }`}
          >
            <HiOutlineArrowRightOnRectangle className="w-5 h-5" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-sidebar-bg rounded-lg text-white shadow-lg"
      >
        {isMobileOpen ? <HiOutlineXMark className="w-6 h-6" /> : <HiOutlineBars3 className="w-6 h-6" />}
      </button>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 min-w-[256px] max-w-[256px] flex-shrink-0 h-screen sticky top-0 overflow-hidden">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setIsMobileOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 w-64 z-40 transform transition-transform ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Context Menu */}
      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          onRename={startRename}
          onDelete={handleDelete}
          onClose={() => setMenu(null)}
        />
      )}
    </>
  );
};

export default Sidebar;
