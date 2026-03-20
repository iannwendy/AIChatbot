import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { HiPlus, HiTrash, HiPencil, HiRefresh, HiBookOpen, HiQuestionMarkCircle, HiChevronLeft, HiCheck } from 'react-icons/hi';
import { useTheme } from '../../context/ThemeContext';
import { coursesAPI, quizAPI } from '../../services/api';

interface Question {
  id?: number;
  question_text: string;
  options: string[];
  correct_answer: number;
  explanation: string;
  order?: number;
}

interface Quiz {
  id: number;
  title: string;
  description: string;
  topic: string;
  question_count: number;
  created_at: string;
  questions: Question[];
  course_name?: string;
}

interface Course {
  id: number;
  name: string;
  code: string;
}

const QuizManagementPage: React.FC = () => {
  const { courseId } = useParams<{ courseId?: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(courseId ? parseInt(courseId) : null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [generating, setGenerating] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Create quiz form
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDesc, setQuizDesc] = useState('');
  const [quizTopic, setQuizTopic] = useState('');

  // Generate AI form
  const [genTopic, setGenTopic] = useState('');
  const [genCount, setGenCount] = useState(5);

  // Question form
  const [questions, setQuestions] = useState<Question[]>([
    { question_text: '', options: ['', '', '', ''], correct_answer: 0, explanation: '' }
  ]);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await coursesAPI.myCourses();
        const data = Array.isArray(res.data) ? res.data : (res.data.results ?? []);
        setCourses(data);
        if (!selectedCourseId && data.length > 0) {
          setSelectedCourseId(data[0].id);
        }
      } catch (err) {
        console.error('Failed to load courses:', err);
      }
    };
    fetchCourses();
  }, []);

  useEffect(() => {
    if (selectedCourseId) {
      fetchQuizzes();
    }
  }, [selectedCourseId]);

  const fetchQuizzes = async () => {
    if (!selectedCourseId) return;
    setLoading(true);
    try {
      const res = await quizAPI.getAll(selectedCourseId);
      setQuizzes(Array.isArray(res.data) ? res.data : (res.data.results ?? []));
    } catch (err) {
      console.error('Failed to load quizzes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuiz = async () => {
    if (!selectedCourseId || !quizTitle.trim()) return;
    setCreating(true);
    setCreateError('');
    try {
      await quizAPI.create({
        course: selectedCourseId,
        title: quizTitle.trim(),
        description: quizDesc.trim(),
        topic: quizTopic.trim(),
      });
      await fetchQuizzes();
      setShowCreateModal(false);
      setQuizTitle('');
      setQuizDesc('');
      setQuizTopic('');
    } catch (err: any) {
      console.error('Failed to create quiz:', err);
      const msg = err?.response?.data?.error || err?.response?.data?.detail || 'Tạo quiz thất bại';
      setCreateError(msg);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteQuiz = async (quizId: number) => {
    if (!window.confirm('Xóa quiz này?')) return;
    try {
      await quizAPI.delete(quizId);
      setQuizzes(prev => prev.filter(q => q.id !== quizId));
    } catch (err) {
      console.error('Failed to delete quiz:', err);
      alert('Xóa thất bại');
    }
  };

  const handleGenerateAI = async () => {
    if (!selectedCourseId || !genTopic.trim()) return;
    setGenerating(true);
    try {
      const res = await quizAPI.generateQuiz(selectedCourseId, genCount, genTopic.trim());
      await fetchQuizzes();
      setShowCreateModal(false);
      setGenTopic('');
    } catch (err: any) {
      console.error('Failed to generate quiz:', err);
      const msg = err?.response?.data?.error || 'Sinh quiz thất bại. Đảm bảo đã upload và xử lý tài liệu.';
      alert(msg);
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveQuestions = async () => {
    if (!selectedQuiz) return;
    const valid = questions.every(q => q.question_text.trim() && q.options.every(o => o.trim()));
    if (!valid) { alert('Vui lòng điền đầy đủ câu hỏi và đáp án'); return; }

    try {
      const res = await quizAPI.updateQuestions(selectedQuiz.id, questions);
      setQuizzes(prev => prev.map(q =>
        q.id === selectedQuiz.id
          ? { ...q, questions: res.data.questions, question_count: res.data.questions.length }
          : q
      ));
      setShowQuestionModal(false);
      setQuestions([{ question_text: '', options: ['', '', '', ''], correct_answer: 0, explanation: '' }]);
    } catch (err) {
      console.error('Failed to save questions:', err);
      alert('Lưu câu hỏi thất bại');
    }
  };

  const openQuestionsModal = (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    if (quiz.questions.length > 0) {
      setQuestions(quiz.questions.map(q => ({
        id: q.id,
        question_text: q.question_text,
        options: q.options,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        order: q.order,
      })));
    } else {
      setQuestions([{ question_text: '', options: ['', '', '', ''], correct_answer: 0, explanation: '' }]);
    }
    setShowQuestionModal(true);
  };

  const addQuestion = () => {
    setQuestions(prev => [...prev, { question_text: '', options: ['', '', '', ''], correct_answer: 0, explanation: '' }]);
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    setQuestions(prev => prev.map((q, i) => i === index ? { ...q, [field]: value } : q));
  };

  const updateOption = (qIndex: number, oIndex: number, value: string) => {
    setQuestions(prev => prev.map((q, i) =>
      i === qIndex ? { ...q, options: q.options.map((o, j) => j === oIndex ? value : o) } : q
    ));
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <div className={`border-b px-6 py-4 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/teacher/courses')}
              className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
              <HiChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-semibold">Quản lý Quiz</h1>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Tạo và quản lý câu hỏi trắc nghiệm</p>
            </div>
          </div>
          <button onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
            <HiPlus className="w-4 h-4" /> Tạo Quiz
          </button>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto">
        {/* Course selector */}
        <div className="mb-6">
          <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Chọn môn học
          </label>
          <select value={selectedCourseId || ''} onChange={e => setSelectedCourseId(parseInt(e.target.value))}
            className={`px-4 py-2 rounded-lg border text-sm w-full max-w-xs ${isDark
              ? 'bg-gray-800 border-gray-600 text-white'
              : 'bg-white border-gray-300 text-gray-900'
            }`}>
            <option value="">-- Chọn môn học --</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
          </select>
        </div>

        {/* Quiz list */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className={`rounded-xl border p-6 animate-pulse ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className={`h-4 rounded w-3/4 mb-3 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
                <div className={`h-3 rounded w-1/2 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
              </div>
            ))}
          </div>
        ) : quizzes.length === 0 ? (
          <div className={`text-center py-16 rounded-xl border ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
            <HiQuestionMarkCircle className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
            <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Chưa có quiz nào</p>
            <p className={`text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Tạo quiz mới hoặc sinh bằng AI</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quizzes.map(quiz => (
              <div key={quiz.id}
                className={`rounded-xl border p-5 hover:shadow-md transition-shadow ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="font-semibold text-sm leading-tight">{quiz.title}</h3>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
                    isDark ? 'bg-blue-900 text-blue-300' : 'bg-blue-50 text-blue-700'
                  }`}>
                    {quiz.question_count} câu
                  </span>
                </div>
                {quiz.topic && (
                  <p className={`text-xs mb-2 px-2 py-0.5 rounded inline-block ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                    {quiz.topic}
                  </p>
                )}
                {quiz.description && (
                  <p className={`text-xs mb-3 line-clamp-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {quiz.description}
                  </p>
                )}
                <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  {new Date(quiz.created_at).toLocaleDateString('vi-VN')}
                </p>
                <div className="flex gap-2 mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <button onClick={() => openQuestionsModal(quiz)}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium ${isDark
                      ? 'bg-blue-900 text-blue-300 hover:bg-blue-800'
                      : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                    }`}>
                    <HiQuestionMarkCircle className="w-3.5 h-3.5" />
                    Câu hỏi
                  </button>
                  <button onClick={() => navigate(`/teacher/class-progress?quizId=${quiz.id}&courseId=${selectedCourseId}`)}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium ${isDark
                      ? 'bg-green-900 text-green-300 hover:bg-green-800'
                      : 'bg-green-50 text-green-700 hover:bg-green-100'
                    }`}>
                    <HiBookOpen className="w-3.5 h-3.5" />
                    Tiến độ
                  </button>
                  <button onClick={() => handleDeleteQuiz(quiz.id)}
                    className={`p-1.5 rounded-lg text-xs ${isDark ? 'text-red-400 hover:bg-red-900/30' : 'text-red-600 hover:bg-red-50'}`}>
                    <HiTrash className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Quiz Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCreateModal(false)}>
          <div className={`rounded-xl p-6 w-full max-w-md mx-4 ${isDark ? 'bg-gray-800' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Tạo Quiz mới</h2>

            <div className="space-y-3">
              {createError && (
                <div className={`rounded-lg p-3 text-sm ${isDark ? 'bg-red-900/30 text-red-400 border border-red-800' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                  {createError}
                </div>
              )}
              <div>
                <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Tiêu đề *</label>
                <input value={quizTitle} onChange={e => setQuizTitle(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  placeholder="VD: Ôn tập Chương 2" />
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Mô tả</label>
                <textarea value={quizDesc} onChange={e => setQuizDesc(e.target.value)} rows={2}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  placeholder="Mô tả quiz..." />
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Chủ đề</label>
                <input value={quizTopic} onChange={e => setQuizTopic(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  placeholder="VD: Chương 2 - Đại số Boolean" />
              </div>
            </div>

            <div className={`border-t my-4 pt-4 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <p className={`text-xs font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Hoặc sinh bằng AI</p>
              <div className="flex gap-2 mb-2">
                <input value={genTopic} onChange={e => setGenTopic(e.target.value)}
                  className={`flex-1 px-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  placeholder="Chủ đề cần sinh (VD: Chương 2)" />
                <input type="number" value={genCount} onChange={e => setGenCount(parseInt(e.target.value) || 5)} min={1} max={20}
                  className={`w-16 px-2 py-2 rounded-lg border text-sm text-center ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`} />
              </div>
              <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Câu hỏi</p>
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={handleCreateQuiz}
                disabled={!quizTitle.trim() || creating}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                {creating ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Đang tạo...</>
                ) : 'Tạo thủ công'}
              </button>
              <button type="button" onClick={handleGenerateAI} disabled={generating || !genTopic.trim()}
                className="flex-1 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                {generating ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Đang sinh...</>
                ) : (
                  <><HiRefresh className="w-4 h-4" /> Sinh bằng AI</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Questions Modal */}
      {showQuestionModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto py-8" onClick={() => setShowQuestionModal(false)}>
          <div className={`rounded-xl p-6 w-full max-w-3xl mx-4 ${isDark ? 'bg-gray-800' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                Câu hỏi: {selectedQuiz?.title}
              </h2>
              <button type="button" onClick={addQuestion}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                <HiPlus className="w-4 h-4" /> Thêm câu
              </button>
            </div>

            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-1">
              {questions.map((q, qi) => (
                <div key={qi} className={`rounded-xl border p-4 ${isDark ? 'border-gray-700 bg-gray-700/30' : 'border-gray-200 bg-gray-50'}`}>
                  <div className="flex gap-2 mb-3">
                    <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium ${isDark ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
                      Câu {qi + 1}
                    </span>
                    <button onClick={() => setQuestions(prev => prev.filter((_, i) => i !== qi))}
                      className={`ml-auto p-1 rounded ${isDark ? 'hover:bg-red-900/30 text-red-400' : 'hover:bg-red-50 text-red-600'}`}>
                      <HiTrash className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <textarea value={q.question_text} onChange={e => updateQuestion(qi, 'question_text', e.target.value)}
                    rows={2}
                    className={`w-full px-3 py-2 rounded-lg border text-sm mb-3 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                    placeholder="Nội dung câu hỏi..." />

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {['A', 'B', 'C', 'D'].map((label, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <span className={`text-xs font-medium w-5 ${q.correct_answer === oi ? 'text-blue-500' : isDark ? 'text-gray-500' : 'text-gray-400'}`}>{label}.</span>
                        <input value={q.options[oi] || ''} onChange={e => updateOption(qi, oi, e.target.value)}
                          className={`flex-1 px-2 py-1.5 rounded border text-sm ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} ${q.correct_answer === oi ? 'border-blue-500 ring-1 ring-blue-500' : ''}`}
                          placeholder={`Đáp án ${label}`} />
                        {q.correct_answer === oi && <HiCheck className="w-4 h-4 text-blue-500 shrink-0" />}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Đáp án đúng:</span>
                    {['A', 'B', 'C', 'D'].map((label, oi) => (
                      <button key={oi} onClick={() => updateQuestion(qi, 'correct_answer', oi)}
                        className={`px-2 py-0.5 rounded text-xs font-medium ${q.correct_answer === oi
                          ? 'bg-green-600 text-white'
                          : isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-600'
                        }`}>
                        {label}
                      </button>
                    ))}
                  </div>

                  <textarea value={q.explanation} onChange={e => updateQuestion(qi, 'explanation', e.target.value)}
                    rows={1}
                    className={`w-full px-3 py-1.5 rounded-lg border text-sm ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                    placeholder="Giải thích (tùy chọn)..." />
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button type="button" onClick={handleSaveQuestions}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                Lưu câu hỏi
              </button>
              <button type="button" onClick={() => setShowQuestionModal(false)}
                className={`px-4 py-2 rounded-lg text-sm ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizManagementPage;
