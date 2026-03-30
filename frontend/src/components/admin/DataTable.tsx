// import React, { useState, useMemo } from 'react';
// import { useTheme } from '../../context/ThemeContext';
// import { HiOutlineMagnifyingGlass, HiOutlineChevronLeft, HiOutlineChevronRight } from 'react-icons/hi2';

// export interface Column<T> {
//   key: string;
//   label: string;
//   render?: (item: T) => React.ReactNode;
//   sortable?: boolean;
// }

// interface DataTableProps<T> {
//   columns: Column<T>[];
//   data: T[];
//   keyField: keyof T;
//   searchPlaceholder?: string;
//   searchFields?: (keyof T)[];
//   actions?: (item: T) => React.ReactNode;
//   pageSize?: number;
//   emptyMessage?: string;
//   isLoading?: boolean;
//   onRowClick?: (item: T) => void;
// }

// function DataTable<T extends Record<string, any>>({
//   columns,
//   data,
//   keyField,
//   searchPlaceholder = 'Tìm kiếm...',
//   searchFields = [],
//   actions,
//   pageSize = 10,
//   emptyMessage = 'Không có dữ liệu',
//   isLoading = false,
//   onRowClick,
// }: DataTableProps<T>) {
//   const { theme } = useTheme();
//   const isDark = theme === 'dark';

//   const [search, setSearch] = useState('');
//   const [currentPage, setCurrentPage] = useState(1);
//   const [sortKey, setSortKey] = useState<string | null>(null);
//   const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

//   // Filter data
//   const filteredData = useMemo(() => {
//     if (!search.trim()) return data;
//     const searchLower = search.toLowerCase();
//     return data.filter((item) => {
//       return searchFields.some((field) => {
//         const value = item[field];
//         return value && String(value).toLowerCase().includes(searchLower);
//       });
//     });
//   }, [data, search, searchFields]);

//   // Sort data
//   const sortedData = useMemo(() => {
//     if (!sortKey) return filteredData;
//     return [...filteredData].sort((a, b) => {
//       const aVal = a[sortKey];
//       const bVal = b[sortKey];
//       if (aVal === bVal) return 0;
//       if (aVal === null || aVal === undefined) return 1;
//       if (bVal === null || bVal === undefined) return -1;
//       const cmp = aVal < bVal ? -1 : 1;
//       return sortDir === 'asc' ? cmp : -cmp;
//     });
//   }, [filteredData, sortKey, sortDir]);

//   // Paginate
//   const totalPages = Math.ceil(sortedData.length / pageSize);
//   const paginatedData = sortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

//   const handleSort = (key: string) => {
//     if (sortKey === key) {
//       setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
//     } else {
//       setSortKey(key);
//       setSortDir('asc');
//     }
//   };

//   if (isLoading) {
//     return (
//       <div className="animate-pulse">
//         <div className={`h-10 rounded mb-4 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
//         <div className={`h-64 rounded ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`} />
//       </div>
//     );
//   }

//   return (
//     <div className={`rounded-xl overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
//       {/* Search */}
//       {searchFields.length > 0 && (
//         <div className="p-4 border-b border-gray-700">
//           <div className="relative max-w-sm">
//             <HiOutlineMagnifyingGlass className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
//             <input
//               type="text"
//               value={search}
//               onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
//               placeholder={searchPlaceholder}
//               className={`w-full pl-10 pr-4 py-2 rounded-lg border text-sm ${
//                 isDark
//                   ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
//                   : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
//               } focus:outline-none focus:ring-2 focus:ring-blue-500`}
//             />
//           </div>
//         </div>
//       )}

