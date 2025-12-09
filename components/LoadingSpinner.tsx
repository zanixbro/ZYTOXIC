
import React from 'react';

const LoadingSpinner: React.FC = React.memo(() => {
  return (
    <div className="flex items-center justify-center p-4">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-cyan-400"></div>
      <p className="ml-3 text-cyan-300 text-xl">Generating image...</p>
    </div>
  );
});

export default LoadingSpinner;