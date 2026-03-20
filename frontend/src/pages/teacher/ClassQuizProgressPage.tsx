import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { HiChevronLeft, HiCheckCircle, HiXCircle, HiClock, HiArrowPath } from 'react-icons/hi2';
import { useTheme } from '../../context/ThemeContext';
import { quizAPI, coursesAPI } from '../../services/api';

interface StudentProgress {
  student_id: number;
  student_name: string;
  student_email: string;
  completed: boolean;
  score: number | null;
  total_questions: number;
  percentage: number | null;
  time_spent_seconds: number | null;
  completed_at: string | null;
  attempt_count: number;
}

interface ClassProgress {
  quiz_id: number;
  quiz_title: string;
  course_name: string;
  total_students: number;
  completed_count: number;
  not_completed_count: number;
  average_score: number | null;
  students: StudentProgress[];
}

interface Quiz {
  id: number;
  title: string;
  question_count: number;
}

interface Course {
  id: number;
  name: string;
  code: string;
}

const ClassQuizProgressPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const quizIdParam = searchParams.get('quizId');
  const courseIdParam = searchParams.get('courseId');

  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(courseIdParam ? parseInt(courseIdParam) : null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<number | null>(quizIdParam ? parseInt(quizIdParam) : null);
  const [progress, setProgress] = useState<ClassProgress | null>(null);
  const [loading, setLoading] = useState(false);
  const [classGroup, setClassGroup] = useState('');

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await coursesAPI.myCourses();
        setCourses(res.data);
      } catch (err) { console.error(err); }
    };
    fetchCourses();
  }, []);

  useEffect(() => {
    if (selectedCourseId) {
      const fetchQuizzes = async () => {
        try {
          const res = await quizAPI.getAll(selectedCourseId);
          setQuizzes(Array.isArray(res.data) ? res.data : (res.data.results ?? []));
        } catch (err) { console.error(err); }
      };
      fetchQuizzes();
    }
  }, [selectedCourseId]);

  useEffect(() => {
    if (selectedQuizId) {
      fetchProgress();
    }
  }, [selectedQuizId, classGroup]);

  const fetchProgress = async () => {
    if (!selectedQuizId) return;
    setLoading(true);
    try {
      const res = await quizAPI.getClassProgress(selectedQuizId, classGroup || undefined);
      setProgress(res.data);
    } catch (err) {
      console.error('Failed to load progress:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number | null) => {
    if (seconds === null || seconds === undefined) return '-';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <div className={`border-b px-6 py-4 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/teacher/quizzes')}
            className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
            <HiChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-semibold">Tiến độ làm Quiz</h1>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Xem tình hình làm bài của sinh viên</p>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Môn học</label>
            <select value={selectedCourseId || ''} onChange={e => {
              const id = parseInt(e.target.value);
              setSelectedCourseId(id);
              setSelectedQuizId(null);
              setProgress(null);
            }}
              className={`w-full px-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'}`}>
              <option value="">-- Chọn môn học --</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
            </select>
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Quiz</label>
            <select value={selectedQuizId || ''} onChange={e => setSelectedQuizId(parseInt(e.target.value))}
              disabled={!selectedCourseId}
              className={`w-full px-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'} disabled:opacity-50`}>
              <option value="">-- Chọn quiz --</option>
              {quizzes.map(q => <option key={q.id} value={q.id}>{q.title} ({q.question_count} câu)</option>)}
            </select>
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Lớp (tùy chọn)</label>
            <div className="flex gap-2">
              <input value={classGroup} onChange={e => setClassGroup(e.target.value)}
                className={`flex-1 px-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                placeholder="VD: K17.2, CNTT01..." />
              <button onClick={fetchProgress}
                className={`px-3 py-2 rounded-lg text-sm ${isDark ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}>
                <HiArrowPath className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Stats Summary */}
        {progress && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className={`rounded-xl border p-4 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Tổng SV</p>
              <p className="text-2xl font-bold">{progress.total_students}</p>
            </div>
            <div className={`rounded-xl border p-4 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Đã làm</p>
              <p className="text-2xl font-bold text-green-500">{progress.completed_count}</p>
            </div>
            <div className={`rounded-xl border p-4 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Chưa làm</p>
              <p className="text-2xl font-bold text-red-500">{progress.not_completed_count}</p>
            </div>
            <div className={`rounded-xl border p-4 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Điểm TB</p>
              <p className="text-2xl font-bold text-blue-500">{progress.average_score !== null ? `${progress.average_score}%` : '-'}</p>
            </div>
          </div>
        )}

        {/* Student Table */}
        {loading ? (
          <div className={`rounded-xl border p-8 flex justify-center ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : progress ? (
          <div className={`rounded-xl border overflow-hidden ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className={`overflow-x-auto`}>
              <table className="w-full text-sm">
                <thead className={isDark ? 'bg-gray-800' : 'bg-gray-50'}>
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">STT</th>
                    <th className="text-left px-4 py-3 font-medium">Sinh viên</th>
                    <th className="text-left px-4 py-3 font-medium">Email</th>
                    <th className="text-center px-4 py-3 font-medium">Trạng thái</th>
                    <th className="text-center px-4 py-3 font-medium">Điểm</th>
                    <th className="text-center px-4 py-3 font-medium">Thời gian</th>
                    <th className="text-center px-4 py-3 font-medium">Số lần</th>
                    <th className="text-left px-4 py-3 font-medium">Hoàn thành</th>
                  </tr>
                </thead>
                <tbody>
                  {progress.students.map((s, i) => (
                    <tr key={s.student_id} className={`border-t ${isDark ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-100 hover:bg-gray-50'}`}>
                      <td className="px-4 py-3 text-center">{i + 1}</td>
                      <td className="px-4 py-3 font-medium">{s.student_name}</td>
                      <td className={`px-4 py-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{s.student_email}</td>
                      <td className="px-4 py-3 text-center">
                        {s.completed ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">
                            <HiCheckCircle className="w-3 h-3" /> Đã làm
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">
                            <HiXCircle className="w-3 h-3" /> Chưa làm
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {s.completed ? (
                          <span className={`font-semibold ${
                            (s.percentage || 0) >= 80 ? 'text-green-500'
                            : (s.percentage || 0) >= 50 ? 'text-yellow-500'
                            : 'text-red-500'
                          }`}>
                            {s.score}/{s.total_questions} ({s.percentage}%)
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {s.completed ? (
                          <span className="inline-flex items-center gap-1">
                            <HiClock className="w-3.5 h-3.5" /> {formatTime(s.time_spent_seconds)}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">{s.attempt_count}</td>
                      <td className={`px-4 py-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {s.completed_at ? new Date(s.completed_at).toLocaleString('vi-VN') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : selectedQuizId ? (
          <div className={`text-center py-12 rounded-xl border ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
            <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Không có dữ liệu</p>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default ClassQuizProgressPage;
