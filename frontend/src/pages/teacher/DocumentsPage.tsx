import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { documentsAPI, coursesAPI } from '../../services/api';
import DataTable, { Column } from '../../components/admin/DataTable';
import UploadModal from '../../components/admin/UploadModal';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import {
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineArrowPath,
} from 'react-icons/hi2';

interface Document {
  id: number;
  title: string;
  file: string;
  file_type: string;
  course: number;
  is_processed: boolean;
  created_at: string;
}

interface Course {
  id: number;
  name: string;
  code: string;
}

const TeacherDocumentsPage: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [documents, setDocuments] = useState<Document[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [deleteDoc, setDeleteDoc] = useState<Document | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchDocuments();
    fetchCourses();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await documentsAPI.getAll();
      const data = res.data.results || res.data || [];
      setDocuments(data);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const res = await coursesAPI.myCourses();
      setCourses(res.data.results || res.data || []);
    } catch (err) {
      // Fallback to getAll if myCourses fails
      try {
        const res = await coursesAPI.getAll();
        setCourses(res.data.results || res.data || []);
      } catch {}
    }
  };

  const handleUpload = async (file: File, title: string, courseId: number) => {
    setIsUploading(true);
    try {
      await documentsAPI.upload(file, courseId, title);
      fetchDocuments();
    } catch (err) {
      console.error('Failed to upload:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDoc) return;
    setIsDeleting(true);
    try {
      await documentsAPI.delete(deleteDoc.id);
      setDeleteDoc(null);
      fetchDocuments();
    } catch (err) {
      console.error('Failed to delete:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleProcess = async (id: number) => {
    try {
      await documentsAPI.process(id);
      fetchDocuments();
    } catch (err) {
      console.error('Failed to process:', err);
    }
  };

  const columns: Column<Document>[] = [
    {
      key: 'title',
      label: 'Tiêu đề',
      sortable: true,
      render: (item) => {
        const typeColor: Record<string, string> = {
          pdf: isDark ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-600',
          docx: isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600',
          txt: isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600',
        };
        return (
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${typeColor[item.file_type] || typeColor.txt}`}>
              {item.file_type.toUpperCase()}
            </span>
            <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{item.title}</span>
          </div>
        );
      },
    },
    {
      key: 'course',
      label: 'Môn học',
      render: (item) => {
        const course = courses.find((c) => c.id === item.course);
        return course ? `${course.code} - ${course.name}` : '-';
      },
    },
    {
      key: 'is_processed',
      label: 'Trạng thái',
      render: (item) => (
        <div className="flex items-center gap-1">
          {item.is_processed ? (
            <>
              <HiOutlineCheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-xs text-green-500">Đã xử lý</span>
            </>
          ) : (
            <>
              <HiOutlineClock className="w-4 h-4 text-yellow-500" />
              <span className="text-xs text-yellow-500">Chờ xử lý</span>
            </>
          )}
        </div>
      ),
    },
    {
      key: 'created_at',
      label: 'Ngày upload',
      sortable: true,
      render: (item) => new Date(item.created_at).toLocaleDateString('vi-VN'),
    },
  ];

  const actions = (item: Document) => (
    <div className="flex items-center justify-end gap-2">
      {!item.is_processed && (
        <button
          onClick={(e) => { e.stopPropagation(); handleProcess(item.id); }}
          className={`p-1.5 rounded-lg transition-colors ${
            isDark ? 'hover:bg-gray-700 text-blue-400' : 'hover:bg-gray-100 text-blue-500'
          }`}
          title="Xử lý RAG"
        >
          <HiOutlineArrowPath className="w-4 h-4" />
        </button>
      )}
      <button
        onClick={(e) => { e.stopPropagation(); setDeleteDoc(item); }}
        className="p-1.5 rounded-lg transition-colors text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
      >
        <HiOutlineTrash className="w-4 h-4" />
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Tài liệu của tôi
        </h2>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors"
        >
          <HiOutlinePlus className="w-5 h-5" />
          Upload tài liệu
        </button>
      </div>

      <DataTable
        columns={columns}
        data={documents}
        keyField="id"
        searchPlaceholder="Tìm kiếm tài liệu..."
        searchFields={['title']}
        actions={actions}
        isLoading={loading}
        emptyMessage="Bạn chưa upload tài liệu nào"
      />

      {/* Upload Modal */}
      <UploadModal
        open={showUpload}
        onClose={() => setShowUpload(false)}
        onUpload={handleUpload}
        courses={courses}
        isLoading={isUploading}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteDoc}
        onCancel={() => setDeleteDoc(null)}
        onConfirm={handleDelete}
        title="Xóa tài liệu"
        message={`Bạn có chắc chắn muốn xóa tài liệu "${deleteDoc?.title}"?`}
        confirmText="Xóa"
        isLoading={isDeleting}
      />
    </div>
  );
};

export default TeacherDocumentsPage;
