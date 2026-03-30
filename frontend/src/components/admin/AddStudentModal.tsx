// import React, { useState, useEffect, useRef } from 'react';
// import { useTheme } from '../../context/ThemeContext';
// import { usersAPI, coursesAPI } from '../../services/api';
// import { HiOutlineXMark, HiOutlinePlus, HiOutlineMagnifyingGlass, HiOutlineUserGroup, HiOutlineCloudArrowUp } from 'react-icons/hi2';

// interface Student {
//   id: number;
//   email: string;
//   username?: string;
//   first_name?: string;
//   last_name?: string;
//   full_name?: string;
// }

// interface AddStudentModalProps {
//   open: boolean;
//   onClose: () => void;
//   courseId: number;
//   courseName: string;
//   onSuccess: () => void;
//   onImportClick?: () => void;
// }

// const AddStudentModal: React.FC<AddStudentModalProps> = ({
//   open,
//   onClose,
//   courseId,
//   courseName,
//   onSuccess,
//   onImportClick,
// }) => {
//   const { theme } = useTheme();
//   const isDark = theme === 'dark';
//   const [searchQuery, setSearchQuery] = useState('');
//   const [students, setStudents] = useState<Student[]>([]);
//   const [enrolledStudents, setEnrolledStudents] = useState<Student[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [enrolling, setEnrolling] = useState(false);
//   const searchTimeoutRef = useRef<NodeJS.Timeout>();

//   // Load enrolled students when modal opens
//   useEffect(() => {
//     if (open && courseId) {
//       loadEnrolledStudents();
//     }
//   }, [open, courseId]);

//   const loadEnrolledStudents = async () => {
//     try {
//       const res = await coursesAPI.getById(courseId);
//       const course = res.data;
//       // Store full student objects, not just IDs
//       const enrolled = course.students || [];
//       setEnrolledStudents(enrolled);
//     } catch (err) {
//       console.error('Failed to load enrolled students:', err);
//     }
//   };

//   const searchStudents = async (query: string) => {
//     if (!query.trim()) {
//       setStudents([]);
//       return;
//     }
//     setLoading(true);
//     try {
//       const res = await usersAPI.getStudents();
//       let allStudents = res.data.results || res.data || [];
//       // Filter by search query (email, username, name)
//       const filtered = allStudents.filter((s: Student) => {
//         const searchLower = query.toLowerCase();
//         return (
//           s.email?.toLowerCase().includes(searchLower) ||
//           s.username?.toLowerCase().includes(searchLower) ||
//           s.full_name?.toLowerCase().includes(searchLower) ||
//           `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase().includes(searchLower)
//         );
//       });
//       setStudents(filtered.slice(0, 10)); // Limit to 10 results
//     } catch (err) {
//       console.error('Failed to search students:', err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleSearchChange = (value: string) => {
//     setSearchQuery(value);
//     // Debounce search
//     if (searchTimeoutRef.current) {
//       clearTimeout(searchTimeoutRef.current);
//     }
//     searchTimeoutRef.current = setTimeout(() => {
//       searchStudents(value);
//     }, 300);
//   };

//   const handleEnrollStudent = async (studentId: number, student?: Student) => {
//     setEnrolling(true);
//     try {
//       await coursesAPI.enroll(courseId, [studentId]);
//       // Add student to enrolled list
//       if (student) {
//         setEnrolledStudents([...enrolledStudents, student]);
//       } else {
//         // If student object not provided, reload the list
//         await loadEnrolledStudents();
//       }
//       onSuccess();
//     } catch (err: any) {
//       alert(err.response?.data?.error || 'Failed to enroll student');
//     } finally {
//       setEnrolling(false);
//     }
//   };

//   const handleUnenrollStudent = async (studentId: number) => {
//     setEnrolling(true);
//     try {
//       await coursesAPI.unenroll(courseId, [studentId]);
//       setEnrolledStudents(enrolledStudents.filter(s => s.id !== studentId));
//       onSuccess();
//     } catch (err: any) {
//       alert(err.response?.data?.error || 'Failed to remove student');
//     } finally {
//       setEnrolling(false);
//     }
//   };

