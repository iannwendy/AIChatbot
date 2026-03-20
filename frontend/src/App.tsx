import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import MainLayout from './components/layout/MainLayout';
import AdminLayout from './components/layout/AdminLayout';
import TeacherLayout from './components/layout/TeacherLayout';
import LoginPage from './pages/LoginPage';
import AdminLoginPage from './pages/AdminLoginPage';
import ChatPage from './pages/ChatPage';
import CourseDetailPage from './pages/CourseDetailPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
// Admin pages
import AdminDashboardPage from './pages/admin/DashboardPage';
import AdminUsersPage from './pages/admin/UsersPage';
import AdminCoursesPage from './pages/admin/CoursesPage';
import AdminDocumentsPage from './pages/admin/DocumentsPage';
import AdminSettingsPage from './pages/admin/SettingsPage';
// Teacher pages
import TeacherDashboardPage from './pages/teacher/DashboardPage';
import TeacherDocumentsPage from './pages/teacher/DocumentsPage';
import TeacherCoursesPage from './pages/teacher/CoursesPage';
import TeacherQuizManagementPage from './pages/teacher/QuizManagementPage';
import TeacherClassProgressPage from './pages/teacher/ClassQuizProgressPage';
// Student pages
import StudentQuizPage from './pages/StudentQuizPage';
import StudentCourseQuizPage from './pages/StudentCourseQuizPage';
import './index.css';

/* Protected Route wrapper with role-based access */
interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If roles are specified, check if user has required role
  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(user.role)) {
      // Redirect based on user role
      if (user.role === 'admin') {
        return <Navigate to="/admin/dashboard" replace />;
      } else if (user.role === 'teacher') {
        return <Navigate to="/teacher/dashboard" replace />;
      } else {
        return <Navigate to="/chat" replace />;
      }
    }
  }

  return <>{children}</>;
};

/* Role-based redirect after login */
const RoleBasedRedirect: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect based on role
  if (user.role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  } else if (user.role === 'teacher') {
    return <Navigate to="/teacher/dashboard" replace />;
  } else {
    return <Navigate to="/chat" replace />;
  }
};

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <LanguageProvider>
          <Router>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/admin-login" element={<AdminLoginPage />} />

              {/* Root redirect based on role */}
              <Route path="/" element={<RoleBasedRedirect />} />

              {/* Student routes with MainLayout (Sidebar + Content) */}
              <Route
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <MainLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/chat" element={<ChatPage />} />
                <Route path="/chat/:courseId" element={<CourseDetailPage />} />
                <Route path="/course/:courseId" element={<CourseDetailPage />} />
                <Route path="/student/quiz/:quizId" element={<StudentQuizPage />} />
                <Route path="/quiz/:courseId" element={<StudentCourseQuizPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>

              {/* Admin routes with AdminLayout */}
              <Route
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
                <Route path="/admin/users" element={<AdminUsersPage />} />
                <Route path="/admin/courses" element={<AdminCoursesPage />} />
                <Route path="/admin/documents" element={<AdminDocumentsPage />} />
                <Route path="/admin/settings" element={<AdminSettingsPage />} />
              </Route>

              {/* Teacher routes with TeacherLayout */}
              <Route
                element={
                  <ProtectedRoute allowedRoles={['teacher']}>
                    <TeacherLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/teacher/dashboard" element={<TeacherDashboardPage />} />
                <Route path="/teacher/documents" element={<TeacherDocumentsPage />} />
                <Route path="/teacher/courses" element={<TeacherCoursesPage />} />
                <Route path="/teacher/quizzes" element={<TeacherQuizManagementPage />} />
                <Route path="/teacher/quizzes/:courseId" element={<TeacherQuizManagementPage />} />
                <Route path="/teacher/class-progress" element={<TeacherClassProgressPage />} />
              </Route>

              {/* Fallback redirect */}
              <Route path="*" element={<RoleBasedRedirect />} />
            </Routes>
          </Router>
        </LanguageProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
