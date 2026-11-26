import React from 'react';

interface PieChartData {
  name: string;
  value: number;
  percentage?: number;
}

interface PieChartCardProps {
  title: string;
  data: PieChartData[];
  icon: React.ReactNode;
}

const COLORS = [
  '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
  '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf',
];

const PieChartCard: React.FC<PieChartCardProps> = ({ title, data, icon }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-8 border border-slate-200">
        <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-4 sm:mb-6 flex items-center gap-2">
          <div className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600">{icon}</div>
          {title}
        </h3>
        <div className="text-center py-8 sm:py-12">
          <p className="text-sm sm:text-base text-slate-400">No data available</p>
        </div>
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return (
      <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-8 border border-slate-200">
        <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-4 sm:mb-6 flex items-center gap-2">
          <div className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600">{icon}</div>
          {title}
        </h3>
        <div className="text-center py-8 sm:py-12">
          <p className="text-sm sm:text-base text-slate-400">No data available</p>
        </div>
      </div>
    );
  }

  let currentAngle = 0;
  const segments = data.map((item, index) => {
    const percentage = (item.value / total) * 100;
    const angle = (percentage / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    const innerRadius = 60;
    const outerRadius = 100;
    const centerX = 120;
    const centerY = 120;
    const isFullCircle = percentage >= 99.9;
    let pathData: string;

    if (isFullCircle) {
      pathData = [
        `M ${centerX} ${centerY - outerRadius}`,
        `A ${outerRadius} ${outerRadius} 0 0 1 ${centerX} ${centerY + outerRadius}`,
        `A ${outerRadius} ${outerRadius} 0 0 1 ${centerX} ${centerY - outerRadius}`,
        `M ${centerX} ${centerY - innerRadius}`,
        `A ${innerRadius} ${innerRadius} 0 0 0 ${centerX} ${centerY + innerRadius}`,
        `A ${innerRadius} ${innerRadius} 0 0 0 ${centerX} ${centerY - innerRadius}`,
        'Z',
      ].join(' ');
    } else {
      const startRad = (startAngle - 90) * (Math.PI / 180);
      const endRad = (endAngle - 90) * (Math.PI / 180);
      const x1Outer = centerX + outerRadius * Math.cos(startRad);
      const y1Outer = centerY + outerRadius * Math.sin(startRad);
      const x2Outer = centerX + outerRadius * Math.cos(endRad);
      const y2Outer = centerY + outerRadius * Math.sin(endRad);
      const x1Inner = centerX + innerRadius * Math.cos(startRad);
      const y1Inner = centerY + innerRadius * Math.sin(startRad);
      const x2Inner = centerX + innerRadius * Math.cos(endRad);
      const y2Inner = centerY + innerRadius * Math.sin(endRad);
      const largeArcFlag = angle > 180 ? 1 : 0;

      pathData = [
        `M ${x1Outer} ${y1Outer}`,
        `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2Outer} ${y2Outer}`,
        `L ${x2Inner} ${y2Inner}`,
        `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x1Inner} ${y1Inner}`,
        'Z',
      ].join(' ');
    }

    return {
      ...item,
      pathData,
      color: COLORS[index % COLORS.length],
      percentage: percentage.toFixed(1),
    };
  });

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-8 border border-slate-200 hover:shadow-lg transition-shadow duration-300">
      <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-4 sm:mb-6 flex items-center gap-2">
        <div className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600">{icon}</div>
        {title}
      </h3>

      <div className="flex flex-col md:flex-row items-center justify-center gap-6 sm:gap-8">
        <div className="relative flex-shrink-0 w-full max-w-[240px] mx-auto md:mx-0">
          <svg width="100%" height="100%" viewBox="0 0 240 240" preserveAspectRatio="xMidYMid meet">
            <circle cx="120" cy="120" r="100" fill="none" stroke="#e2e8f0" strokeWidth="1" />
            {segments.map((segment, index) => (
              <path
                key={index}
                d={segment.pathData}
                fill={segment.color}
                className="hover:opacity-80 transition-opacity cursor-pointer"
                stroke="white"
                strokeWidth="2"
              />
            ))}
            <circle cx="120" cy="120" r="60" fill="white" />
            <text x="120" y="115" textAnchor="middle" className="text-xl sm:text-2xl font-bold fill-slate-800">
              {data.length}
            </text>
            <text x="120" y="135" textAnchor="middle" className="text-[10px] sm:text-xs fill-slate-400">
              Categories
            </text>
          </svg>
        </div>

        <div className="flex-1 space-y-2 sm:space-y-3 w-full min-w-0">
          {segments.map((segment, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full flex-shrink-0" style={{ backgroundColor: segment.color }} />
                <span className="text-xs sm:text-sm font-medium text-slate-600 truncate">{segment.name}</span>
              </div>
              <span className="text-xs sm:text-sm font-bold text-slate-800 flex-shrink-0 ml-2">
                {segment.percentage}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PieChartCard;
