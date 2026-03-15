import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { HiOutlineDocumentText, HiOutlineChatBubbleLeftRight, HiOutlineAcademicCap, HiOutlineArrowLeft, HiOutlineCheckCircle, HiOutlineClock } from 'react-icons/hi2';
import { coursesAPI, documentsAPI } from '../services/api';
import { useTheme } from '../context/ThemeContext';

interface Course {
  id: number;
  name: string;
  code: string;
  description?: string;
  teacher_name?: string;
  student_count?: number;
  document_count?: number;
}

interface Document {
  id: number;
  title: string;
  file_name: string;
  file_type: string;
  is_processed: boolean;
  created_at: string;
}

const CourseDetailPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [course, setCourse] = useState<Course | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (courseId) fetchData();
  }, [courseId]);

  const fetchData = async () => {
    try {
      const [courseRes, docsRes] = await Promise.all([
        coursesAPI.getById(Number(courseId)),
        documentsAPI.byCourse(Number(courseId)),
      ]);
      setCourse(courseRes.data);
      setDocuments(Array.isArray(docsRes.data) ? docsRes.data : []);
    } catch (err) {
      console.error('Failed to load course:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChat = () => {
    // Create a new chat session with this course
    navigate(`/chat?course=${courseId}`);
  };

  const handleNewChat = () => {
    // Navigate to chat without session - will create new session with course context
    navigate(`/chat?course=${courseId}`);
  };

  const getFileIcon = (fileType: string) => {
    return <HiOutlineDocumentText className="w-5 h-5" />;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-full ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className={`flex flex-col items-center justify-center h-full ${isDark ? 'bg-gray-900 text-gray-300' : 'bg-white text-gray-600'}`}>
        <p>Không tìm thấy môn học</p>
        <button
          onClick={() => navigate('/chat')}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Quay lại
        </button>
      </div>
    );
  }

  return (
    <div className={`flex-1 overflow-y-auto ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-4xl mx-auto p-6">
        {/* Back Button */}
        <button
          onClick={() => navigate('/chat')}
          className={`flex items-center gap-2 mb-6 text-sm ${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <HiOutlineArrowLeft className="w-4 h-4" />
          Quay lại danh sách môn học
        </button>

        {/* Course Header */}
        <div className={`rounded-xl p-6 mb-6 ${isDark ? 'bg-gray-800' : 'bg-white shadow-sm'}`}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                  isDark ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700'
                }`}>
                  {course.code}
                </span>
                {course.document_count !== undefined && (
                  <span className={`flex items-center gap-1 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    <HiOutlineDocumentText className="w-4 h-4" />
                    {course.document_count} tài liệu
                  </span>
                )}
              </div>
              <h1 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {course.name}
              </h1>
              {course.description && (
                <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {course.description}
                </p>
              )}
              {course.teacher_name && (
                <div className={`flex items-center gap-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  <HiOutlineAcademicCap className="w-4 h-4" />
                  Giảng viên: <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{course.teacher_name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleChat}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
            >
              <HiOutlineChatBubbleLeftRight className="w-5 h-5" />
              Chat với AI
            </button>
            <button
              onClick={() => navigate(`/quiz/${courseId}`)}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                isDark
                  ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <HiOutlineAcademicCap className="w-5 h-5" />
              Làm Quiz
            </button>
          </div>
        </div>

        {/* Documents Section */}
        <div className={`rounded-xl p-6 ${isDark ? 'bg-gray-800' : 'bg-white shadow-sm'}`}>
          <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Tài liệu môn học
          </h2>

          {documents.length === 0 ? (
            <div className={`text-center py-8 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              <HiOutlineDocumentText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Chưa có tài liệu nào được upload</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className={`flex items-center gap-4 p-4 rounded-lg ${
                    isDark ? 'bg-gray-700/50 hover:bg-gray-700' : 'bg-gray-50 hover:bg-gray-100'
                  } transition-colors`}
                >
                  <div className={`p-2 rounded-lg ${isDark ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                    {getFileIcon(doc.file_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {doc.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {doc.file_name}
                      </span>
                      <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        {formatDate(doc.created_at)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {doc.is_processed ? (
                      <span className="flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                        <HiOutlineCheckCircle className="w-3.5 h-3.5" />
                        Đã xử lý
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full">
                        <HiOutlineClock className="w-3.5 h-3.5" />
                        Chờ xử lý
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Help Text */}
        <div className={`mt-6 p-4 rounded-lg text-sm ${isDark ? 'bg-gray-800/50 text-gray-400' : 'bg-white/50 text-gray-500'}`}>
          <p>
            <strong>Mẹo:</strong> Bạn có thể hỏi AI về nội dung trong các tài liệu được đánh dấu "Đã xử lý".
            AI sẽ trích dẫn nguồn từ tài liệu gốc.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CourseDetailPage;