//       {/* Table */}
//       <div className="overflow-x-auto">
//         <table className="w-full">
//           <thead className={isDark ? 'bg-gray-700' : 'bg-gray-50'}>
//             <tr>
//               {columns.map((col) => (
//                 <th
//                   key={col.key}
//                   onClick={() => col.sortable && handleSort(col.key)}
//                   className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${
//                     col.sortable ? 'cursor-pointer hover:bg-gray-600' : ''
//                   } ${isDark ? 'text-gray-300' : 'text-gray-500'}`}
//                 >
//                   <div className="flex items-center gap-1">
//                     {col.label}
//                     {col.sortable && sortKey === col.key && (
//                       <span className="text-blue-500">{sortDir === 'asc' ? '↑' : '↓'}</span>
//                     )}
//                   </div>
//                 </th>
//               ))}
//               {actions && (
//                 <th className={`px-4 py-3 text-right text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
//                   Thao tác
//                 </th>
//               )}
//             </tr>
//           </thead>
//           <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
//             {paginatedData.length === 0 ? (
//               <tr>
//                 <td colSpan={columns.length + (actions ? 1 : 0)} className={`px-4 py-8 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
//                   {emptyMessage}
//                 </td>
//               </tr>
//             ) : (
//               paginatedData.map((item) => (
//                 <tr
//                   key={String(item[keyField])}
//                   onClick={() => onRowClick?.(item)}
//                   className={`transition-colors ${onRowClick ? 'cursor-pointer' : ''} ${
//                     isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
//                   }`}
//                 >
//                   {columns.map((col) => (
//                     <td key={col.key} className={`px-4 py-3 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
//                       {col.render ? col.render(item) : item[col.key]}
//                     </td>
//                   ))}
//                   {actions && (
//                     <td className="px-4 py-3 text-right">
//                       {actions(item)}
//                     </td>
//                   )}
//                 </tr>
//               ))
//             )}
//           </tbody>
//         </table>
//       </div>

//       {/* Pagination */}
//       {totalPages > 1 && (
//         <div className={`flex items-center justify-between px-4 py-3 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
//           <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
//             Hiển thị {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, sortedData.length)} của {sortedData.length}
//           </div>
//           <div className="flex items-center gap-2">
//             <button
//               onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
//               disabled={currentPage === 1}
//               className={`p-2 rounded-lg transition-colors ${
//                 currentPage === 1
//                   ? 'opacity-50 cursor-not-allowed'
//                   : isDark
//                     ? 'hover:bg-gray-700'
//                     : 'hover:bg-gray-100'
//               }`}
//             >
//               <HiOutlineChevronLeft className="w-5 h-5" />
//             </button>
//             {Array.from({ length: totalPages }, (_, i) => i + 1)
//               .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
//               .map((page, idx, arr) => (
//                 <React.Fragment key={page}>
//                   {idx > 0 && arr[idx - 1] !== page - 1 && (
//                     <span className={`px-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>...</span>
//                   )}
//                   <button
//                     onClick={() => setCurrentPage(page)}
//                     className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
//                       currentPage === page
//                         ? 'bg-blue-500 text-white'
//                         : isDark
//                           ? 'hover:bg-gray-700'
//                           : 'hover:bg-gray-100'
//                     }`}
//                   >
//                     {page}
//                   </button>
//                 </React.Fragment>
//               ))}
//             <button
//               onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
//               disabled={currentPage === totalPages}
//               className={`p-2 rounded-lg transition-colors ${
//                 currentPage === totalPages
//                   ? 'opacity-50 cursor-not-allowed'
//                   : isDark
//                     ? 'hover:bg-gray-700'
//                     : 'hover:bg-gray-100'
//               }`}
//             >
//               <HiOutlineChevronRight className="w-5 h-5" />
//             </button>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// export default DataTable;

import React, { useState, useMemo } from "react";
import { useTheme } from "../../context/ThemeContext";
import {
  HiOutlineMagnifyingGlass,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
} from "react-icons/hi2";

export interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  searchPlaceholder?: string;
  searchFields?: (keyof T)[];
  actions?: (item: T) => React.ReactNode;
  pageSize?: number;
  emptyMessage?: string;
  isLoading?: boolean;
  onRowClick?: (item: T) => void;
}

