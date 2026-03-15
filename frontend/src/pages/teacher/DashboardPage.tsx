import React, { useEffect, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { authAPI } from '../../services/api';
import StatsCard from '../../components/admin/StatsCard';
import {
  HiOutlineAcademicCap,
  HiOutlineDocumentText,
  HiOutlineUserGroup,
} from 'react-icons/hi2';

interface TeacherStats {
  total_courses: number;
  total_students: number;
  total_documents: number;
  recent_documents: any[];
  courses: any[];
}

const TeacherDashboardPage: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [stats, setStats] = useState<TeacherStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await authAPI.getTeacherStats();
        setStats(res.data);
      } catch (err) {
        console.error('Failed to fetch teacher stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className={`h-32 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
        Tổng quan
      </h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard
          title="Môn học"
          value={stats?.total_courses || 0}
          icon={<HiOutlineAcademicCap className="w-6 h-6" />}
          color="blue"
        />
        <StatsCard
          title="Sinh viên"
          value={stats?.total_students || 0}
          icon={<HiOutlineUserGroup className="w-6 h-6" />}
          color="green"
        />
        <StatsCard
          title="Tài liệu"
          value={stats?.total_documents || 0}
          icon={<HiOutlineDocumentText className="w-6 h-6" />}
          color="orange"
        />
      </div>

      {/* Courses */}
      <div className={`rounded-xl p-6 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
        <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Môn học của tôi
        </h3>
        {stats?.courses && stats.courses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.courses.map((course: any) => (
              <div
                key={course.id}
                className={`p-4 rounded-lg border ${
                  isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{course.name}</p>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{course.code}</p>
                <div className="flex items-center gap-4 mt-2">
                  <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {course.student_count} sinh viên
                  </span>
                  <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {course.document_count} tài liệu
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Bạn chưa được phân công môn học nào
          </p>
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
              <div
                key={doc.id}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  isDark ? 'bg-gray-700' : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                    doc.file_type === 'pdf'
                      ? isDark ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-600'
                      : doc.file_type === 'docx'
                        ? isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'
                        : isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {doc.file_type.toUpperCase()}
                  </span>
                  <span className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {doc.title}
                  </span>
                </div>
                <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {new Date(doc.created_at).toLocaleDateString('vi-VN')}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Bạn chưa upload tài liệu nào
          </p>
        )}
      </div>
    </div>
  );
};

export default TeacherDashboardPage;
