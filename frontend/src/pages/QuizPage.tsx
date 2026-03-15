import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Button,
  Paper,
  Typography,
  AppBar,
  Toolbar,
  IconButton,
  TextField,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import QuizIcon from '@mui/icons-material/Quiz';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { coursesAPI } from '../services/api';

interface QuestionData {
  id: number;
  question_text: string;
  options: string[];
  correct_answer: number;
  explanation: string;
}

interface QuizData {
  id: number;
  title: string;
  questions: QuestionData[];
}

interface QuizResult {
  score: number;
  total: number;
  percentage: number;
  results: {
    question: string;
    selected: number | null;
    correct: number;
    is_correct: boolean;
    explanation: string;
    options: string[];
  }[];
}

const QuizPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  const [topic, setTopic] = useState('');
  const [numQuestions, setNumQuestions] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!courseId) return;
    setGenerating(true);
    setError('');
    setQuiz(null);
    setResult(null);

    try {
      const res = await coursesAPI.generateQuiz(parseInt(courseId), numQuestions, topic);
      setQuiz(res.data.quiz);
      setAnswers(new Array(res.data.quiz.questions.length).fill(null));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Lỗi khi tạo quiz');
    } finally {
      setGenerating(false);
    }
  };

  const handleAnswer = (questionIndex: number, optionIndex: number) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[questionIndex] = optionIndex;
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!quiz || !courseId) return;
    setSubmitting(true);

    try {
      const res = await coursesAPI.submitQuiz(parseInt(courseId), quiz.id, answers);
      setResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Lỗi khi nộp bài');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => navigate('/')} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <QuizIcon sx={{ mr: 1 }} />
          <Typography variant="h6">Trắc nghiệm</Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 3 }}>
        {/* Generate Form */}
        {!quiz && !result && (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Tạo bài trắc nghiệm</Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <TextField
                label="Chủ đề (VD: Chương 2)"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                fullWidth
              />
              <TextField
                label="Số câu"
                type="number"
                value={numQuestions}
                onChange={(e) => setNumQuestions(parseInt(e.target.value) || 5)}
                sx={{ width: 120 }}
                slotProps={{ htmlInput: { min: 1, max: 20 } }}
              />
            </Box>
            <Button
              variant="contained"
              onClick={handleGenerate}
              disabled={generating}
              startIcon={generating ? <CircularProgress size={20} /> : <QuizIcon />}
            >
              {generating ? 'Đang tạo...' : 'Tạo câu hỏi'}
            </Button>
          </Paper>
        )}

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* Quiz Questions */}
        {quiz && !result && (
          <Box>
            <Typography variant="h5" gutterBottom>{quiz.title}</Typography>
            {quiz.questions.map((q, qIdx) => (
              <Paper key={q.id} sx={{ p: 3, mb: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Câu {qIdx + 1}: {q.question_text}
                </Typography>
                <FormControl>
                  <RadioGroup
                    value={answers[qIdx] ?? ''}
                    onChange={(e) => handleAnswer(qIdx, parseInt(e.target.value))}
                  >
                    {q.options.map((opt, oIdx) => (
                      <FormControlLabel
                        key={oIdx}
                        value={oIdx}
                        control={<Radio />}
                        label={opt}
                      />
                    ))}
                  </RadioGroup>
                </FormControl>
              </Paper>
            ))}
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={handleSubmit}
              disabled={submitting || answers.some((a) => a === null)}
              fullWidth
              sx={{ mb: 3 }}
            >
              {submitting ? 'Đang chấm...' : 'Nộp bài'}
            </Button>
          </Box>
        )}

        {/* Results */}
        {result && (
          <Box>
            <Paper sx={{ p: 3, mb: 3, textAlign: 'center' }}>
              <Typography variant="h4" gutterBottom>
                Kết quả: {result.score}/{result.total}
              </Typography>
              <Chip
                label={`${result.percentage}%`}
                color={result.percentage >= 70 ? 'success' : result.percentage >= 50 ? 'warning' : 'error'}
                sx={{ fontSize: '1.2rem', p: 2 }}
              />
            </Paper>

            {result.results.map((r, idx) => (
              <Paper key={idx} sx={{ p: 3, mb: 2, borderLeft: 4, borderColor: r.is_correct ? 'success.main' : 'error.main' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  {r.is_correct ? <CheckCircleIcon color="success" /> : <CancelIcon color="error" />}
                  <Typography variant="subtitle1" fontWeight="bold">Câu {idx + 1}: {r.question}</Typography>
                </Box>
                {r.options.map((opt, oIdx) => (
                  <Typography
                    key={oIdx}
                    sx={{
                      ml: 4,
                      color: oIdx === r.correct ? 'success.main' : oIdx === r.selected && !r.is_correct ? 'error.main' : 'text.primary',
                      fontWeight: oIdx === r.correct ? 'bold' : 'normal',
                    }}
                  >
                    {oIdx === r.correct ? '✓ ' : oIdx === r.selected && !r.is_correct ? '✗ ' : '  '}
                    {opt}
                  </Typography>
                ))}
                {r.explanation && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1, ml: 4 }}>
                    Giải thích: {r.explanation}
                  </Typography>
                )}
              </Paper>
            ))}

            <Button variant="outlined" onClick={() => { setQuiz(null); setResult(null); }} fullWidth sx={{ mb: 3 }}>
              Tạo quiz mới
            </Button>
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default QuizPage;
