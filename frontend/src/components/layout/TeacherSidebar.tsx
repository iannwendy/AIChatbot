import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  HiOutlineChartBar,
  HiOutlineDocumentText,
  HiOutlineAcademicCap,
  HiOutlineQuestionMarkCircle,
  HiOutlineArrowRightOnRectangle,
  HiOutlineBars3,
  HiOutlineXMark,
} from 'react-icons/hi2';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

interface MenuItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

const menuItems: MenuItem[] = [
  { icon: HiOutlineChartBar, label: 'Tổng quan', path: '/teacher/dashboard' },
  { icon: HiOutlineDocumentText, label: 'Tài liệu của tôi', path: '/teacher/documents' },
  { icon: HiOutlineAcademicCap, label: 'Môn học của tôi', path: '/teacher/courses' },
  { icon: HiOutlineQuestionMarkCircle, label: 'Quiz', path: '/teacher/quizzes' },
];

const TeacherSidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const isDark = theme === 'dark';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const sidebarContent = (
    <div className={`flex flex-col h-full w-full overflow-hidden ${
      isDark ? 'bg-gray-800 text-white' : 'bg-white text-gray-700'
    }`}>
      {/* Logo */}
      <div className={`p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center gap-3">
          <img src="/logo_2.png" alt="TDTU" className="w-10 h-10 object-contain" />
          <div>
            <div className="font-semibold text-lg">Giáo viên</div>
            <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>AI Chatbot</div>
          </div>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto py-4">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                isActive
                  ? (isDark ? 'bg-green-600 text-white' : 'bg-green-50 text-green-600')
                  : (isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100')
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User & Logout */}
      <div className={`p-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className={`flex items-center gap-3 mb-3 p-2 rounded-lg ${
          isDark ? 'bg-gray-700' : 'bg-gray-100'
        }`}>
          <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-sm font-medium">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              user?.full_name?.[0] || user?.username?.[0] || 'T'
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{user?.full_name || user?.username}</div>
            <div className={`text-xs truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Giáo viên
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
            isDark ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
          }`}
        >
          <HiOutlineArrowRightOnRectangle className="w-5 h-5" />
          <span>Đăng xuất</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg shadow-lg bg-gray-800 text-white"
      >
        {isMobileOpen ? <HiOutlineXMark className="w-6 h-6" /> : <HiOutlineBars3 className="w-6 h-6" />}
      </button>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 min-w-[256px] max-w-[256px] flex-shrink-0 h-screen sticky top-0 overflow-hidden">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
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
    </>
  );
};

export default TeacherSidebar;
