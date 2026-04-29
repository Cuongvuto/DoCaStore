import React, { useState, useEffect } from "react";
import axiosClient from "../../api/axiosClient";
import { toast } from "sonner";
import { Eye, ChevronLeft, ChevronRight, Package, Truck, CheckCircle, XCircle, Clock } from "lucide-react";

const OrderManager = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null); // State để chặn spam click lúc đang update

  // State Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // State Modal Chi tiết đơn hàng
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- FETCH DỮ LIỆU ---
  const fetchOrders = async (page = 1) => {
    setLoading(true);
    try {
      const res = await axiosClient.get(`/order?page=${page}&limit=${itemsPerPage}`); 
      if (res.data?.success) {
        setOrders(res.data.data);
        if (res.data.totalPages) setTotalPages(res.data.totalPages);
        if (res.data.totalCount !== undefined) setTotalCount(res.data.totalCount);
      } else if (Array.isArray(res.data)) {
        setOrders(res.data);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi khi tải danh sách đơn hàng!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(currentPage);
  }, [currentPage]);

  // --- CẬP NHẬT TRẠNG THÁI ---
  const handleUpdateStatus = async (orderId, newStatus) => {
    setUpdatingId(orderId);
    try {
      const res = await axiosClient.put(`/order/${orderId}/status`, { status: newStatus });
      
      if (res.data?.success || res.status === 200) {
        toast.success("Cập nhật trạng thái thành công!");
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order._id === orderId ? { ...order, status: newStatus } : order
          )
        );
        if (selectedOrder && selectedOrder._id === orderId) {
          setSelectedOrder(prev => ({ ...prev, status: newStatus }));
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi khi cập nhật trạng thái!");
      fetchOrders(); 
    } finally {
      setUpdatingId(null);
    }
  };

  // --- FORMAT HIỂN THỊ ---
  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString("vi-VN", {
      hour: '2-digit', minute: '2-digit',
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };

  // Lấy màu sắc cho Dropdown trạng thái
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 focus:ring-yellow-500';
      case 'processing': return 'bg-blue-500/10 text-blue-500 border-blue-500/20 focus:ring-blue-500';
      case 'shipped': return 'bg-purple-500/10 text-purple-500 border-purple-500/20 focus:ring-purple-500';
      case 'completed': return 'bg-green-500/10 text-green-500 border-green-500/20 focus:ring-green-500';
      case 'cancelled': return 'bg-red-500/10 text-red-500 border-red-500/20 focus:ring-red-500';
      default: return 'bg-[#151419] text-gray-400 border-gray-700';
    }
  };

  // --- LOGIC PHÂN TRANG ---
  const indexOfFirstItem = (currentPage - 1) * itemsPerPage;
  const currentOrders = orders;

  const handleNextPage = () => { if (currentPage < totalPages) setCurrentPage(currentPage + 1); };
  const handlePrevPage = () => { if (currentPage > 1) setCurrentPage(currentPage - 1); };

  // --- XEM CHI TIẾT ---
  const handleViewDetails = (order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  return (
    <div className="p-4 md:p-8 bg-[#151419] min-h-screen">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-xl md:text-2xl font-bold text-white uppercase tracking-wider">Quản lý Đơn hàng</h1>
          <p className="text-gray-400 text-xs md:text-sm mt-1">Tổng số đơn hàng: <span className="text-[#7294ff] font-bold">{totalCount || orders.length}</span></p>
        </div>

        {/* Bảng danh sách */}
        <div className="bg-[#202028] rounded-2xl shadow-xl border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead className="bg-[#151419] text-gray-400 uppercase text-[10px] md:text-xs font-bold tracking-widest border-b border-gray-700">
                <tr>
                  <th className="p-4">Mã Đơn</th>
                  <th className="p-4">Khách hàng</th>
                  <th className="p-4">Ngày đặt</th>
                  <th className="p-4 text-right">Tổng tiền</th>
                  <th className="p-4 text-center">Thanh toán</th>
                  <th className="p-4 text-center">Trạng thái</th>
                  <th className="p-4 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="p-12 text-center text-gray-500 font-medium italic">Đang tải dữ liệu...</td>
                  </tr>
                ) : currentOrders.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-12 text-center text-gray-500 font-medium">Chưa có đơn hàng nào.</td>
                  </tr>
                ) : (
                  currentOrders.map((order) => (
                    <tr key={order._id} className="hover:bg-[#151419]/50 transition-colors">
                      <td className="p-4 font-mono text-[10px] md:text-xs font-bold text-[#7294ff]">
                        #{order._id.slice(-6).toUpperCase()}
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-white text-sm md:text-base">{order.shippingAddress?.receiverName || "Khách ẩn danh"}</div>
                        <div className="text-gray-500 text-[10px] md:text-xs">{order.shippingAddress?.phone}</div>
                      </td>
                      <td className="p-4 text-gray-400 text-xs md:text-sm">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="p-4 text-right font-bold text-red-500 text-sm md:text-base">
                        {formatPrice(order.totalPrice)}
                      </td>
                      <td className="p-4 text-center">
                        <span className="bg-[#151419] border border-gray-700 text-gray-400 px-2.5 py-1 rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-tighter">
                          {order.paymentMethod}
                        </span>
                      </td>
                      
                      <td className="p-4 text-center">
                        <div className="flex justify-center">
                          <select
                            value={order.status || 'pending'}
                            onChange={(e) => handleUpdateStatus(order._id, e.target.value)}
                            disabled={updatingId === order._id}
                            className={`text-[10px] md:text-xs font-bold rounded-xl px-3 py-1.5 border border-gray-700 outline-none cursor-pointer transition-all ${getStatusColor(order.status)} ${updatingId === order._id ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
                          >
                            <option value="pending">⏳ Chờ xử lý</option>
                            <option value="processing">📦 Đang chuẩn bị</option>
                            <option value="shipped">🚚 Đang giao</option>
                            <option value="completed">✅ Đã giao</option>
                            <option value="cancelled">❌ Đã hủy</option>
                          </select>
                        </div>
                      </td>

                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleViewDetails(order)}
                          className="p-2 text-[#7294ff] hover:text-white hover:bg-[#7294ff]/10 rounded-xl transition-all shadow-sm inline-flex items-center justify-center border border-transparent hover:border-[#7294ff]/20"
                          title="Xem chi tiết"
                        >
                          <Eye size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Phân trang */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between bg-[#151419]/50 gap-4">
              <span className="text-xs md:text-sm text-gray-400">
                Trang <span className="text-white font-bold">{currentPage}</span> / <span className="text-white font-bold">{totalPages}</span>
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  className="p-2 border border-gray-700 bg-[#202028] rounded-xl hover:bg-gray-800 disabled:opacity-30 transition-all"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="p-2 border border-gray-700 bg-[#202028] rounded-xl hover:bg-gray-800 disabled:opacity-30 transition-all"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Xem Chi Tiết Đơn Hàng */}
        {isModalOpen && selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-[#202028] rounded-2xl w-full max-w-3xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-700">
              <div className="p-5 border-b border-gray-700 flex justify-between items-center bg-[#202028]">
                <div>
                  <h2 className="text-lg md:text-xl font-bold uppercase text-white tracking-wide">Chi tiết đơn hàng</h2>
                  <p className="text-[10px] md:text-xs text-gray-500 font-mono mt-1 uppercase">Mã: {selectedOrder._id}</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-700 rounded-full transition-colors text-gray-400 hover:text-red-500 text-2xl font-bold">&times;</button>
              </div>

              <div className="p-4 md:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="bg-[#151419] p-4 rounded-2xl border border-gray-800">
                    <h3 className="font-bold text-[#7294ff] mb-4 border-b border-gray-800 pb-2 text-sm uppercase tracking-wider">Thông tin giao hàng</h3>
                    <ul className="space-y-3 text-xs md:text-sm text-gray-400">
                      <li className="flex flex-col sm:flex-row gap-1 sm:gap-2"><span className="font-bold text-gray-500 sm:w-24 shrink-0 uppercase tracking-tighter">Người nhận:</span> <span className="text-white">{selectedOrder.shippingAddress?.receiverName}</span></li>
                      <li className="flex flex-col sm:flex-row gap-1 sm:gap-2"><span className="font-bold text-gray-500 sm:w-24 shrink-0 uppercase tracking-tighter">Điện thoại:</span> <span className="text-white font-bold">{selectedOrder.shippingAddress?.phone}</span></li>
                      <li className="flex flex-col sm:flex-row gap-1 sm:gap-2"><span className="font-bold text-gray-500 sm:w-24 shrink-0 uppercase tracking-tighter">Địa chỉ:</span> <span className="text-white leading-relaxed">{selectedOrder.shippingAddress?.street}</span></li>
                    </ul>
                  </div>

                  <div className="bg-[#151419] p-4 rounded-2xl border border-gray-800">
                    <h3 className="font-bold text-[#7294ff] mb-4 border-b border-gray-800 pb-2 text-sm uppercase tracking-wider">Thông tin chung</h3>
                    <ul className="space-y-3 text-xs md:text-sm text-gray-400">
                      <li className="flex flex-col sm:flex-row gap-1 sm:gap-2 items-start sm:items-center"><span className="font-bold text-gray-500 sm:w-28 shrink-0 uppercase tracking-tighter">Trạng thái:</span> 
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border border-gray-700 ${getStatusColor(selectedOrder.status)}`}>
                          {selectedOrder.status?.toUpperCase() || 'PENDING'}
                        </span>
                      </li>
                      <li className="flex flex-col sm:flex-row gap-1 sm:gap-2"><span className="font-bold text-gray-500 sm:w-28 shrink-0 uppercase tracking-tighter">Thanh toán:</span> <span className="text-white font-bold uppercase">{selectedOrder.paymentMethod}</span></li>
                      <li className="flex flex-col sm:flex-row gap-1 sm:gap-2"><span className="font-bold text-gray-500 sm:w-28 shrink-0 uppercase tracking-tighter">Ngày đặt:</span> <span className="text-white">{formatDate(selectedOrder.createdAt)}</span></li>
                      {selectedOrder.note && (
                        <li className="flex flex-col sm:flex-row gap-1 sm:gap-2"><span className="font-bold text-gray-500 sm:w-28 shrink-0 uppercase tracking-tighter">Ghi chú:</span> <span className="text-orange-400 italic">{selectedOrder.note}</span></li>
                      )}
                    </ul>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-bold text-white text-sm uppercase tracking-wider flex items-center gap-2">
                    <Package size={16} className="text-[#7294ff]" /> Sản phẩm đã đặt
                  </h3>
                  <div className="border border-gray-800 rounded-2xl overflow-hidden bg-[#151419]">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs md:text-sm min-w-[500px]">
                        <thead className="bg-[#202028] text-gray-500 font-bold uppercase tracking-widest text-[10px]">
                          <tr>
                            <th className="p-4">Sản phẩm</th>
                            <th className="p-4 text-center">SL</th>
                            <th className="p-4 text-right">Đơn giá</th>
                            <th className="p-4 text-right">Thành tiền</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                          {selectedOrder.products?.map((item, index) => (
                            <tr key={index} className="hover:bg-white/5">
                              <td className="p-4">
                                <div className="font-bold text-white">
                                  {item.productId?.name || "Sản phẩm không xác định"}
                                </div>
                              </td>
                              <td className="p-4 text-center text-white">{item.quantity}</td>
                              <td className="p-4 text-right text-gray-500">{formatPrice(item.priceAtPurchase || 0)}</td>
                              <td className="p-4 text-right font-bold text-[#00c9a7]">
                                {formatPrice((item.priceAtPurchase || 0) * item.quantity)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <div className="w-full sm:w-64 bg-[#151419] p-4 rounded-2xl border border-gray-800">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Tổng cộng:</span>
                      <span className="text-red-500 text-xl font-black">{formatPrice(selectedOrder.totalPrice)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 md:p-6 border-t border-gray-700 flex justify-end bg-[#202028]">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-full sm:w-auto px-8 py-2.5 bg-[#151419] text-gray-400 font-bold rounded-xl hover:bg-gray-800 transition-all border border-gray-700"
                >
                  Đóng
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default OrderManager;