import React, { useState, useRef } from 'react';
import {
  HiOutlineCamera,
  HiOutlineEnvelope,
  HiOutlineAcademicCap,
  HiOutlineUserGroup,
  HiOutlineCalendarDays,
  HiOutlineLanguage,
  HiOutlineSun,
  HiOutlineMoon,
  HiOutlineCpuChip,
} from 'react-icons/hi2';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { authAPI } from '../services/api';

const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [selectedModel, setSelectedModel] = useState(() => localStorage.getItem('selected_model') || 'gemini-2.0-flash');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const isDark = theme === 'dark';

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const avatarData = reader.result as string;
      try {
        await authAPI.updateProfile({ avatar_url: avatarData });
        updateUser({ avatar_url: avatarData });
        setAvatarError(false);
      } catch (err) {
        console.error('Failed to update avatar:', err);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await authAPI.updateProfile({ full_name: fullName });
      updateUser({ full_name: fullName });
      localStorage.setItem('selected_model', selectedModel);
      setSaved(true);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setSaving(false);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <div className={`flex-1 overflow-y-auto custom-scrollbar ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className={`text-2xl font-medium mb-8 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{t('profile.title')}</h1>

        {/* Avatar & Basic Info Card */}
        <div className={`rounded-2xl p-6 mb-6 border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center gap-6">
            {/* Avatar */}
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-3xl font-medium overflow-hidden">
                {user?.avatar_url && !avatarError ? (
                  <img src={user.avatar_url} alt="" className="w-full h-full object-cover" onError={() => setAvatarError(true)} />
                ) : (
                  user?.full_name?.[0] || user?.username?.[0] || 'U'
                )}
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
              <button
                onClick={() => avatarInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-8 h-8 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors"
              >
                <HiOutlineCamera className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* Name & Student ID */}
            <div>
              <h2 className="text-xl font-medium text-gray-900">
                {user?.full_name || user?.username || 'Student'}
              </h2>
              <p className="text-sm text-gray-500">
                {user?.student_id || `MSSV: ${user?.id || '---'}`}
              </p>
              <span className="inline-block mt-2 px-3 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-full">
                {user?.role === 'admin' ? 'Quản trị viên' : 'Sinh viên'}
              </span>
            </div>
          </div>
        </div>

        {/* Detail Info Card */}
        <div className={`rounded-2xl p-6 mb-6 border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
            Thông tin chi tiết
          </h3>

          <div className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">Họ và tên</label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
              />
            </div>

            {/* Email */}
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl">
              <HiOutlineEnvelope className="w-5 h-5 text-gray-400" />
              <div>
                <div className="text-xs text-gray-400">Email</div>
                <div className="text-sm text-gray-700">{user?.email || 'Chưa cập nhật'}</div>
              </div>
            </div>

            {/* Department */}
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl">
              <HiOutlineAcademicCap className="w-5 h-5 text-gray-400" />
              <div>
                <div className="text-xs text-gray-400">Khoa</div>
                <div className="text-sm text-gray-700">{user?.department || 'Chưa cập nhật'}</div>
              </div>
            </div>

            {/* Class */}
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl">
              <HiOutlineUserGroup className="w-5 h-5 text-gray-400" />
              <div>
                <div className="text-xs text-gray-400">Lớp</div>
                <div className="text-sm text-gray-700">{user?.class_name || 'Chưa cập nhật'}</div>
              </div>
            </div>

            {/* Academic Year */}
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl">
              <HiOutlineCalendarDays className="w-5 h-5 text-gray-400" />
              <div>
                <div className="text-xs text-gray-400">Niên khóa</div>
                <div className="text-sm text-gray-700">{user?.academic_year || 'Chưa cập nhật'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Preferences Card */}
        <div className={`rounded-2xl p-6 mb-6 border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
            Cài đặt ưu tiên
          </h3>

          <div className="space-y-4">
            {/* Language */}


            {/* Theme Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {theme === 'light' ? (
                  <HiOutlineSun className="w-5 h-5 text-gray-400" />
                ) : (
                  <HiOutlineMoon className="w-5 h-5 text-gray-400" />
                )}
                <span className="text-sm text-gray-700">Giao diện</span>
              </div>
              <button
                onClick={toggleTheme}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  theme === 'dark' ? 'bg-blue-500' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    theme === 'dark' ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Model Selection */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <HiOutlineCpuChip className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-700">AI Model</span>
              </div>
              <select
                value={selectedModel}
                onChange={e => setSelectedModel(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="gemini-2.0-flash">Gemini Flash</option>
                <option value="gemini-2.0-pro">Gemini Pro</option>
                <option value="local-llm">Local LLM</option>
              </select>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className={`w-full py-3 rounded-xl text-sm font-medium transition-all ${
            saved
              ? 'bg-green-500 text-white'
              : 'bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50'
          }`}
        >
          {saving ? 'Đang lưu...' : saved ? 'Đã lưu thành công' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

export default ProfilePage;
