import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { documentsAPI } from '../../services/api';
import { HiOutlineCloudArrowUp, HiOutlineXMark, HiOutlineDocumentText, HiOutlineTrash } from 'react-icons/hi2';
import ConfirmDialog from './ConfirmDialog';

interface Document {
  id: number;
  title: string;
  file: string;
  file_type: string;
  is_processed: boolean;
  created_at: string;
}

interface Course {
  id: number;
  name: string;
  code: string;
}

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  onUpload: (file: File, title: string, courseId: number) => Promise<void>;
  // New mode: single course (from CoursesPage)
  courseId?: number;
  courseName?: string;
  courseCode?: string;
  // Old mode: multiple courses (from DocumentsPage)
  courses?: Course[];
  isLoading?: boolean;
}

const ACCEPTED_TYPES = '.pdf,.docx,.txt';

const UploadModal: React.FC<UploadModalProps> = ({
  open,
  onClose,
  onUpload,
  courseId: propCourseId,
  courseName: propCourseName,
  courseCode: propCourseCode,
  courses: propCourses,
  isLoading
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const fileRef = useRef<HTMLInputElement>(null);

  // Determine mode based on props
  const isSingleCourseMode = !!propCourseId;
  const courses = propCourses || [];

  // State
  const [selectedCourseId, setSelectedCourseId] = useState<number>(propCourseId || 0);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [deleteDocId, setDeleteDocId] = useState<number | null>(null);

  // Get current course info
  const currentCourseId = isSingleCourseMode ? propCourseId! : selectedCourseId;
  const currentCourse = courses.find(c => c.id === currentCourseId);
  const currentCourseName = isSingleCourseMode ? propCourseName : currentCourse?.name || '';
  const currentCourseCode = isSingleCourseMode ? propCourseCode : currentCourse?.code || '';

  // Load documents when course changes
  useEffect(() => {
    if (open && currentCourseId) {
      loadDocuments();
    }
  }, [open, currentCourseId]);

  // Reset selected course when modal opens in single mode
  useEffect(() => {
    if (open && propCourseId) {
      setSelectedCourseId(propCourseId);
    }
  }, [open, propCourseId]);

  const loadDocuments = async () => {
    if (!currentCourseId) return;
    setLoadingDocs(true);
    try {
      const res = await documentsAPI.byCourse(currentCourseId);
      setDocuments(res.data || []);
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) {
      setFile(dropped);
      if (!title) setTitle(dropped.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      if (!title) setTitle(selected.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleCourseChange = (newCourseId: number) => {
    setSelectedCourseId(newCourseId);
    setFile(null);
    setTitle('');
  };

  const handleSubmit = async () => {
    if (!file || !title || !currentCourseId) return;
    await onUpload(file, title, currentCourseId);
    setFile(null);
    setTitle('');
    loadDocuments();
  };

  const handleDelete = (docId: number) => {
    setDeleteDocId(docId);
  };

  const confirmDelete = async () => {
    if (!deleteDocId) return;
    setDeleting(deleteDocId);
    try {
      await documentsAPI.delete(deleteDocId);
      setDocuments(documents.filter(d => d.id !== deleteDocId));
      setDeleteDocId(null);
    } catch (err) {
      alert('Xóa thất bại');
    } finally {
      setDeleting(null);
    }
  };

  const resetAndClose = () => {
    setFile(null);
    setTitle('');
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={resetAndClose} />
      <div className={`relative z-10 w-full max-w-2xl p-6 rounded-xl shadow-xl max-h-[85vh] flex flex-col ${
        isDark ? 'bg-gray-800' : 'bg-white'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {isSingleCourseMode ? 'Quản lý tài liệu' : 'Upload tài liệu'}
            </h2>
            {isSingleCourseMode && (
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {currentCourseCode} - {currentCourseName}
              </p>
            )}
          </div>
          <button onClick={resetAndClose} className={`p-1 rounded-lg ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
            <HiOutlineXMark className="w-5 h-5" />
          </button>
        </div>

        {/* Course selector for multi-course mode */}
        {!isSingleCourseMode && (
          <div className="mb-4">
            <select
              value={selectedCourseId}
              onChange={(e) => handleCourseChange(Number(e.target.value))}
              className={`w-full px-3 py-2 rounded-lg border text-sm ${
                isDark
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            >
              <option value={0}>-- Chọn môn học --</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Existing documents */}
        {currentCourseId ? (
          <div className="mb-4">
            <h3 className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              <HiOutlineDocumentText className="w-4 h-4 inline mr-1" />
              Tài liệu đã upload ({documents.length})
            </h3>
            <div className={`max-h-48 overflow-y-auto rounded-lg border ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
              {loadingDocs ? (
                <div className={`p-4 text-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Đang tải...
                </div>
              ) : documents.length === 0 ? (
                <div className={`p-4 text-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Chưa có tài liệu nào
                </div>
              ) : (
                documents.map((doc, idx) => (
                  <div
                    key={doc.id}
                    className={`flex items-center justify-between px-3 py-2 ${
                      idx > 0 ? `border-t ${isDark ? 'border-gray-600' : 'border-gray-200'}` : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className={`text-xs px-1.5 py-0.5 rounded font-mono uppercase ${
                        isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {doc.file_type}
                      </span>
                      <span className={`text-sm truncate ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        {doc.title}
                      </span>
                      {doc.is_processed && (
                        <span className={`text-xs px-1.5 py-0.5 rounded ${isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-600'}`}>
                          RAG
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        {new Date(doc.created_at).toLocaleDateString('vi-VN')}
                      </span>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        disabled={deleting === doc.id}
                        className="p-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                      >
                        <HiOutlineTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className={`p-8 text-center rounded-lg border border-dashed ${isDark ? 'border-gray-600 text-gray-400' : 'border-gray-300 text-gray-500'}`}>
            Vui lòng chọn môn học để xem tài liệu
          </div>
        )}

        {/* Upload section */}
        {currentCourseId && (
          <div className={`pt-4 border-t ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
            <h3 className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Upload tài liệu mới
            </h3>

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                dragOver
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : isDark
                    ? 'border-gray-600 hover:border-gray-500'
                    : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <HiOutlineCloudArrowUp className={`w-8 h-8 mx-auto mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              {file ? (
                <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{file.name}</p>
              ) : (
                <>
                  <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    Kéo thả file vào đây hoặc click để chọn
                  </p>
                  <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    PDF, DOCX, TXT (tối đa 50MB)
                  </p>
                </>
              )}
              <input ref={fileRef} type="file" accept={ACCEPTED_TYPES} onChange={handleFileChange} className="hidden" />
            </div>

            {/* Title */}
            {file && (
              <div className="mt-3">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Tiêu đề tài liệu..."
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${
                    isDark
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>
            )}

            {/* Upload button */}
            {file && (
              <div className="flex justify-end mt-3">
                <button
                  onClick={handleSubmit}
                  disabled={!file || !title || isLoading}
                  className="px-4 py-2 rounded-lg font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {isLoading ? 'Đang upload...' : 'Upload'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteDocId}
        onCancel={() => setDeleteDocId(null)}
        onConfirm={confirmDelete}
        title="Xóa tài liệu"
        message="Bạn có chắc muốn xóa tài liệu này?"
        confirmText="Xóa"
        isLoading={!!deleting}
      />
    </div>
  );
};

export default UploadModal;
