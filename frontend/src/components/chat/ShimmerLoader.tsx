import React from 'react';

const ShimmerLoader: React.FC = () => (
  <div className="flex gap-3 animate-fade-in">
    <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0" />
    <div className="flex-1 space-y-3 py-1">
      <div className="h-4 shimmer-bg animate-shimmer rounded w-3/4" />
      <div className="h-4 shimmer-bg animate-shimmer rounded w-1/2" />
      <div className="h-4 shimmer-bg animate-shimmer rounded w-5/6" />
    </div>
  </div>
);

export default ShimmerLoader;
