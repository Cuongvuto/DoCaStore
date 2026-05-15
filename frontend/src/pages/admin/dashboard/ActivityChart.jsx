import React, { useState, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import axiosClient from '../../../api/axiosClient';

const PERIODS = [
  { key: 'daily',   label: 'Hàng ngày' },
  { key: 'weekly',  label: 'Hàng tuần' },
  { key: 'monthly', label: 'Hàng tháng' },
];

const ActivityChart = () => {
  const [period, setPeriod]       = useState('weekly');
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [open, setOpen]           = useState(false);
  const dropdownRef               = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch chart data whenever period changes
  useEffect(() => {
    const fetchChartData = async () => {
      setLoading(true);
      try {
        const res = await axiosClient.get(`/dashboard/activity?period=${period}`);
        if (res.data?.success) {
          setChartData(res.data.data);
        }
      } catch (err) {
        console.error('Error fetching activity chart data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchChartData();
  }, [period]);

  const currentLabel = PERIODS.find(p => p.key === period)?.label;

  return (
    <div className="bg-[#202028] rounded-xl p-5 h-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">Hoạt động</h2>

        {/* Period Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setOpen(prev => !prev)}
            className="bg-gray-700/50 text-gray-300 text-sm px-4 py-1.5 rounded-full flex items-center gap-2 cursor-pointer hover:bg-gray-700 transition-colors select-none"
          >
            {currentLabel}
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-36 bg-[#2a2a35] border border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
              {PERIODS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => { setPeriod(p.key); setOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    period === p.key
                      ? 'bg-[#7294ff]/20 text-[#7294ff] font-semibold'
                      : 'text-gray-300 hover:bg-gray-700/60'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chart area */}
      <div className="h-[250px] w-full">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-4 border-[#7294ff] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                tickFormatter={(value) => `${value / 1000000}M`}
              />
              <Tooltip
                cursor={{ fill: '#374151', opacity: 0.4 }}
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                itemStyle={{ color: '#7294ff' }}
                formatter={(value) => [`${new Intl.NumberFormat('vi-VN').format(value)} ₫`, 'Doanh thu']}
                labelStyle={{ color: '#9ca3af', marginBottom: '4px' }}
              />
              <Bar dataKey="value" fill="#7294ff" radius={[4, 4, 4, 4]} barSize={30} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default ActivityChart;

