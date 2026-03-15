import React, { useState, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { HiOutlineCloudArrowUp, HiOutlineXMark, HiOutlineDocumentArrowDown } from 'react-icons/hi2';

interface ImportExcelModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (file: File) => Promise<void>;
  title: string;
  description: string;
  sampleColumns: string[];
  isLoading?: boolean;
}

const ImportExcelModal: React.FC<ImportExcelModalProps> = ({
  open,
  onClose,
  onImport,
  title,
  description,
  sampleColumns,
  isLoading = false,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && (dropped.name.endsWith('.xlsx') || dropped.name.endsWith('.xls') || dropped.name.endsWith('.csv'))) {
      setFile(dropped);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
    }
  };

  const handleSubmit = async () => {
    if (!file) return;
    await onImport(file);
    setFile(null);
    onClose();
  };

  const resetAndClose = () => {
    setFile(null);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={resetAndClose} />
      <div className={`relative z-10 w-full max-w-lg p-6 rounded-xl shadow-xl ${
        isDark ? 'bg-gray-800' : 'bg-white'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {title}
          </h2>
          <button onClick={resetAndClose} className={`p-1 rounded-lg ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
            <HiOutlineXMark className="w-5 h-5" />
          </button>
        </div>

        {/* Description */}
        <p className={`text-sm mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
          {description}
        </p>

        {/* Sample columns */}
        <div className={`p-3 rounded-lg mb-4 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
          <p className={`text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Cột bắt buộc:
          </p>
          <div className="flex flex-wrap gap-2">
            {sampleColumns.map((col, idx) => (
              <span
                key={idx}
                className={`text-xs px-2 py-1 rounded ${
                  isDark ? 'bg-gray-600 text-gray-300' : 'bg-white text-gray-700'
                }`}
              >
                {col}
              </span>
            ))}
          </div>
        </div>

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
          <HiOutlineCloudArrowUp className={`w-8 h-8 mx-auto mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
          {file ? (
            <div className="flex items-center justify-center gap-2">
              <HiOutlineDocumentArrowDown className="w-5 h-5 text-green-500" />
              <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{file.name}</p>
            </div>
          ) : (
            <>
              <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                Kéo thả file Excel (.xlsx, .xls) hoặc CSV (.csv) vào đây
              </p>
              <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                hoặc click để chọn file
              </p>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={resetAndClose}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={!file || isLoading}
            className="px-4 py-2 rounded-lg font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Đang import...' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportExcelModal;
