import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { HiChevronLeft, HiCheckCircle, HiXCircle, HiClock } from 'react-icons/hi2';
import { useTheme } from '../context/ThemeContext';
import { quizAPI } from '../services/api';

interface QuizQuestion {
  id: number;
  question_text: string;
  options: string[];
  order?: number;
}

interface QuizResult {
  question_id: number;
  question_text: string;
  options: string[];
  selected_option: number | null;
  correct_answer: number;
  is_correct: boolean;
  explanation: string;
}

interface QuizData {
  attempt_id: number;
  quiz_id: number;
  quiz_title: string;
  total_questions: number;
  questions: QuizQuestion[];
}

const StudentQuizPage: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [answers, setAnswers] = useState<Map<number, number>>(new Map());
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    score: number; total: number; percentage: number;
    time_spent_seconds: number; results: QuizResult[];
  } | null>(null);
  const [error, setError] = useState('');

  // Timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startQuiz = async () => {
    if (!quizId) return;
    setLoading(true);
    setError('');
    try {
      const res = await quizAPI.startQuiz(parseInt(quizId));
      setQuizData(res.data);
      setAnswers(new Map());
      setResult(null);
      // Start timer
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Không thể bắt đầu quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (questionId: number, optionIndex: number) => {
    setAnswers(prev => {
      const next = new Map(prev);
      next.set(questionId, optionIndex);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!quizData) return;
    if (timerRef.current) clearInterval(timerRef.current);

    const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
    setSubmitting(true);

    try {
      const answersList = quizData.questions.map(q => ({
        question_id: q.id,
        selected_option: answers.get(q.id) ?? null,
        time_spent: 0,
      }));

      const res = await quizAPI.submitQuiz(parseInt(quizId!), {
        attempt_id: quizData.attempt_id,
        answers: answersList,
        time_spent_seconds: timeSpent,
      });

      setResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Nộp bài thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const answeredCount = answers.size;
  const totalQuestions = quizData?.questions.length || 0;

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <div className={`sticky top-0 z-10 border-b px-6 py-3 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)}
              className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
              <HiChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-sm font-semibold">{quizData?.quiz_title || 'Làm Quiz'}</h1>
              {quizData && !result && (
                <div className="flex items-center gap-3 text-xs">
                  <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                    {answeredCount}/{totalQuestions} câu
                  </span>
                  <span className="flex items-center gap-1 text-blue-500">
                    <HiClock className="w-3.5 h-3.5" /> {formatTimer(elapsedSeconds)}
                  </span>
                </div>
              )}
            </div>
          </div>
          {quizData && !result && (
            <button onClick={handleSubmit}
              disabled={submitting || answeredCount === 0}
              className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {submitting ? 'Đang nộp...' : 'Nộp bài'}
            </button>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-6">
        {/* Start screen */}
        {!quizData && !result && (
          <div className={`text-center py-16 rounded-xl border ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
            <h2 className="text-lg font-semibold mb-2">Sẵn sàng làm Quiz?</h2>
            <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Nhấn bắt đầu để nhận câu hỏi
            </p>
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            <button onClick={startQuiz} disabled={loading}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50">
              {loading ? 'Đang tải...' : 'Bắt đầu'}
            </button>
          </div>
        )}

        {/* Questions */}
        {quizData && !result && (
          <div className="space-y-6">
            {quizData.questions.map((q, qi) => (
              <div key={q.id}
                className={`rounded-xl border p-5 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="flex gap-3 mb-4">
                  <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    answers.has(q.id)
                      ? 'bg-blue-600 text-white'
                      : isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {qi + 1}
                  </span>
                  <p className="text-sm font-medium leading-relaxed">{q.question_text}</p>
                </div>
                <div className="space-y-2 pl-10">
                  {q.options.map((opt, oi) => (
                    <button key={oi} onClick={() => handleAnswer(q.id, oi)}
                      className={`w-full text-left px-4 py-2.5 rounded-lg border text-sm transition-colors ${
                        answers.get(q.id) === oi
                          ? 'bg-blue-600 text-white border-blue-600'
                          : isDark
                            ? 'border-gray-600 hover:border-gray-500 hover:bg-gray-700'
                            : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                      }`}>
                      <span className="font-medium mr-2">{['A', 'B', 'C', 'D'][oi]}.</span>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* Submit button at bottom */}
            <div className="text-center py-4">
              <button onClick={handleSubmit}
                disabled={submitting || answeredCount === 0}
                className="px-8 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 text-base">
                {submitting ? 'Đang nộp...' : `Nộp bài (${answeredCount}/${totalQuestions})`}
              </button>
              {answeredCount < totalQuestions && (
                <p className="text-sm text-yellow-500 mt-2">Bạn chưa trả lời hết câu hỏi</p>
              )}
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Score card */}
            <div className={`rounded-xl border p-6 text-center ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className={`text-4xl font-bold mb-2 ${
                result.percentage >= 80 ? 'text-green-500'
                : result.percentage >= 50 ? 'text-yellow-500'
                : 'text-red-500'
              }`}>
                {result.score}/{result.total}
              </div>
              <p className={`text-lg font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                {result.percentage}%
              </p>
              <p className={`text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                Thời gian: {formatTimer(result.time_spent_seconds)}
              </p>
              <div className="flex gap-3 justify-center mt-4">
                <button onClick={() => { setQuizData(null); setResult(null); setAnswers(new Map()); }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                  Làm lại
                </button>
                <button onClick={() => navigate(-1)}
                  className={`px-4 py-2 rounded-lg text-sm ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-700'}`}>
                  Quay lại
                </button>
              </div>
            </div>

            {/* Question results */}
            {result.results.map((r, i) => (
              <div key={i}
                className={`rounded-xl border p-5 ${isDark ? 'bg-gray-800' : 'bg-white'} ${
                  r.is_correct ? 'border-green-500/50' : 'border-red-500/50'
                }`}>
                <div className="flex items-start gap-3 mb-3">
                  {r.is_correct ? (
                    <HiCheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  ) : (
                    <HiXCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  )}
                  <p className="text-sm font-medium">Câu {i + 1}: {r.question_text}</p>
                </div>
                <div className="space-y-1.5 pl-8">
                  {r.options.map((opt, oi) => (
                    <div key={oi}
                      className={`px-3 py-2 rounded-lg text-sm ${
                        oi === r.correct_answer
                          ? 'bg-green-100 text-green-800 font-medium'
                          : oi === r.selected_option && !r.is_correct
                            ? 'bg-red-100 text-red-800 line-through'
                            : isDark ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                      <span className="font-medium mr-2">{['A', 'B', 'C', 'D'][oi]}.</span>
                      {opt}
                      {oi === r.correct_answer && <span className="ml-2 text-green-600 text-xs">(Đúng)</span>}
                      {oi === r.selected_option && oi !== r.correct_answer && <span className="ml-2 text-red-600 text-xs">(Bạn chọn)</span>}
                    </div>
                  ))}
                </div>
                {r.explanation && (
                  <div className={`mt-3 pl-8 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    <span className="font-medium">Giải thích: </span>{r.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentQuizPage;
