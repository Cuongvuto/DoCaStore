import React from 'react';
import { TrendingUp } from 'lucide-react';

const NetProfit = ({ goal }) => {
  const current = goal?.currentMonthRevenue || 0;
  const progress = goal?.progress || 0;
  
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  return (
    <div className="bg-[#202028] rounded-xl p-6 flex items-center justify-between h-full">
      <div className="flex flex-col justify-between h-full py-1">
        <div>
          <p className="text-sm font-medium text-gray-400 mb-2">Doanh thu tháng này</p>
          <h2 className="text-2xl lg:text-3xl font-bold text-white mb-2">
            {formatCurrency(current)}
          </h2>
        </div>
        <div className="flex items-center text-sm font-bold text-[#00c9a7]">
          <TrendingUp className="w-4 h-4 mr-1" />
          Mục tiêu: 50Tr ₫
        </div>
      </div>

      <div className="flex flex-col items-center justify-center shrink-0">
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">
          {/* SVG Circle for progress */}
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="50%"
              cy="50%"
              r="40%"
              stroke="currentColor"
              strokeWidth="10"
              fill="transparent"
              className="text-[#2a2a35]"
            />
            <circle
              cx="50%"
              cy="50%"
              r="40%"
              stroke="currentColor"
              strokeWidth="10"
              fill="transparent"
              pathLength="100"
              strokeDasharray={`${progress} 100`} 
              strokeLinecap="round"
              className="text-[#7294ff]"
            />
          </svg>
          {/* Center text */}
          <div className="absolute inset-0 flex items-center justify-center flex-col">
            <span className="text-xl sm:text-2xl font-bold text-white">{progress}%</span>
          </div>
        </div>
        <p className="text-[10px] sm:text-xs text-gray-400 mt-2 text-center w-full">Tiến độ mục tiêu</p>
      </div>
    </div>
  );
};

export default NetProfit;
