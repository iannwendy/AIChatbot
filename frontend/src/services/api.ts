import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Get CSRF token from cookie
export const getCSRFToken = (): string => {
  const name = 'csrftoken';
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    cookie = cookie.trim();
    if (cookie.startsWith(name + '=')) {
      return cookie.substring(name.length + 1);
    }
  }
  return '';
};

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Add CSRF token for POST/PUT/PATCH/DELETE requests
    const csrfToken = getCSRFToken();
    if (csrfToken && ['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase() || '')) {
      config.headers['X-CSRFToken'] = csrfToken;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  googleLogin: () => {
    window.location.href = `${API_BASE_URL}/auth/google/`;
  },
  getCurrentUser: () => api.get('/auth/current-user/'),
  logout: () => api.post('/auth/logout/'),
  updateProfile: (data: { full_name?: string; avatar_url?: string }) =>
    api.patch('/auth/update-profile/', data),
  getAdminStats: () => api.get('/auth/admin/stats/'),
  getTeacherStats: () => api.get('/auth/teacher/stats/'),
};

// Users API
export const usersAPI = {
  getAll: () => api.get('/users/'),
  getById: (id: number) => api.get(`/users/${id}/`),
  create: (data: any) => api.post('/users/', data),
  update: (id: number, data: any) => api.put(`/users/${id}/`, data),
  updateUser: (id: number, data: any) => api.patch(`/users/${id}/`, data),
  delete: (id: number) => api.delete(`/users/${id}/`),
  getStudents: () => api.get('/users/students/'),
  getTeachers: () => api.get('/users/teachers/'),
  createStudent: (data: any) => api.post('/users/students/', data),
  updateStudent: (id: number, data: any) => api.put(`/users/students/${id}/`, data),
  deleteStudent: (id: number) => api.delete(`/users/students/${id}/`),
  createTeacher: (data: any) => api.post('/users/teachers/', data),
  updateTeacher: (id: number, data: any) => api.put(`/users/teachers/${id}/`, data),
  deleteTeacher: (id: number) => api.delete(`/users/teachers/${id}/`),
  importStudents: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/users/import/students/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  importTeachers: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/users/import/teachers/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Courses API
export const coursesAPI = {
  getAll: () => api.get('/courses/'),
  getById: (id: number) => api.get(`/courses/${id}/`),
  create: (data: any) => api.post('/courses/', data),
  update: (id: number, data: any) => api.put(`/courses/${id}/`, data),
  delete: (id: number) => api.delete(`/courses/${id}/`),
  enroll: (id: number, studentIds?: number[]) =>
    api.post(`/courses/${id}/enroll/`, studentIds ? { student_ids: studentIds } : {}),
  unenroll: (id: number, studentIds?: number[]) =>
    api.post(`/courses/${id}/unenroll/`, studentIds ? { student_ids: studentIds } : {}),
  myCourses: () => api.get('/courses/my_courses/'),
  generateQuiz: (courseId: number, numQuestions: number, topic: string) =>
    api.post(`/courses/${courseId}/generate-quiz/`, { num_questions: numQuestions, topic }),
  submitQuiz: (courseId: number, quizId: number, answers: (number | null)[]) =>
    api.post(`/courses/${courseId}/submit-quiz/${quizId}/`, { answers }),
  getQuizzes: (courseId: number) => api.get(`/courses/quizzes/?course_id=${courseId}`),
  getExamSchedule: (courseId: number) => api.get(`/courses/${courseId}/exam-schedule/`),
  importStudents: (courseId: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/courses/${courseId}/import-students/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Quiz API
export const quizAPI = {
  // Quiz CRUD (Teacher)
  getAll: (courseId?: number) => {
    const url = courseId ? `/courses/quizzes/?course_id=${courseId}` : '/courses/quizzes/';
    return api.get(url);
  },
  getById: (quizId: number) => api.get(`/courses/quizzes/${quizId}/`),
  create: (data: { course: number; title: string; description?: string; topic?: string }) =>
    api.post('/courses/quizzes/', data),
  update: (quizId: number, data: any) => api.put(`/courses/quizzes/${quizId}/`, data),
  delete: (quizId: number) => api.delete(`/courses/quizzes/${quizId}/`),

  // Questions (Teacher)
  addQuestions: (quizId: number, questions: any[]) =>
    api.post(`/courses/quizzes/${quizId}/questions/`, { questions }),
  updateQuestions: (quizId: number, questions: any[]) =>
    api.put(`/courses/quizzes/${quizId}/update-questions/`, { questions }),

  // Quiz Taking (Student)
  startQuiz: (quizId: number, classGroup?: string) =>
    api.post(`/courses/quizzes/${quizId}/start/`, { class_group: classGroup || '' }),
  submitQuiz: (quizId: number, data: {
    attempt_id: number;
    answers: { question_id: number; selected_option: number | null; time_spent?: number }[];
    time_spent_seconds: number;
  }) => api.post(`/courses/quizzes/${quizId}/submit/`, data),
  getResult: (quizId: number, attemptId?: number) => {
    const url = attemptId
      ? `/courses/quizzes/${quizId}/result/?attempt_id=${attemptId}`
      : `/courses/quizzes/${quizId}/result/`;
    return api.get(url);
  },
  getMyAttempts: (quizId: number) => api.get(`/courses/quizzes/${quizId}/my-attempts/`),

  // Teacher Progress
  getClassProgress: (quizId: number, classGroup?: string) => {
    const url = classGroup
      ? `/courses/quizzes/${quizId}/class-progress/?class_group=${classGroup}`
      : `/courses/quizzes/${quizId}/class-progress/`;
    return api.get(url);
  },
  getAllAttempts: (quizId: number) => api.get(`/courses/quizzes/${quizId}/all-attempts/`),

  // LLM Generate (Teacher)
  generateQuiz: (courseId: number, numQuestions: number, topic: string) =>
    api.post(`/courses/${courseId}/generate-quiz/`, { num_questions: numQuestions, topic }),
};

// Documents API
export const documentsAPI = {
  getAll: (courseId?: number) => {
    const url = courseId ? `/documents/?course_id=${courseId}` : '/documents/';
    return api.get(url);
  },
  getById: (id: number) => api.get(`/documents/${id}/`),
  upload: (file: File, courseId: number, title: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('course', courseId.toString());
    formData.append('title', title);
    return api.post('/documents/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  delete: (id: number) => api.delete(`/documents/${id}/`),
  process: (id: number) => api.post(`/documents/${id}/process/`),
  byCourse: (courseId: number) => api.get(`/documents/by_course/?course_id=${courseId}`),
};

// Chat API
export const chatAPI = {
  getSessions: () => api.get('/chat/sessions/'),
  createSession: (courseId: number, title: string) =>
    api.post('/chat/sessions/', { course_id: courseId, title }),
  getMessages: (sessionId: string) =>
    api.get(`/chat/sessions/${sessionId}/`),
  sendMessage: (sessionId: string, content: string, model?: string) =>
    api.post(`/chat/sessions/${sessionId}/send_message/`, { content, model }),
  sendMessageStream: (sessionId: string, content: string, model?: string) => {
    const token = localStorage.getItem('token');
    const csrfToken = getCSRFToken();
    return fetch(`${API_BASE_URL}/chat/sessions/${sessionId}/send_message_stream/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
      },
      credentials: 'include',
      body: JSON.stringify({ content, model }),
    });
  },
  getModels: () => api.get('/chat/sessions/models/'),
  renameSession: (sessionId: string, title: string) =>
    api.patch(`/chat/sessions/${sessionId}/`, { title }),
  deleteSession: (sessionId: string) =>
    api.delete(`/chat/sessions/${sessionId}/`),
};

export default api;
