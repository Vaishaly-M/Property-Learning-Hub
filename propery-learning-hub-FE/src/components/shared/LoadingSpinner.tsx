'use client';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex justify-center items-center h-screen bg-slate-50">
      <div className="w-12 h-12 border-3 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
    </div>
  );
};

export default LoadingSpinner;