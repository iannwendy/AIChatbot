import React, { useState, useRef, useEffect } from 'react';
import { HiPaperAirplane, HiPaperClip, HiPlus, HiXMark } from 'react-icons/hi2';
import { useTheme } from '../../context/ThemeContext';

interface ChatInputProps {
  onSend: (message: string, files?: File[]) => void;
  disabled?: boolean;
  disabledHint?: string;
  onNewChat?: () => void;
  onAfterSend?: () => void;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled, disabledHint, onNewChat, onAfterSend }) => {
  const [input, setInput] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 80)}px`;
    }
  }, [input]);

  const handleSubmit = () => {
    if ((input.trim() || attachedFiles.length > 0) && !disabled) {
      onSend(input.trim(), attachedFiles.length > 0 ? attachedFiles : undefined);
      setInput('');
      setAttachedFiles([]);
      onAfterSend?.();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={`border-t px-4 pb-3 pt-2 flex-shrink-0 ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
      {/* Input container */}
      <div className={`relative rounded-2xl border transition-all focus-within:ring-2 ${
        isDark
          ? 'bg-gray-800 border-gray-600 focus-within:border-blue-400 focus-within:ring-blue-900'
          : 'bg-gray-50 border-gray-200 focus-within:border-blue-400 focus-within:ring-blue-100'
      }`}>
        <div className="flex items-end gap-2 p-2">
          {/* Attachment button */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            accept=".pdf,.doc,.docx,.txt,.md"
            onChange={e => {
              if (e.target.files) {
                setAttachedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
              }
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`p-2 transition-colors ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
            title="Đính kèm file"
          >
            <HiPaperClip className="w-5 h-5" />
          </button>

          {/* Text input */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your question..."
            disabled={disabled}
            rows={1}
            className={`flex-1 bg-transparent border-none outline-none resize-none py-2 text-sm max-h-[80px] ${isDark ? 'text-gray-200 placeholder-gray-500' : ''}`}
          />

          {/* Send button */}
          <button
            onClick={handleSubmit}
            disabled={(!input.trim() && attachedFiles.length === 0) || disabled}
            className={`p-2 rounded-lg transition-all ${
              (input.trim() || attachedFiles.length > 0) && !disabled
                ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-md'
                : (isDark ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed')
            }`}
            title="Gửi"
          >
            <HiPaperAirplane className="w-5 h-5" />
          </button>
        </div>

        {/* Attached files preview */}
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 px-2 pb-2">
            {attachedFiles.map((file, idx) => (
              <div key={idx} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs ${
                isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'
              }`}>
                <HiPaperClip className="w-3 h-3" />
                <span className="max-w-[120px] truncate">{file.name}</span>
                <button
                  onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== idx))}
                  className="hover:text-red-400"
                >
                  <HiXMark className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {disabledHint && (
        <p className={`text-xs text-center mt-1.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          {disabledHint}
        </p>
      )}
    </div>
  );
};

export default ChatInput;