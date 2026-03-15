import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FcGoogle } from 'react-icons/fc';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { authAPI } from '../services/api';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, login } = useAuth();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
      return;
    }

    // Handle OAuth callback
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');
    const error = params.get('error');
    const userId = params.get('user_id');

    if (success === 'true' && userId) {
      // Store temp token, then fetch real user info from backend
      const token = `google_${userId}_${Date.now()}`;
      localStorage.setItem('token', token);
      authAPI.getCurrentUser()
        .then(res => {
          const u = res.data;
          login({
            id: u.id,
            username: u.username,
            email: u.email || '',
            full_name: u.full_name || u.name || u.username,
            avatar_url: u.avatar_url || '',
            role: u.role || 'student',
            student_id: u.student_id,
            department: u.department,
            class_name: u.class_name,
            academic_year: u.academic_year,
          }, token);
          navigate('/');
        })
        .catch(() => {
          // Fallback: use userId only
          login({ id: parseInt(userId), username: `User ${userId}`, email: '', role: 'student' }, token);
          navigate('/');
        });
    } else if (error) {
      alert('Đăng nhập thất bại. Vui lòng thử lại.');
    }
  }, [isAuthenticated, navigate, login]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/auth/google/`);
      if (response.data.auth_url) {
        window.location.href = response.data.auth_url;
      }
    } catch {
      alert('Không thể kết nối máy chủ. Vui lòng thử lại.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm text-center">
        {/* Logo */}
        <div className="mb-8">
          <img src="/tdtu-logo.png" alt="TDTU" className="w-24 h-24 mx-auto mb-6 object-contain" />
          <h1 className="text-2xl font-medium text-gray-900 mb-2">
            AI Assistant
          </h1>
          <p className="text-gray-500 text-sm">
            Sign in with your student account to continue
          </p>
        </div>

        {/* Google Sign In Button */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 px-6 py-3 border border-gray-300 rounded-full hover:bg-gray-50 hover:shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          ) : (
            <FcGoogle className="w-5 h-5" />
          )}
          <span className="text-sm font-medium text-gray-700">
            {loading ? 'Đang chuyển hướng...' : 'Sign in with Google'}
          </span>
        </button>

        {/* Footer */}
        <p className="mt-8 text-xs text-gray-400">
          Sử dụng tài khoản Google của trường để đăng nhập
        </p>

        <button
          onClick={() => navigate('/admin-login')}
          className="mt-4 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          Quản trị hệ thống
        </button>
      </div>
    </div>
  );
};

export default LoginPage;
