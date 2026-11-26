import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon }) => {
  return (
    <div className="group relative bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-slate-200 hover:shadow-xl transition-all duration-300 overflow-hidden">
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="p-2 sm:p-3 rounded-xl bg-slate-100">
            <div className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600">{icon}</div>
          </div>
        </div>
        <p className="text-slate-500 text-xs sm:text-sm font-medium mb-0.5 sm:mb-1 truncate">{title}</p>
        <p className="text-base sm:text-lg text-slate-800 font-semibold break-words">{value}</p>
        <p className="text-xs text-slate-400 mt-1 sm:mt-2 line-clamp-2 sm:line-clamp-1">{subtitle}</p>
      </div>
    </div>
  );
};

export default StatCard;