//   const resetAndClose = () => {
//     setSearchQuery('');
//     setStudents([]);
//     setEnrolledStudents([]);
//     onClose();
//   };

//   if (!open) return null;

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center">
//       <div className="absolute inset-0 bg-black/50" onClick={resetAndClose} />
//       <div className={`relative z-10 w-full max-w-2xl p-6 rounded-xl shadow-xl max-h-[80vh] flex flex-col ${
//         isDark ? 'bg-gray-800' : 'bg-white'
//       }`}>
//         {/* Header */}
//         <div className="flex items-center justify-between mb-4">
//           <div>
//             <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
//               Quản lý sinh viên
//             </h2>
//             <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
//               {courseName}
//             </p>
//           </div>
//           <button onClick={resetAndClose} className={`p-1 rounded-lg ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
//             <HiOutlineXMark className="w-5 h-5" />
//           </button>
//         </div>

//         {/* Search */}
//         <div className="relative mb-4">
//           <HiOutlineMagnifyingGlass className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
//           <input
//             type="text"
//             value={searchQuery}
//             onChange={(e) => handleSearchChange(e.target.value)}
//             placeholder="Tìm kiếm sinh viên theo email, tên..."
//             className={`w-full pl-10 pr-4 py-2 rounded-lg border text-sm ${
//               isDark
//                 ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
//                 : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
//             } focus:outline-none focus:ring-2 focus:ring-blue-500`}
//           />
//         </div>

//         {/* Enrolled students section */}
//         {enrolledStudents.length > 0 && (
//           <div className="mb-4">
//             <h3 className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
//               <HiOutlineUserGroup className="w-4 h-4 inline mr-1" />
//               Đã tham gia ({enrolledStudents.length})
//             </h3>
//             <div className={`max-h-32 overflow-y-auto rounded-lg border ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
//               {enrolledStudents.map((student, idx) => (
//                 <div
//                   key={student.id}
//                   className={`flex items-center justify-between px-3 py-2 ${
//                     idx > 0 ? `border-t ${isDark ? 'border-gray-600' : 'border-gray-200'}` : ''
//                   }`}
//                 >
//                   <div>
//                     <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
//                       {student.full_name || `${student.first_name || ''} ${student.last_name || ''}`.trim() || student.username}
//                     </span>
//                     <span className={`text-xs ml-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
//                       {student.email}
//                     </span>
//                   </div>
//                   <button
//                     onClick={() => handleUnenrollStudent(student.id)}
//                     disabled={enrolling}
//                     className="text-xs text-red-500 hover:text-red-600 disabled:opacity-50"
//                   >
//                     Xóa
//                   </button>
//                 </div>
//               ))}
//             </div>
//           </div>
//         )}

//         {/* Search results */}
//         <div className="flex-1 overflow-hidden">
//           <h3 className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
//             Tìm kiếm sinh viên
//           </h3>
//           <div className={`max-h-48 overflow-y-auto rounded-lg border ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
//             {loading ? (
//               <div className={`p-4 text-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
//                 Đang tìm kiếm...
//               </div>
//             ) : students.length === 0 ? (
//               <div className={`p-4 text-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
//                 {searchQuery ? 'Không tìm thấy sinh viên' : 'Nhập email hoặc tên để tìm kiếm'}
//               </div>
//             ) : (
//               students.map((student, idx) => {
//                 // Check by ID since enrolledStudents is now array of objects
//                 const isEnrolled = enrolledStudents.some(e => e.id === student.id);
//                 return (
//                   <div
//                     key={student.id}
//                     className={`flex items-center justify-between px-3 py-2 ${
//                       idx > 0 ? `border-t ${isDark ? 'border-gray-600' : 'border-gray-200'}` : ''
//                     }`}
//                   >
//                     <div>
//                       <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
//                         {student.full_name || `${student.first_name || ''} ${student.last_name || ''}`.trim() || student.username}
//                       </span>
//                       <span className={`text-xs ml-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
//                         {student.email}
//                       </span>
//                     </div>
//                     {isEnrolled ? (
//                       <span className={`text-xs px-2 py-1 rounded ${isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-600'}`}>
//                         Đã tham gia
//                       </span>
//                     ) : (
//                       <button
//                         onClick={() => handleEnrollStudent(student.id, student)}
//                         disabled={enrolling}
//                         className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
//                       >
//                         <HiOutlinePlus className="w-3 h-3" />
//                         Thêm
//                       </button>
//                     )}
//                   </div>
//                 );
//               })
//             )}
//           </div>
//         </div>

