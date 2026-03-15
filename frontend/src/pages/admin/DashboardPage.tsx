import React, { useEffect, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { authAPI } from '../../services/api';
import StatsCard from '../../components/admin/StatsCard';
import {
  HiOutlineUsers,
  HiOutlineAcademicCap,
  HiOutlineDocumentText,
  HiOutlineUserGroup,
} from 'react-icons/hi2';

interface AdminStats {
  total_students: number;
  total_teachers: number;
  total_courses: number;
  total_documents: number;
  recent_documents: any[];
  recent_courses: any[];
}

const AdminDashboardPage: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await authAPI.getAdminStats();
        setStats(res.data);
      } catch (err) {
        console.error('Failed to fetch admin stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className={`h-32 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
        Tổng quan hệ thống
      </h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Sinh viên"
          value={stats?.total_students || 0}
          icon={<HiOutlineUsers className="w-6 h-6" />}
          color="blue"
        />
        <StatsCard
          title="Giáo viên"
          value={stats?.total_teachers || 0}
          icon={<HiOutlineUserGroup className="w-6 h-6" />}
          color="green"
        />
        <StatsCard
          title="Môn học"
          value={stats?.total_courses || 0}
          icon={<HiOutlineAcademicCap className="w-6 h-6" />}
          color="orange"
        />
        <StatsCard
          title="Tài liệu"
          value={stats?.total_documents || 0}
          icon={<HiOutlineDocumentText className="w-6 h-6" />}
          color="purple"
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Courses */}
        <div className={`rounded-xl p-6 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Môn học gần đây
          </h3>
          {stats?.recent_courses && stats.recent_courses.length > 0 ? (
            <div className="space-y-3">
              {stats.recent_courses.map((course: any) => (
                <div key={course.id} className={`flex items-center justify-between p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div>
                    <p className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{course.name}</p>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{course.code} - {course.teacher || 'Chưa gán GV'}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                    {course.student_count} SV
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Chưa có môn học nào</p>
          )}
        </div>

        {/* Recent Documents */}
        <div className={`rounded-xl p-6 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Tài liệu gần đây
          </h3>
          {stats?.recent_documents && stats.recent_documents.length > 0 ? (
            <div className="space-y-3">
              {stats.recent_documents.map((doc: any) => (
                <div key={doc.id} className={`flex items-center justify-between p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div>
                    <p className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{doc.title}</p>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {doc.course} - {doc.uploaded_by}
                    </p>
                  </div>
                  <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {new Date(doc.created_at).toLocaleDateString('vi-VN')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Chưa có tài liệu nào</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
