import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { HiChevronLeft, HiBookOpen, HiPlay, HiClock, HiQuestionMarkCircle } from 'react-icons/hi2';
import { quizAPI, coursesAPI } from '../services/api';
import { useTheme } from '../context/ThemeContext';

interface Quiz {
  id: number;
  title: string;
  description: string;
  topic: string;
  question_count: number;
  created_at: string;
}

interface CourseInfo {
  id: number;
  name: string;
  code: string;
  teacher_name?: string;
}

const StudentCourseQuizPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [course, setCourse] = useState<CourseInfo | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const id = parseInt(courseId || '');
    if (!id) return;
    fetchData(id);
  }, [courseId]);

  const fetchData = async (id: number) => {
    setLoading(true);
    try {
      const [courseRes, quizzesRes] = await Promise.all([
        coursesAPI.getById(id),
        quizAPI.getAll(id),
      ]);
      setCourse(courseRes.data);
      const data = quizzesRes.data;
      setQuizzes(Array.isArray(data) ? data : (data.results ?? []));
    } catch (err) {
      console.error('Failed to load quizzes:', err);
      setError('Không thể tải danh sách quiz');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <div className={`sticky top-0 z-10 border-b px-6 py-3 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
          >
            <HiChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-sm font-semibold">
              Quiz — {course?.name || 'Môn học'}
            </h1>
            {course && (
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {course.code}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-6">
        {error && (
          <div className={`rounded-lg p-4 mb-4 text-sm ${isDark ? 'bg-red-900/30 text-red-400 border border-red-800' : 'bg-red-50 text-red-600 border border-red-200'}`}>
            {error}
          </div>
        )}

        {quizzes.length === 0 ? (
          <div className={`text-center py-16 rounded-xl border ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
            <HiQuestionMarkCircle className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
            <h2 className="text-lg font-semibold mb-2">Chưa có quiz nào</h2>
            <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Giáo viên chưa tạo quiz nào cho môn học này.
            </p>
            <button
              onClick={() => navigate(-1)}
              className={`px-4 py-2 rounded-lg text-sm ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
              Quay lại
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <HiBookOpen className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
              <span className={`text-sm font-medium ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                {quizzes.length} quiz có sẵn
              </span>
            </div>

            {quizzes.map((quiz) => (
              <div
                key={quiz.id}
                className={`rounded-xl border p-5 ${isDark ? 'bg-gray-800 border-gray-700 hover:border-blue-600' : 'bg-white border-gray-200 hover:border-blue-400'} transition-colors cursor-pointer`}
                onClick={() => navigate(`/student/quiz/${quiz.id}`)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {quiz.topic && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
                          {quiz.topic}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-semibold mb-1">{quiz.title}</h3>
                    {quiz.description && (
                      <p className={`text-sm mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {quiz.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs">
                      <span className={`flex items-center gap-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        <HiQuestionMarkCircle className="w-3.5 h-3.5" />
                        {quiz.question_count} câu
                      </span>
                    </div>
                  </div>
                  <button
                    className="shrink-0 flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/student/quiz/${quiz.id}`);
                    }}
                  >
                    <HiPlay className="w-4 h-4" />
                    Làm quiz
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentCourseQuizPage;
