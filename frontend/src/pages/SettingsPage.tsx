import React, { useState, useEffect } from 'react';
import {
  HiOutlineKey,
  HiOutlineServerStack,
  HiOutlineBookOpen,
  HiOutlineTrash,
  HiOutlinePlus,
  HiOutlineEye,
  HiOutlineEyeSlash,
} from 'react-icons/hi2';
import { coursesAPI } from '../services/api';

interface Course {
  id: number;
  name: string;
  code: string;
}

const SettingsPage: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [llmServer, setLlmServer] = useState('http://localhost:11434');
  const [courses, setCourses] = useState<Course[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchCourses();
    // Load saved settings
    const savedKey = localStorage.getItem('api_key') || '';
    const savedServer = localStorage.getItem('llm_server') || 'http://localhost:11434';
    setApiKey(savedKey);
    setLlmServer(savedServer);
  }, []);

  const fetchCourses = async () => {
    try {
      const res = await coursesAPI.getAll();
      setCourses(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch courses:', err);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    localStorage.setItem('api_key', apiKey);
    localStorage.setItem('llm_server', llmServer);
    await new Promise(r => setTimeout(r, 500));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-medium text-gray-900 mb-8">Cài đặt</h1>

        {/* API Key Section */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <HiOutlineKey className="w-5 h-5 text-gray-500" />
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
              API Key
            </h3>
          </div>
          <p className="text-xs text-gray-400 mb-3">
            Nhập API key nếu bạn sử dụng dịch vụ AI bên ngoài (Google AI, OpenAI, ...)
          </p>
          <div className="relative">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="sk-... hoặc AIza..."
              className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all font-mono"
            />
            <button
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showApiKey ? <HiOutlineEyeSlash className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Local LLM Server */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <HiOutlineServerStack className="w-5 h-5 text-gray-500" />
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
              Local LLM Server
            </h3>
          </div>
          <p className="text-xs text-gray-400 mb-3">
            Địa chỉ server LLM cục bộ (Ollama, LM Studio, ...)
          </p>
          <input
            type="text"
            value={llmServer}
            onChange={e => setLlmServer(e.target.value)}
            placeholder="http://localhost:11434"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all font-mono"
          />
        </div>

        {/* Enrolled Courses */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <HiOutlineBookOpen className="w-5 h-5 text-gray-500" />
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                Môn học đang tham gia
              </h3>
            </div>
            <button className="flex items-center gap-1 px-3 py-1.5 text-xs text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
              <HiOutlinePlus className="w-3.5 h-3.5" />
              Thêm môn
            </button>
          </div>

          {courses.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              Chưa tham gia môn học nào
            </p>
          ) : (
            <div className="space-y-2">
              {courses.map(course => (
                <div
                  key={course.id}
                  className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl"
                >
                  <div>
                    <div className="text-sm font-medium text-gray-700">{course.name}</div>
                    <div className="text-xs text-gray-400">{course.code}</div>
                  </div>
                  <button className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                    <HiOutlineTrash className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
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

export default SettingsPage;
