import React from 'react';

const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'completed': return 'text-[#00c9a7] bg-[#00c9a7]/20 border-[#00c9a7]/30';
    case 'cancelled': return 'text-[#ff6b6b] bg-[#ff6b6b]/20 border-[#ff6b6b]/30';
    case 'pending': return 'text-[#e06287] bg-[#e06287]/20 border-[#e06287]/30';
    case 'processing': return 'text-[#7294ff] bg-[#7294ff]/20 border-[#7294ff]/30';
    default: return 'text-gray-400 bg-gray-700/50 border-gray-600';
  }
};

const getStatusText = (status) => {
  switch (status?.toLowerCase()) {
    case 'completed': return 'Đã giao';
    case 'cancelled': return 'Đã hủy';
    case 'pending': return 'Chờ xử lý';
    case 'processing': return 'Đang chuẩn bị';
    default: return status || 'Không rõ';
  }
};

const RecentOrders = ({ orders }) => {
  return (
    <div className="bg-[#202028] rounded-xl p-5 h-full overflow-hidden flex flex-col min-h-[350px]">
      <h2 className="text-xl font-bold text-white mb-6">Đơn hàng gần đây</h2>
      <div className="overflow-x-auto flex-1 custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="py-3 font-medium text-gray-400 text-sm">Khách hàng</th>
              <th className="py-3 font-medium text-gray-400 text-sm">Mã đơn</th>
              <th className="py-3 font-medium text-gray-400 text-sm">Số tiền</th>
              <th className="py-3 font-medium text-gray-400 text-sm">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {orders && orders.length > 0 ? orders.map((order) => (
              <tr key={order._id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                <td className="py-3">
                  <div className="flex items-center gap-3">
                    <img src={order.userId?.avatar || `https://ui-avatars.com/api/?name=${order.userId?.name || 'User'}&background=random`} alt={order.userId?.name || 'User'} className="w-8 h-8 rounded-full object-cover" />
                    <span className="font-medium text-gray-200">{order.userId?.name || 'Khách vãng lai'}</span>
                  </div>
                </td>
                <td className="py-3 text-sm text-gray-300">{order.payosOrderCode || order._id.slice(-6).toUpperCase()}</td>
                <td className="py-3 text-sm font-medium text-white">{order.totalPrice.toLocaleString('vi-VN')} ₫</td>
                <td className="py-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                    {getStatusText(order.status)}
                  </span>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="4" className="py-6 text-center text-gray-500">Không có đơn hàng nào gần đây.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RecentOrders;
