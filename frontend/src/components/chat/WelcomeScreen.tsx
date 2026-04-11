import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiOutlineBookOpen, HiOutlineDocumentText, HiOutlineChatBubbleLeftRight } from 'react-icons/hi2';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { coursesAPI, documentsAPI } from '../../services/api';

interface WelcomeScreenProps {
  onSuggestionClick: (text: string) => void;
}

interface Course {
  id: number;
  name: string;
  code: string;
  teacher_name?: string;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSuggestionClick }) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const isDark = theme === 'dark';
  const displayName = user?.full_name || user?.username || 'bạn';

  const [courses, setCourses] = useState<Course[]>([]);
  const [docCounts, setDocCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await coursesAPI.myCourses();
        const courseList = Array.isArray(res.data) ? res.data : [];
        setCourses(courseList);

        // Fetch document counts per course
        const counts: Record<number, number> = {};
        await Promise.all(
          courseList.map(async (c: Course) => {
            try {
              const docRes = await documentsAPI.byCourse(c.id);
              counts[c.id] = Array.isArray(docRes.data) ? docRes.data.length : 0;
            } catch {
              counts[c.id] = 0;
            }
          })
        );
        setDocCounts(counts);
      } catch (err) {
        console.error('Failed to load courses:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 animate-fade-in">
      {/* Greeting */}
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-medium mb-3">
          <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            Xin chào, {displayName}
          </span>
        </h1>
        <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
          Chọn môn học để bắt đầu hỏi đáp với AI
        </p>
        <p className={`text-sm mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          Bạn được tự động thêm vào lớp. Nếu không thấy lớp của mình, vui lòng liên hệ giảng viên phụ trách.
        </p>
      </div>

      {/* Enrolled Courses */}
      {loading ? (
        <div className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Đang tải môn học...</div>
      ) : courses.length === 0 ? (
        <div className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          Bạn chưa được đăng ký vào môn học nào.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl w-full">
          {courses.map((course) => (
            <button
              key={course.id}
              onClick={() => navigate(`/chat?course=${course.id}`)}
              className={`flex items-start gap-3 p-4 rounded-xl border transition-all text-left group ${
                isDark
                  ? 'border-gray-600 hover:bg-gray-800 hover:border-blue-500/50'
                  : 'border-gray-200 hover:bg-blue-50/50 hover:border-blue-300'
              }`}
            >
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-500">
                <HiOutlineBookOpen className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium truncate ${isDark ? 'text-gray-200 group-hover:text-white' : 'text-gray-800 group-hover:text-blue-700'}`}>
                  {course.name}
                </div>
                <div className={`text-xs mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  {course.code}
                  {course.teacher_name && ` · GV: ${course.teacher_name}`}
                </div>
                <div className={`flex items-center gap-1 text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  <HiOutlineDocumentText className="w-3.5 h-3.5" />
                  <span>{docCounts[course.id] ?? 0} tài liệu</span>
                </div>
              </div>
              <HiOutlineChatBubbleLeftRight className={`w-4 h-4 mt-1 shrink-0 ${isDark ? 'text-gray-600 group-hover:text-blue-400' : 'text-gray-300 group-hover:text-blue-500'}`} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default WelcomeScreen;