//         {/* Import button */}
//         {onImportClick && (
//           <div className="mt-4 pt-4 border-t border-gray-600">
//             <button
//               onClick={() => { onClose(); onImportClick(); }}
//               className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium bg-green-500 text-white hover:bg-green-600 transition-colors"
//             >
//               <HiOutlineCloudArrowUp className="w-4 h-4" />
//               Import danh sách từ file CSV/Excel
//             </button>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default AddStudentModal;

import React, { useState, useEffect, useRef } from "react";
import { useTheme } from "../../context/ThemeContext";
import { usersAPI, coursesAPI } from "../../services/api";
import {
  HiOutlineXMark,
  HiOutlinePlus,
  HiOutlineMagnifyingGlass,
  HiOutlineUserGroup,
  HiOutlineCloudArrowUp,
} from "react-icons/hi2";

interface Student {
  id: number;
  email: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
}

interface AddStudentModalProps {
  open: boolean;
  onClose: () => void;
  courseId: number;
  courseName: string;
  onSuccess: () => void;
  onImportClick?: () => void;
}

const AddStudentModal: React.FC<AddStudentModalProps> = ({
  open,
  onClose,
  courseId,
  courseName,
  onSuccess,
  onImportClick,
}) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [searchQuery, setSearchQuery] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Load enrolled students when modal opens
  useEffect(() => {
    if (open && courseId) {
      loadEnrolledStudents();
    }
  }, [open, courseId]);

  const loadEnrolledStudents = async () => {
    try {
      const res = await coursesAPI.getById(courseId);
      const course = res.data;
      // Store full student objects, not just IDs
      const enrolled = course.students || [];
      setEnrolledStudents(enrolled);
    } catch (err) {
      console.error("Failed to load enrolled students:", err);
    }
  };

  const searchStudents = async (query: string) => {
    if (!query.trim()) {
      setStudents([]);
      return;
    }
    setLoading(true);
    try {
      const res = await usersAPI.getStudents();
      let allStudents = res.data.results || res.data || [];
      // Filter by search query (email, username, name)
      const filtered = allStudents.filter((s: Student) => {
        const searchLower = query.toLowerCase();
        return (
          s.email?.toLowerCase().includes(searchLower) ||
          s.username?.toLowerCase().includes(searchLower) ||
          s.full_name?.toLowerCase().includes(searchLower) ||
          `${s.first_name || ""} ${s.last_name || ""}`
            .toLowerCase()
            .includes(searchLower)
        );
      });
      setStudents(filtered.slice(0, 10)); // Limit to 10 results
    } catch (err) {
      console.error("Failed to search students:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      searchStudents(value);
    }, 300);
  };

  const handleEnrollStudent = async (studentId: number, student?: Student) => {
    setEnrolling(true);
    try {
      await coursesAPI.enroll(courseId, [studentId]);
      // Add student to enrolled list
      if (student) {
        setEnrolledStudents([...enrolledStudents, student]);
      } else {
        // If student object not provided, reload the list
        await loadEnrolledStudents();
      }
      onSuccess();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to enroll student");
    } finally {
      setEnrolling(false);
    }
  };

  const handleUnenrollStudent = async (studentId: number) => {
    setEnrolling(true);
    try {
      await coursesAPI.unenroll(courseId, [studentId]);
      setEnrolledStudents(enrolledStudents.filter((s) => s.id !== studentId));
      onSuccess();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to remove student");
    } finally {
      setEnrolling(false);
    }
  };

  const resetAndClose = () => {
    setSearchQuery("");
    setStudents([]);
    setEnrolledStudents([]);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={resetAndClose} />
      <div
        className={`relative z-10 w-full max-w-2xl p-6 rounded-xl shadow-xl max-h-[80vh] flex flex-col ${
          isDark ? "bg-gray-800" : "bg-white"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2
              className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}
            >
              Quản lý sinh viên
            </h2>
            <p
              className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}
            >
              {courseName}
            </p>
          </div>
          <button
            onClick={resetAndClose}
            className={`p-1 rounded-lg ${isDark ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
          >
            <HiOutlineXMark className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <HiOutlineMagnifyingGlass
            className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? "text-gray-400" : "text-gray-500"}`}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Tìm kiếm sinh viên theo email, tên..."
            className={`w-full pl-10 pr-4 py-2 rounded-lg border text-sm ${
              isDark
                ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
        </div>

        {/* Enrolled students section */}
        {enrolledStudents.length > 0 && (
          <div className="mb-4">
            <h3
              className={`text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
            >
              <HiOutlineUserGroup className="w-4 h-4 inline mr-1" />
              Đã tham gia ({enrolledStudents.length})
            </h3>
            <div
              className={`max-h-32 overflow-y-auto rounded-lg border ${isDark ? "border-gray-600" : "border-gray-200"}`}
            >
              {enrolledStudents.map((student, idx) => (
                <div
                  key={student.id}
                  className={`flex items-center justify-between px-3 py-2 ${
                    idx > 0
                      ? `border-t ${isDark ? "border-gray-600" : "border-gray-200"}`
                      : ""
                  }`}
                >
                  <div>
                    <span
                      className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}
                    >
                      {student.full_name ||
                        `${student.first_name || ""} ${student.last_name || ""}`.trim() ||
                        student.username}
                    </span>
                    <span
                      className={`text-xs ml-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}
                    >
                      {student.email}
                    </span>
                  </div>
                  <button
                    onClick={() => handleUnenrollStudent(student.id)}
                    disabled={enrolling}
                    className="text-xs text-red-500 hover:text-red-600 disabled:opacity-50"
                  >
                    Xóa
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search results */}
        <div className="flex-1 overflow-hidden">
          <h3
            className={`text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
          >
            Tìm kiếm sinh viên
          </h3>
          <div
            className={`max-h-48 overflow-y-auto rounded-lg border ${isDark ? "border-gray-600" : "border-gray-200"}`}
          >
            {loading ? (
              <div
                className={`p-4 text-center text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}
              >
                Đang tìm kiếm...
              </div>
            ) : students.length === 0 ? (
              <div
                className={`p-4 text-center text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}
              >
                {searchQuery
                  ? "Không tìm thấy sinh viên"
                  : "Nhập email hoặc tên để tìm kiếm"}
              </div>
            ) : (
              students.map((student, idx) => {
                // Check by ID since enrolledStudents is now array of objects
                const isEnrolled = enrolledStudents.some(
                  (e) => e.id === student.id,
                );
                return (
                  <div
                    key={student.id}
                    className={`flex items-center justify-between px-3 py-2 ${
                      idx > 0
                        ? `border-t ${isDark ? "border-gray-600" : "border-gray-200"}`
                        : ""
                    }`}
                  >
                    <div>
                      <span
                        className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}
                      >
                        {student.full_name ||
                          `${student.first_name || ""} ${student.last_name || ""}`.trim() ||
                          student.username}
                      </span>
                      <span
                        className={`text-xs ml-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}
                      >
                        {student.email}
                      </span>
                    </div>
                    {isEnrolled ? (
                      <span
                        className={`text-xs px-2 py-1 rounded ${isDark ? "bg-green-900/30 text-green-400" : "bg-green-50 text-green-600"}`}
                      >
                        Đã tham gia
                      </span>
                    ) : (
                      <button
                        onClick={() => handleEnrollStudent(student.id, student)}
                        disabled={enrolling}
                        className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
                      >
                        <HiOutlinePlus className="w-3 h-3" />
                        Thêm
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Import button */}
        {onImportClick && (
          <div className="mt-4 pt-4 border-t border-gray-600">
            <button
              onClick={() => {
                onClose();
                onImportClick();
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium bg-green-500 text-white hover:bg-green-600 transition-colors"
            >
              <HiOutlineCloudArrowUp className="w-4 h-4" />
              Import danh sách từ file CSV/Excel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddStudentModal;
