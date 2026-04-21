import React from 'react';
import { ShoppingBasket, ShoppingBag, XSquare, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';

const StatCards = ({ stats }) => {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const statsList = [
    {
      id: 1,
      title: 'Tổng đơn hàng',
      value: stats?.totalOrders || '0',
      trend: 'up',
      percentage: '3%', // Dummy trend
      icon: ShoppingBasket,
      iconColor: 'text-[#4c74f9]',
      iconBg: 'bg-[#4c74f9]/20'
    },
    {
      id: 2,
      title: 'Đã giao',
      value: stats?.totalDelivered || '0',
      trend: 'down',
      percentage: '3%', // Dummy trend
      icon: ShoppingBag,
      iconColor: 'text-[#00c9a7]',
      iconBg: 'bg-[#00c9a7]/20'
    },
    {
      id: 3,
      title: 'Đã hủy',
      value: stats?.totalCancelled || '0',
      trend: 'up',
      percentage: '3%', // Dummy trend
      icon: XSquare,
      iconColor: 'text-[#ff6b6b]',
      iconBg: 'bg-[#ff6b6b]/20'
    },
    {
      id: 4,
      title: 'Tổng doanh thu',
      value: stats?.totalRevenue ? formatCurrency(stats.totalRevenue) : '0 ₫',
      trend: 'down',
      percentage: '3%', // Dummy trend
      icon: DollarSign,
      iconColor: 'text-[#e06287]',
      iconBg: 'bg-[#e06287]/20'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-full">
      {statsList.map((stat) => (
        <div key={stat.id} className="bg-[#202028] rounded-xl p-4 flex flex-col justify-between">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${stat.iconBg}`}>
            <stat.icon className={`w-7 h-7 ${stat.iconColor}`} />
          </div>
          <p className="text-sm font-medium text-gray-400 mb-2">{stat.title}</p>
          <div className="flex items-center justify-between mt-auto">
            <span className="text-3xl font-bold text-white">{stat.value}</span>
            <div className={`flex items-center text-xs font-semibold ${stat.trend === 'up' ? 'text-[#00c9a7]' : 'text-[#ff6b6b]'}`}>
              {stat.trend === 'up' ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
              {stat.percentage}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatCards;
