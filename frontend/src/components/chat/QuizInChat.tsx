import React, { useState, useEffect } from 'react';
import { HiPlay, HiBookOpen, HiCheckCircle, HiXCircle, HiChevronUp, HiChevronDown, HiQuestionMarkCircle } from 'react-icons/hi2';
import { quizAPI } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

interface Quiz {
  id: number;
  title: string;
  description: string;
  topic: string;
  question_count: number;
  created_at: string;
}

interface QuizQuestion {
  id: number;
  question_text: string;
  options: string[];
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

interface QuizInChatProps {
  courseId: number;
}

type Phase = 'list' | 'taking' | 'result';

const QuizInChat: React.FC<QuizInChatProps> = ({ courseId }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [phase, setPhase] = useState<Phase>('list');
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(false);
  const [minimized, setMinimized] = useState(false);

  // Quiz taking state
  const [currentQuiz, setCurrentQuiz] = useState<{
    attemptId: number;
    quizId: number;
    title: string;
    questions: QuizQuestion[];
  } | null>(null);
  const [answers, setAnswers] = useState<Map<number, number>>(new Map());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Result state
  const [result, setResult] = useState<{
    score: number; total: number; percentage: number;
    results: QuizResult[];
  } | null>(null);

  const startTimeRef = React.useRef(Date.now());

  useEffect(() => {
    fetchQuizzes();
  }, [courseId]);

  const fetchQuizzes = async () => {
    setLoading(true);
    try {
      const res = await quizAPI.getAll(courseId);
      setQuizzes(Array.isArray(res.data) ? res.data : (res.data.results ?? []));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const startQuiz = async (quizId: number) => {
    setLoading(true);
    setMinimized(false); // expand when starting
    try {
      const res = await quizAPI.startQuiz(quizId);
      setCurrentQuiz({
        attemptId: res.data.attempt_id,
        quizId: res.data.quiz_id,
        title: res.data.quiz_title,
        questions: res.data.questions,
      });
      setAnswers(new Map());
      setCurrentIndex(0);
      setPhase('taking');
      startTimeRef.current = Date.now();
    } catch (err) {
      console.error(err);
      alert('Không thể bắt đầu quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (optionIndex: number) => {
    if (!currentQuiz) return;
    const q = currentQuiz.questions[currentIndex];
    setAnswers(prev => {
      const next = new Map(prev);
      next.set(q.id, optionIndex);
      return next;
    });
    // Auto advance after 300ms
    setTimeout(() => {
      if (currentIndex < currentQuiz.questions.length - 1) {
        setCurrentIndex(prev => prev + 1);
      }
    }, 300);
  };

  const handleSubmit = async () => {
    if (!currentQuiz) return;
    setSubmitting(true);
    const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);

    try {
      const answersList = currentQuiz.questions.map(q => ({
        question_id: q.id,
        selected_option: answers.get(q.id) ?? null,
        time_spent: 0,
      }));

      const res = await quizAPI.submitQuiz(currentQuiz.quizId, {
        attempt_id: currentQuiz.attemptId,
        answers: answersList,
        time_spent_seconds: timeSpent,
      });

      setResult(res.data);
      setPhase('result');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const resetQuiz = () => {
    setPhase('list');
    setCurrentQuiz(null);
    setResult(null);
    setAnswers(new Map());
    setCurrentIndex(0);
  };

  // ─── Minimized bar (only when NOT taking quiz) ───
  if (minimized && phase !== 'taking') {
    return (
      <div className="px-4 py-3 max-w-3xl mx-auto w-full">
        <button
          onClick={() => setMinimized(false)}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-sm transition-colors ${
            isDark
              ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
              : 'bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100'
          }`}
        >
          <div className="flex items-center gap-2">
            <HiQuestionMarkCircle className="w-4 h-4" />
            <span className="font-medium">Quiz ({quizzes.length} có sẵn)</span>
          </div>
          <HiChevronDown className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Loading state
  if (loading && phase === 'list') {
    return (
      <div className={`rounded-xl border p-4 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-blue-50 border-blue-200'}`}>
        <div className="flex items-center gap-2 text-sm">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className={isDark ? 'text-gray-300' : 'text-blue-700'}>Đang tải quiz...</span>
        </div>
      </div>
    );
  }

  // ─── Quiz List ───
  if (phase === 'list') {
    if (quizzes.length === 0) return null;

    return (
      <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-blue-50 border-blue-200'}`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-2 border-b ${isDark ? 'border-gray-700' : 'border-blue-100'}`}>
          <div className="flex items-center gap-2">
            <HiBookOpen className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
            <span className={`text-sm font-medium ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>
              Quiz có sẵn ({quizzes.length})
            </span>
          </div>
          <button
            onClick={() => setMinimized(true)}
            className={`p-1 rounded ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-blue-100 text-blue-500'}`}
            title="Thu nhỏ"
          >
            <HiChevronUp className="w-4 h-4" />
          </button>
        </div>

        {/* Quiz list */}
        <div className="p-3 space-y-2">
          {quizzes.slice(0, 5).map(q => (
            <div
              key={q.id}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${isDark
                ? 'bg-gray-700 text-white'
                : 'bg-white text-gray-800'
              }`}
            >
              <div className="flex-1 min-w-0 mr-3">
                <span className="font-medium block truncate">{q.title}</span>
                <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {q.question_count} câu
                </span>
              </div>
              <button
                onClick={() => startQuiz(q.id)}
                disabled={q.question_count === 0}
                title={q.question_count === 0 ? 'Quiz chưa có câu hỏi' : 'Bắt đầu làm bài'}
                className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  q.question_count === 0
                    ? 'opacity-40 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <HiPlay className="w-3.5 h-3.5" />
                Bắt đầu
              </button>
            </div>
          ))}
          {quizzes.length > 5 && (
            <button
              onClick={() => window.location.href = `/student/quiz/${quizzes[0].id}`}
              className={`mt-1 text-xs ${isDark ? 'text-blue-400' : 'text-blue-600'} hover:underline`}
            >
              Xem tất cả quiz
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─── Taking Quiz ───
  if (phase === 'taking' && currentQuiz) {
    const q = currentQuiz.questions[currentIndex];
    const total = currentQuiz.questions.length;

    return (
      <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-blue-50 border-blue-200'}`}>
        {/* Header - NO minimize button during quiz */}
        <div className={`flex items-center justify-between px-4 py-2 border-b ${isDark ? 'border-gray-700 bg-gray-800' : 'border-blue-100 bg-blue-50'}`}>
          <div className="flex items-center gap-2">
            <HiBookOpen className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
            <span className={`text-xs font-medium ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>
              {currentQuiz.title}
            </span>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-blue-900 text-blue-300' : 'bg-blue-200 text-blue-800'}`}>
            Câu {currentIndex + 1}/{total}
          </span>
        </div>

        <div className="p-4">
          {/* Progress bar */}
          <div className={`h-1 rounded-full mb-4 ${isDark ? 'bg-gray-700' : 'bg-blue-100'}`}>
            <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${((currentIndex + 1) / total) * 100}%` }} />
          </div>

          <p className={`text-sm font-medium mb-3 ${isDark ? 'text-white' : 'text-gray-800'}`}>{q.question_text}</p>

          <div className="space-y-2 mb-4">
            {q.options.map((opt, oi) => (
              <button key={oi} onClick={() => handleAnswer(oi)}
                className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                  answers.get(q.id) === oi
                    ? 'bg-blue-600 text-white border-blue-600'
                    : isDark
                      ? 'border-gray-600 hover:border-blue-500 hover:bg-gray-700 text-white'
                      : 'border-gray-200 hover:border-blue-400 hover:bg-white text-gray-800'
                }`}>
                <span className="font-medium mr-2">{['A', 'B', 'C', 'D'][oi]}.</span>
                {opt}
              </button>
            ))}
          </div>

          <div className="flex justify-between items-center">
            <button onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className={`px-3 py-1.5 rounded-lg text-xs ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'} disabled:opacity-30`}>
              Trước
            </button>
            <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
              {answers.size}/{total} đã trả lời
            </span>
            {currentIndex < total - 1 ? (
              <button onClick={() => setCurrentIndex(prev => prev + 1)}
                className="px-3 py-1.5 rounded-lg text-xs bg-blue-600 text-white hover:bg-blue-700">
                Tiếp
              </button>
            ) : (
              <button onClick={handleSubmit}
                disabled={submitting}
                className="px-4 py-1.5 rounded-lg text-xs bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 font-medium">
                {submitting ? 'Đang nộp...' : 'Nộp bài'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── Results ───
  if (phase === 'result' && result) {
    return (
      <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-blue-50 border-blue-200'}`}>
        {/* Header with minimize */}
        <div className={`flex items-center justify-between px-4 py-2 border-b ${isDark ? 'border-gray-700' : 'border-blue-100'}`}>
          <div className="flex items-center gap-2">
            <HiBookOpen className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
            <span className={`text-sm font-medium ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>
              Kết quả
            </span>
          </div>
          <button
            onClick={() => setMinimized(true)}
            className={`p-1 rounded ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-blue-100 text-blue-500'}`}
            title="Thu nhỏ"
          >
            <HiChevronUp className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4">
          <div className="text-center mb-4">
            <div className={`text-3xl font-bold ${
              result.percentage >= 80 ? 'text-green-500'
              : result.percentage >= 50 ? 'text-yellow-500'
              : 'text-red-500'
            }`}>
              {result.score}/{result.total}
            </div>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{result.percentage}%</p>
          </div>

          <div className="space-y-3 max-h-60 overflow-y-auto">
            {result.results.map((r, i) => (
              <div key={i} className={`flex items-start gap-2 text-xs ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                {r.is_correct ? (
                  <HiCheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                ) : (
                  <HiXCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-medium">Câu {i + 1}: {r.question_text}</p>
                  {!r.is_correct && (
                    <p className="text-green-600 mt-0.5">Đáp án đúng: {['A', 'B', 'C', 'D'][r.correct_answer]}. {r.options[r.correct_answer]}</p>
                  )}
                  {r.explanation && <p className={`mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{r.explanation}</p>}
                </div>
              </div>
            ))}
          </div>

          <button onClick={resetQuiz}
            className={`mt-3 w-full py-2 rounded-lg text-xs font-medium ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white text-gray-700 hover:bg-gray-100'}`}>
            Xong
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default QuizInChat;
