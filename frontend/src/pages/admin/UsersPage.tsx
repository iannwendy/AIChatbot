import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { usersAPI } from '../../services/api';
import DataTable, { Column } from '../../components/admin/DataTable';
import ImportExcelModal from '../../components/admin/ImportExcelModal';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineArrowUpTray } from 'react-icons/hi2';

interface User {
  id: number;
  username: string;
  email: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  role: string;
  created_at?: string;
  student_id?: string;
  teacher_id?: string;
}

const AdminUsersPage: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = useState<'teachers' | 'students'>('teachers');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', email: '', role: '' });

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = activeTab === 'teachers'
        ? await usersAPI.getTeachers()
        : await usersAPI.getStudents();
      setUsers(res.data.results || res.data || []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUser) return;
    setIsDeleting(true);
    try {
      if (activeTab === 'teachers') {
        await usersAPI.deleteTeacher(deleteUser.id);
      } else {
        await usersAPI.deleteStudent(deleteUser.id);
      }
      setDeleteUser(null);
      fetchUsers();
    } catch (err) {
      console.error('Failed to delete user:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleImport = async (file: File) => {
    try {
      if (activeTab === 'teachers') {
        await usersAPI.importTeachers(file);
      } else {
        await usersAPI.importStudents(file);
      }
      fetchUsers();
    } catch (err) {
      console.error('Failed to import:', err);
    }
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setEditForm({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
      role: user.role,
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    setIsSaving(true);
    try {
      await usersAPI.updateUser(editingUser.id, {
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        email: editForm.email,
        role: editForm.role,
      });
      setShowEditModal(false);
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      console.error('Failed to update user:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const roleLabel: Record<string, string> = { admin: 'Admin', teacher: 'Giáo viên', student: 'Sinh viên' };

  const columns: Column<User>[] = [
    {
      key: 'full_name',
      label: 'Họ tên',
      sortable: true,
      render: (item) => (
        <div>
          <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {item.full_name || `${item.first_name || ''} ${item.last_name || ''}`.trim() || item.username}
          </p>
          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{item.username}</p>
        </div>
      ),
    },
    { key: 'email', label: 'Email', sortable: true },
    {
      key: 'role',
      label: 'Vai trò',
      render: (item) => {
        const c: Record<string, string> = {
          admin: isDark ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-600',
          teacher: isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-600',
          student: isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600',
        };
        return <span className={`px-2 py-1 text-xs rounded-full ${c[item.role] || c.student}`}>{roleLabel[item.role] || item.role}</span>;
      },
    },
    {
      key: 'created_at',
      label: 'Ngày tạo',
      sortable: true,
      render: (item) => item.created_at ? new Date(item.created_at).toLocaleDateString('vi-VN') : '-',
    },
  ];

  const actions = (item: User) => (
    <div className="flex items-center justify-end gap-2">
      <button
        onClick={(e) => { e.stopPropagation(); openEditModal(item); }}
        className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
      >
        <HiOutlinePencil className="w-4 h-4" />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); setDeleteUser(item); }}
        className="p-1.5 rounded-lg transition-colors text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
      >
        <HiOutlineTrash className="w-4 h-4" />
      </button>
    </div>
  );

  const inputCls = `w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
    isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
  }`;
  const labelCls = `block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Quản lý người dùng</h2>
        <div className="flex gap-2">
          <button onClick={() => setShowImportModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors">
            <HiOutlineArrowUpTray className="w-5 h-5" /> Import Excel
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors">
            <HiOutlinePlus className="w-5 h-5" /> Thêm mới
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className={`flex gap-2 p-1 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-100'} w-fit`}>
        {(['teachers', 'students'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${activeTab === tab ? 'bg-blue-500 text-white' : isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-200'}`}>
            {tab === 'teachers' ? 'Giáo viên' : 'Sinh viên'}
          </button>
        ))}
      </div>

      <DataTable columns={columns} data={users} keyField="id" searchPlaceholder="Tìm kiếm..." searchFields={['full_name', 'email', 'username']} actions={actions} isLoading={loading} emptyMessage={`Chưa có ${activeTab === 'teachers' ? 'giáo viên' : 'sinh viên'} nào`} />

      {/* Edit Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowEditModal(false)} />
          <div className={`relative z-10 w-full max-w-md p-6 rounded-xl shadow-xl ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Sửa thông tin: {editingUser.full_name || editingUser.username}
            </h2>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Họ</label>
                <input type="text" value={editForm.first_name} onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Tên</label>
                <input type="text" value={editForm.last_name} onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Vai trò</label>
                <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} className={inputCls}>
                  <option value="student">Sinh viên</option>
                  <option value="teacher">Giáo viên</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowEditModal(false)} className={`px-4 py-2 rounded-lg font-medium ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Hủy</button>
              <button onClick={handleSaveEdit} disabled={isSaving} className="px-4 py-2 rounded-lg font-medium bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50">
                {isSaving ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ImportExcelModal open={showImportModal} onClose={() => setShowImportModal(false)} onImport={handleImport}
        title={`Import ${activeTab === 'teachers' ? 'giáo viên' : 'sinh viên'} từ Excel`}
        description={`Upload file Excel chứa danh sách ${activeTab === 'teachers' ? 'giáo viên' : 'sinh viên'} cần thêm vào hệ thống.`}
        sampleColumns={activeTab === 'teachers' ? ['email', 'teacher_id', 'first_name', 'last_name'] : ['email', 'student_id', 'first_name', 'last_name']} />

      <ConfirmDialog open={!!deleteUser} onCancel={() => setDeleteUser(null)} onConfirm={handleDeleteUser}
        title="Xóa người dùng" message={`Bạn có chắc chắn muốn xóa ${deleteUser?.full_name || deleteUser?.username}? Hành động này không thể hoàn tác.`}
        confirmText="Xóa" isLoading={isDeleting} />
    </div>
  );
};

export default AdminUsersPage;
