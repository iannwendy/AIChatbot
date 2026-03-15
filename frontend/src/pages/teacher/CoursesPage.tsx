import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { coursesAPI, documentsAPI } from '../../services/api';
import DataTable, { Column } from '../../components/admin/DataTable';
import ImportExcelModal from '../../components/admin/ImportExcelModal';
import AddStudentModal from '../../components/admin/AddStudentModal';
import UploadModal from '../../components/admin/UploadModal';
import { HiOutlineUserGroup, HiOutlineDocumentText, HiOutlineCloudArrowUp } from 'react-icons/hi2';

interface Course {
  id: number;
  name: string;
  code: string;
  description?: string;
  students?: any[];
  documents?: any[];
  student_count?: number;
  document_count?: number;
  created_at: string;
}

const TeacherCoursesPage: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  // Modals
  const [importCourse, setImportCourse] = useState<Course | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [addStudentCourse, setAddStudentCourse] = useState<Course | null>(null);
  const [uploadDocCourse, setUploadDocCourse] = useState<Course | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const res = await coursesAPI.myCourses();
      const data = res.data.results || res.data || [];
      setCourses(data.map((c: any) => ({
        ...c,
        student_count: c.student_count || c.students?.length || 0,
        document_count: c.document_count || 0,
      })));
    } catch (err) {
      try {
        const res = await coursesAPI.getAll();
        const data = res.data.results || res.data || [];
        setCourses(data.map((c: any) => ({
          ...c,
          student_count: c.student_count || c.students?.length || 0,
          document_count: c.document_count || 0,
        })));
      } catch {}
    } finally {
      setLoading(false);
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
      key: 'student_count',
      label: 'Sinh viên',
      render: (item) => (
        <button
          onClick={(e) => { e.stopPropagation(); setAddStudentCourse(item); }}
          className="flex items-center gap-1 hover:text-blue-600 transition-colors"
          title="Quản lý sinh viên"
        >
          <HiOutlineUserGroup className="w-4 h-4 text-blue-500" />
          <span>{item.student_count || 0}</span>
        </button>
      ),
    },
    {
      key: 'document_count',
      label: 'Tài liệu',
      render: (item) => (
        <button
          onClick={(e) => { e.stopPropagation(); setUploadDocCourse(item); }}
          className="flex items-center gap-1 hover:text-green-600 transition-colors"
          title="Upload tài liệu"
        >
          <HiOutlineDocumentText className="w-4 h-4 text-green-500" />
          <span>{item.document_count || 0}</span>
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

  return (
    <div className="space-y-6">
      <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
        Môn học của tôi
      </h2>

      <DataTable
        columns={columns}
        data={courses}
        keyField="id"
        searchPlaceholder="Tìm kiếm môn học..."
        searchFields={['name', 'code']}
        isLoading={loading}
        emptyMessage="Bạn chưa được phân công môn học nào"
        onRowClick={(course) => setSelectedCourse(course)}
      />

      {/* Course Detail Modal */}
      {selectedCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedCourse(null)} />
          <div className={`relative z-10 w-full max-w-lg p-6 rounded-xl shadow-xl ${
            isDark ? 'bg-gray-800' : 'bg-white'
          }`}>
            <h2 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {selectedCourse.name}
            </h2>
            <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Mã môn: {selectedCourse.code}
            </p>

            {selectedCourse.description && (
              <p className={`text-sm mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                {selectedCourse.description}
              </p>
            )}

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Sinh viên</p>
                <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {selectedCourse.student_count || 0}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Tài liệu</p>
                <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {selectedCourse.document_count || 0}
                </p>
              </div>
            </div>

            {/* Student list */}
            {selectedCourse.students && selectedCourse.students.length > 0 && (
              <div>
                <h3 className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Danh sách sinh viên
                </h3>
                <div className={`max-h-48 overflow-y-auto rounded-lg border ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
                  {selectedCourse.students.map((student: any, idx: number) => (
                    <div
                      key={idx}
                      className={`flex items-center justify-between px-3 py-2 ${
                        idx > 0 ? `border-t ${isDark ? 'border-gray-600' : 'border-gray-200'}` : ''
                      }`}
                    >
                      <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        {student.full_name || student.username || student.email || `Sinh viên ${idx + 1}`}
                      </span>
                      <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {student.email}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setImportCourse(selectedCourse); setSelectedCourse(null); }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors"
              >
                <HiOutlineCloudArrowUp className="w-4 h-4" />
                Import sinh viên
              </button>
              <button
                onClick={() => setSelectedCourse(null)}
                className={`px-4 py-2 rounded-lg font-medium ${
                  isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

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

export default TeacherCoursesPage;
