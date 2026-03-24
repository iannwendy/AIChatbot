import React, { useState, useEffect } from 'react';
import { HiPlay, HiCheckCircle, HiXCircle } from 'react-icons/hi2';
import { useTheme } from '../../context/ThemeContext';

export interface PracticeQuestion {
  id: number;
  question_text: string;
  options: string[];
  correct_answer: number;
  explanation: string;
}

interface PracticeQuizResultItem {
  question_text: string;
  options: string[];
  selected_option: number | null;
  correct_answer: number;
  is_correct: boolean;
  explanation: string;
}

interface PracticeQuizResult {
  score: number;
  total: number;
  percentage: number;
  results: PracticeQuizResultItem[];
}

interface PracticeQuizInChatProps {
  sessionId: string;
  messageId: string;
  questions: PracticeQuestion[];
  topic: string;
  /** Pre-loaded answers (from page reload) */
  initialAnswers?: Record<number, number> | null;
  /** Pre-loaded result (from page reload) */
  initialResult?: PracticeQuizResult | null;
  /** Called after quiz is submitted — persists to MongoDB */
  onSubmit: (
    answers: Record<number, number>,
    result: PracticeQuizResult,
  ) => void;
}

type Phase = 'taking' | 'result';

const PracticeQuizInChat: React.FC<PracticeQuizInChatProps> = ({
  sessionId,
  messageId,
  questions,
  topic,
  initialAnswers,
  initialResult,
  onSubmit,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Restore from reload, or start fresh
  const [phase, setPhase] = useState<Phase>(
    initialResult ? 'result' : 'taking',
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<PracticeQuizResult | null>(
    initialResult ?? null,
  );

  // Restore answers map from the record loaded from MongoDB
  const [answers, setAnswers] = useState<Map<number, number>>(() => {
    const map = new Map<number, number>();
    if (initialAnswers) {
      for (const [k, v] of Object.entries(initialAnswers)) {
        map.set(Number(k), v);
      }
    }
    return map;
  });

  const handleAnswer = (optionIndex: number) => {
    const q = questions[currentIndex];
    setAnswers(prev => {
      const next = new Map(prev);
      next.set(q.id, optionIndex);
      return next;
    });
    // Auto-advance after 300ms
    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1);
      }
    }, 300);
  };

  const handleSubmit = async () => {
    setSubmitting(true);

    // Build answers record
    const answersRecord: Record<number, number> = {};
    answers.forEach((optIdx, qId) => {
      answersRecord[qId] = optIdx;
    });

    // Calculate result locally
    const results: PracticeQuizResultItem[] = questions.map(q => {
      const selected = answersRecord[q.id] ?? null;
      const is_correct = selected === q.correct_answer;
      return {
        question_text: q.question_text,
        options: q.options,
        selected_option: selected,
        correct_answer: q.correct_answer,
        is_correct,
        explanation: q.explanation,
      };
    });

    const score = results.filter(r => r.is_correct).length;
    const total = questions.length;
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

    const resultData: PracticeQuizResult = { score, total, percentage, results };

    setResult(resultData);
    setPhase('result');
    setSubmitting(false);

    // Persist to MongoDB via PATCH, then notify parent
    try {
      await fetch(`/api/chat/sessions/${sessionId}/update_practice_quiz/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message_id: messageId,
          answers: answersRecord,
          result: resultData,
        }),
      });
    } catch (err) {
      console.error('Failed to save practice quiz result:', err);
    }

    onSubmit(answersRecord, resultData);
  };

  const handleReset = () => {
    setPhase('taking');
    setResult(null);
    setAnswers(new Map());
    setCurrentIndex(0);
  };

  // ─── Taking Quiz ───
  if (phase === 'taking') {
    const q = questions[currentIndex];
    const total = questions.length;

    return (
      <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-blue-50 border-blue-200'}`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-2 border-b ${isDark ? 'border-gray-700 bg-gray-800' : 'border-blue-100 bg-blue-50'}`}>
          <div className="flex items-center gap-2">
            <HiPlay className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
            <span className={`text-xs font-medium ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>
              Ôn tập: {topic}
            </span>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-blue-900 text-blue-300' : 'bg-blue-200 text-blue-800'}`}>
            Câu {currentIndex + 1}/{total}
          </span>
        </div>

        <div className="p-4">
          {/* Progress bar */}
          <div className={`h-1 rounded-full mb-4 ${isDark ? 'bg-gray-700' : 'bg-blue-100'}`}>
            <div
              className="h-full rounded-full bg-blue-500 transition-all"
              style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
            />
          </div>

          <p className={`text-sm font-medium mb-3 ${isDark ? 'text-white' : 'text-gray-800'}`}>
            {q.question_text}
          </p>

          <div className="space-y-2 mb-4">
            {q.options.map((opt, oi) => (
              <button
                key={oi}
                onClick={() => handleAnswer(oi)}
                className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                  answers.get(q.id) === oi
                    ? 'bg-blue-600 text-white border-blue-600'
                    : isDark
                      ? 'border-gray-600 hover:border-blue-500 hover:bg-gray-700 text-white'
                      : 'border-gray-200 hover:border-blue-400 hover:bg-white text-gray-800'
                }`}
              >
                <span className="font-medium mr-2">{['A', 'B', 'C', 'D'][oi]}.</span>
                {opt}
              </button>
            ))}
          </div>

          <div className="flex justify-between items-center">
            <button
              onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className={`px-3 py-1.5 rounded-lg text-xs ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'} disabled:opacity-30`}
            >
              Trước
            </button>
            <span className="text-xs text-gray-500">
              {answers.size}/{total} đã trả lời
            </span>
            {currentIndex < total - 1 ? (
              <button
                onClick={() => setCurrentIndex(prev => prev + 1)}
                className="px-3 py-1.5 rounded-lg text-xs bg-blue-600 text-white hover:bg-blue-700"
              >
                Tiếp
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-4 py-1.5 rounded-lg text-xs bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 font-medium"
              >
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
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-2 border-b ${isDark ? 'border-gray-700' : 'border-blue-100'}`}>
          <div className="flex items-center gap-2">
            <HiPlay className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
            <span className={`text-sm font-medium ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>
              Kết quả ôn tập
            </span>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-blue-900 text-blue-300' : 'bg-blue-200 text-blue-800'}`}>
            {result.score}/{result.total}
          </span>
        </div>

        <div className="p-4">
          {/* Score */}
          <div className="text-center mb-4">
            <div className={`text-3xl font-bold ${
              result.percentage >= 80 ? 'text-green-500'
              : result.percentage >= 50 ? 'text-yellow-500'
              : 'text-red-500'
            }`}>
              {result.score}/{result.total}
            </div>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {result.percentage}%
            </p>
          </div>

          {/* Per-question review */}
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
                    <p className="text-green-600 mt-0.5">
                      Đáp án đúng: {['A', 'B', 'C', 'D'][r.correct_answer]}. {r.options[r.correct_answer]}
                    </p>
                  )}
                  {r.explanation && (
                    <p className={`mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      {r.explanation}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleReset}
              className={`flex-1 py-2 rounded-lg text-xs font-medium ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
            >
              Làm lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default PracticeQuizInChat;