function DataTable<T extends Record<string, any>>({
  columns,
  data,
  keyField,
  searchPlaceholder = "Tìm kiếm...",
  searchFields = [],
  actions,
  pageSize = 10,
  emptyMessage = "Không có dữ liệu",
  isLoading = false,
  onRowClick,
}: DataTableProps<T>) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Filter data
  const filteredData = useMemo(() => {
    if (!search.trim()) return data;
    const searchLower = search.toLowerCase();
    return data.filter((item) => {
      return searchFields.some((field) => {
        const value = item[field];
        return value && String(value).toLowerCase().includes(searchLower);
      });
    });
  }, [data, search, searchFields]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      const cmp = aVal < bVal ? -1 : 1;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filteredData, sortKey, sortDir]);

  // Paginate
  const totalPages = Math.ceil(sortedData.length / pageSize);
  const paginatedData = sortedData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div
          className={`h-10 rounded mb-4 ${isDark ? "bg-gray-700" : "bg-gray-200"}`}
        />
        <div
          className={`h-64 rounded ${isDark ? "bg-gray-800" : "bg-gray-100"}`}
        />
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl overflow-hidden ${isDark ? "bg-gray-800" : "bg-white"} shadow-sm border ${isDark ? "border-gray-700" : "border-gray-200"}`}
    >
      {/* Search */}
      {searchFields.length > 0 && (
        <div className="p-4 border-b border-gray-700">
          <div className="relative max-w-sm">
            <HiOutlineMagnifyingGlass
              className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? "text-gray-400" : "text-gray-500"}`}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={searchPlaceholder}
              className={`w-full pl-10 pr-4 py-2 rounded-lg border text-sm ${
                isDark
                  ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className={isDark ? "bg-gray-700" : "bg-gray-50"}>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable && handleSort(col.key)}
                  className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    col.sortable ? "cursor-pointer hover:bg-gray-600" : ""
                  } ${isDark ? "text-gray-300" : "text-gray-500"}`}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && sortKey === col.key && (
                      <span className="text-blue-500">
                        {sortDir === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              {actions && (
                <th
                  className={`px-4 py-3 text-right text-xs font-medium uppercase tracking-wider ${isDark ? "text-gray-300" : "text-gray-500"}`}
                >
                  Thao tác
                </th>
              )}
            </tr>
          </thead>
          <tbody
            className={`divide-y ${isDark ? "divide-gray-700" : "divide-gray-200"}`}
          >
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (actions ? 1 : 0)}
                  className={`px-4 py-8 text-center ${isDark ? "text-gray-400" : "text-gray-500"}`}
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((item) => (
                <tr
                  key={String(item[keyField])}
                  onClick={() => onRowClick?.(item)}
                  className={`transition-colors ${onRowClick ? "cursor-pointer" : ""} ${
                    isDark ? "hover:bg-gray-700" : "hover:bg-gray-50"
                  }`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3 text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}
                    >
                      {col.render ? col.render(item) : item[col.key]}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-4 py-3 text-right">{actions(item)}</td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          className={`flex items-center justify-between px-4 py-3 border-t ${isDark ? "border-gray-700" : "border-gray-200"}`}
        >
          <div
            className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}
          >
            Hiển thị {(currentPage - 1) * pageSize + 1} -{" "}
            {Math.min(currentPage * pageSize, sortedData.length)} của{" "}
            {sortedData.length}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={`p-2 rounded-lg transition-colors ${
                currentPage === 1
                  ? "opacity-50 cursor-not-allowed"
                  : isDark
                    ? "hover:bg-gray-700"
                    : "hover:bg-gray-100"
              }`}
            >
              <HiOutlineChevronLeft className="w-5 h-5" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (p) =>
                  p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1,
              )
              .map((page, idx, arr) => (
                <React.Fragment key={page}>
                  {idx > 0 && arr[idx - 1] !== page - 1 && (
                    <span
                      className={`px-2 ${isDark ? "text-gray-500" : "text-gray-400"}`}
                    >
                      ...
                    </span>
                  )}
                  <button
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === page
                        ? "bg-blue-500 text-white"
                        : isDark
                          ? "hover:bg-gray-700"
                          : "hover:bg-gray-100"
                    }`}
                  >
                    {page}
                  </button>
                </React.Fragment>
              ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className={`p-2 rounded-lg transition-colors ${
                currentPage === totalPages
                  ? "opacity-50 cursor-not-allowed"
                  : isDark
                    ? "hover:bg-gray-700"
                    : "hover:bg-gray-100"
              }`}
            >
              <HiOutlineChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
