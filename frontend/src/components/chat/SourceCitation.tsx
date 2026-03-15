import React from 'react';
import { HiOutlineDocumentText, HiOutlineAcademicCap } from 'react-icons/hi2';

interface SourceObject {
  document_title?: string;
  page_number?: number;
  source?: string;
}

interface SourceCitationProps {
  sources: (string | SourceObject)[];
}

const SourceCitation: React.FC<SourceCitationProps> = ({ sources }) => {
  if (!sources || sources.length === 0) return null;

  // Normalize sources to objects
  const normalizedSources = sources.map(s => {
    if (typeof s === 'string') {
      return { source: s };
    }
    return s;
  });

  // Deduplicate by source string
  const uniqueSources = normalizedSources.filter((source, index, self) =>
    index === self.findIndex((s) => s.source === source.source)
  );

  return (
    <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-700">
      <div className="text-xs text-gray-400 mb-1.5">Nguồn tham khảo:</div>
      <div className="flex flex-wrap gap-1.5">
        {uniqueSources.map((source, idx) => (
          <button
            key={idx}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
          >
            <HiOutlineDocumentText className="w-3.5 h-3.5" />
            <span>{source.source || source.document_title}</span>
            {source.page_number && (
              <span className="text-blue-500 dark:text-blue-400">
                (Trang {source.page_number})
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SourceCitation;
