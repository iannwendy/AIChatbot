import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { coursesAPI, usersAPI, documentsAPI } from '../../services/api';
import DataTable, { Column } from '../../components/admin/DataTable';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import ImportExcelModal from '../../components/admin/ImportExcelModal';
import AddStudentModal from '../../components/admin/AddStudentModal';
import UploadModal from '../../components/admin/UploadModal';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineDocumentText } from 'react-icons/hi2';

interface Course {
  id: number;
  name: string;
  code: string;
  description?: string;
  teacher?: number;
  teacher_name?: string;
  student_count?: number;
  document_count?: number;
  created_at: string;
}

interface Teacher {
  id: number;
  username?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
}

const AdminCoursesPage: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [deleteCourse, setDeleteCourse] = useState<Course | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modals
  const [importCourse, setImportCourse] = useState<Course | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [addStudentCourse, setAddStudentCourse] = useState<Course | null>(null);
  const [uploadDocCourse, setUploadDocCourse] = useState<Course | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({ name: '', code: '', description: '', teacher_id: 0 });

  useEffect(() => {
    fetchCourses();
    fetchTeachers();
  }, []);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const res = await coursesAPI.getAll();
      const data = res.data.results || res.data || [];
      // Transform data to include teacher_name
      const coursesWithTeacher = await Promise.all(data.map(async (course: any) => {
        let teacherName = 'Chưa gán';
        if (course.teacher) {
          try {
            const teacherRes = await usersAPI.getById(course.teacher);
            teacherName = teacherRes.data.full_name || `${teacherRes.data.first_name || ''} ${teacherRes.data.last_name || ''}`.trim() || teacherRes.data.username;
          } catch {}
        }
        return {
          ...course,
          teacher_name: teacherName,
          student_count: course.student_count || course.students?.length || 0,
          document_count: course.document_count || 0,
        };
      }));
      setCourses(coursesWithTeacher);
    } catch (err) {
      console.error('Failed to fetch courses:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const res = await usersAPI.getTeachers();
      setTeachers(res.data.results || res.data || []);
    } catch (err) {
      console.error('Failed to fetch teachers:', err);
    }
  };

  const handleSubmit = async () => {
    try {
      if (editingCourse) {
        await coursesAPI.update(editingCourse.id, formData);
      } else {
        await coursesAPI.create(formData);
      }
      setShowModal(false);
      setEditingCourse(null);
      setFormData({ name: '', code: '', description: '', teacher_id: 0 });
      fetchCourses();
    } catch (err) {
      console.error('Failed to save course:', err);
    }
  };

  const handleDeleteCourse = async () => {
    if (!deleteCourse) return;
    setIsDeleting(true);
    try {
      await coursesAPI.delete(deleteCourse.id);
      setDeleteCourse(null);
      fetchCourses();
    } catch (err) {
      console.error('Failed to delete course:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleImportStudents = async (file: File) => {
    if (!importCourse) return;
    setIsImporting(true);
    try {
      const res = await coursesAPI.importStudents(importCourse.id, file);
      alert(`Đã thêm ${res.data.total_added} sinh viên vào môn ${importCourse.name}`);
      setImportCourse(null);
      fetchCourses();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Import thất bại');
    } finally {
      setIsImporting(false);
    }
  };

  const handleUploadDocument = async (file: File, title: string, courseId: number) => {
    setIsUploading(true);
    try {
      await documentsAPI.upload(file, courseId, title);
      alert('Upload tài liệu thành công!');
      setUploadDocCourse(null);
      fetchCourses();
    } catch (err: any) {
      alert(err.response?.data?.error || err.response?.data?.file?.[0] || 'Upload thất bại');
    } finally {
      setIsUploading(false);
    }
  };

  const openEditModal = (course: Course) => {
    setEditingCourse(course);
    setFormData({
      name: course.name,
      code: course.code,
      description: course.description || '',
      teacher_id: course.teacher || 0,
    });
    setShowModal(true);
  };

  const openAddModal = () => {
    setEditingCourse(null);
    setFormData({ name: '', code: '', description: '', teacher_id: 0 });
    setShowModal(true);
  };

  const columns: Column<Course>[] = [
    {
      key: 'code',
      label: 'Mã môn',
      sortable: true,
      render: (item) => (
        <span className={`font-mono font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {item.code}
        </span>
      ),
    },
    {
      key: 'name',
      label: 'Tên môn học',
      sortable: true,
    },
    {
      key: 'teacher_name',
      label: 'Giáo viên',
      render: (item) => item.teacher_name || <span className="text-gray-400">Chưa gán</span>,
    },
    {
      key: 'student_count',
      label: 'Sinh viên',
      sortable: true,
      render: (item) => (
        <button
          onClick={(e) => { e.stopPropagation(); setAddStudentCourse(item); }}
          className={`px-2 py-1 text-xs rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors ${
            isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'
          }`}
          title="Quản lý sinh viên"
        >
          {item.student_count || 0}
        </button>
      ),
    },
    {
      key: 'document_count',
      label: 'Tài liệu',
      render: (item) => (
        <button
          onClick={(e) => { e.stopPropagation(); setUploadDocCourse(item); }}
          className={`flex items-center gap-1 px-2 py-1 text-xs rounded-full hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors ${
            isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-600'
          }`}
          title="Upload tài liệu"
        >
          <HiOutlineDocumentText className="w-3 h-3" />
          {item.document_count || 0}
        </button>
      ),
    },
    {
      key: 'created_at',
      label: 'Ngày tạo',
      sortable: true,
      render: (item) => item.created_at ? new Date(item.created_at).toLocaleDateString('vi-VN') : '-',
    },
  ];

  const actions = (item: Course) => (
    <div className="flex items-center justify-end gap-2">
      <button
        onClick={(e) => { e.stopPropagation(); openEditModal(item); }}
        className={`p-1.5 rounded-lg transition-colors ${
          isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
        }`}
      >
        <HiOutlinePencil className="w-4 h-4" />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); setDeleteCourse(item); }}
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
          Quản lý môn học
        </h2>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
        >
          <HiOutlinePlus className="w-5 h-5" />
          Thêm môn học
        </button>
      </div>

      <DataTable
        columns={columns}
        data={courses}
        keyField="id"
        searchPlaceholder="Tìm kiếm môn học..."
        searchFields={['name', 'code', 'teacher_name']}
        actions={actions}
        isLoading={loading}
        emptyMessage="Chưa có môn học nào"
      />

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className={`relative z-10 w-full max-w-md p-6 rounded-xl shadow-xl ${
            isDark ? 'bg-gray-800' : 'bg-white'
          }`}>
            <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {editingCourse ? 'Sửa môn học' : 'Thêm môn học mới'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Mã môn học *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="VD: CS101"
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${
                    isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Tên môn học *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="VD: Lập trình Cơ bản"
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${
                    isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Mô tả
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Mô tả môn học..."
                  rows={3}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${
                    isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Giáo viên phụ trách
                </label>
                <select
                  value={formData.teacher_id}
                  onChange={(e) => setFormData({ ...formData, teacher_id: Number(e.target.value) })}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${
                    isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                >
                  <option value={0}>-- Chọn giáo viên --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name || `${t.first_name || ''} ${t.last_name || ''}`.trim() || t.username}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className={`px-4 py-2 rounded-lg font-medium ${
                  isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Hủy
              </button>
              <button
                onClick={handleSubmit}
                disabled={!formData.name || !formData.code}
                className="px-4 py-2 rounded-lg font-medium bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
              >
                {editingCourse ? 'Lưu' : 'Thêm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteCourse}
        onCancel={() => setDeleteCourse(null)}
        onConfirm={handleDeleteCourse}
        title="Xóa môn học"
        message={`Bạn có chắc chắn muốn xóa môn học "${deleteCourse?.name}"? Hành động này không thể hoàn tác.`}
        confirmText="Xóa"
        isLoading={isDeleting}
      />

      {/* Import Students Modal */}
      <ImportExcelModal
        open={!!importCourse}
        onClose={() => setImportCourse(null)}
        onImport={handleImportStudents}
        title="Import sinh viên vào môn học"
        description={`Import danh sách sinh viên vào môn học "${importCourse?.name}"`}
        sampleColumns={['email', 'student_id', 'first_name', 'last_name']}
        isLoading={isImporting}
      />

      {/* Add Student Modal */}
      <AddStudentModal
        open={!!addStudentCourse}
        onClose={() => setAddStudentCourse(null)}
        courseId={addStudentCourse?.id || 0}
        courseName={addStudentCourse?.name || ''}
        onSuccess={fetchCourses}
        onImportClick={() => { setImportCourse(addStudentCourse); setAddStudentCourse(null); }}
      />

      {/* Upload Document Modal */}
      <UploadModal
        open={!!uploadDocCourse}
        onClose={() => setUploadDocCourse(null)}
        onUpload={handleUploadDocument}
        courses={uploadDocCourse ? [{ id: uploadDocCourse.id, name: uploadDocCourse.name, code: uploadDocCourse.code }] : []}
        isLoading={isUploading}
      />
    </div>
  );
};

export default AdminCoursesPage;
