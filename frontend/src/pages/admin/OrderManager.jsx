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
      // Sếp chú ý: Đường dẫn này phụ thuộc vào Backend sếp viết nhé. 
      // Em đang giả định là sếp dùng method PUT và route là /order/:id/status
      const res = await axiosClient.put(`/order/${orderId}/status`, { status: newStatus });
      
      if (res.data?.success || res.status === 200) {
        toast.success("Cập nhật trạng thái thành công!");
        // Cập nhật luôn UI mà không cần gọi lại API fetchOrders
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order._id === orderId ? { ...order, status: newStatus } : order
          )
        );
        // Nếu đang mở Modal chi tiết, cập nhật luôn trong Modal
        if (selectedOrder && selectedOrder._id === orderId) {
          setSelectedOrder(prev => ({ ...prev, status: newStatus }));
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi khi cập nhật trạng thái!");
      // Nếu lỗi thì load lại danh sách gốc để đảm bảo dữ liệu chuẩn
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
      case 'pending': return 'bg-yellow-50 text-yellow-700 border-yellow-200 focus:ring-yellow-500';
      case 'processing': return 'bg-blue-50 text-blue-700 border-blue-200 focus:ring-blue-500';
      case 'shipped': return 'bg-purple-50 text-purple-700 border-purple-200 focus:ring-purple-500';
      case 'completed': return 'bg-green-50 text-green-700 border-green-200 focus:ring-green-500';
      case 'cancelled': return 'bg-red-50 text-red-700 border-red-200 focus:ring-red-500';
      default: return 'bg-[#151419] text-gray-300 border-gray-700';
    }
  };

  // --- LOGIC PHÂN TRANG ---
  const indexOfFirstItem = (currentPage - 1) * itemsPerPage;
  const currentOrders = orders; // Đã cắt data từ Backend

  const handleNextPage = () => { if (currentPage < totalPages) setCurrentPage(currentPage + 1); };
  const handlePrevPage = () => { if (currentPage > 1) setCurrentPage(currentPage - 1); };

  // --- XEM CHI TIẾT ---
  const handleViewDetails = (order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  return (
    <div className="p-6 md:p-8 bg-[#151419] min-h-screen">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white uppercase tracking-wide">Quản lý Đơn hàng</h1>
          <p className="text-gray-400 text-sm mt-1">Tổng số đơn hàng: {totalCount || orders.length}</p>
        </div>

        {/* Bảng danh sách */}
        <div className="bg-[#202028] rounded-xl shadow-sm border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-800 text-gray-300 uppercase text-xs font-bold tracking-wider">
                <tr>
                  <th className="p-4 border-b">Mã Đơn</th>
                  <th className="p-4 border-b">Khách hàng</th>
                  <th className="p-4 border-b">Ngày đặt</th>
                  <th className="p-4 border-b text-right">Tổng tiền</th>
                  <th className="p-4 border-b text-center">Thanh toán</th>
                  <th className="p-4 border-b text-center">Trạng thái</th>
                  <th className="p-4 border-b text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="p-10 text-center text-gray-400 font-medium">Đang tải dữ liệu...</td>
                  </tr>
                ) : currentOrders.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-10 text-center text-gray-400">Chưa có đơn hàng nào.</td>
                  </tr>
                ) : (
                  currentOrders.map((order) => (
                    <tr key={order._id} className="hover:bg-[#151419] transition-colors">
                      <td className="p-4 font-mono text-xs font-bold text-gray-300">
                        #{order._id.slice(-6).toUpperCase()}
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-white">{order.shippingAddress?.receiverName || "Khách ẩn danh"}</div>
                        <div className="text-gray-400 text-xs">{order.shippingAddress?.phone}</div>
                      </td>
                      <td className="p-4 text-gray-300 font-medium">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="p-4 text-right font-bold text-red-600 text-base">
                        {formatPrice(order.totalPrice)}
                      </td>
                      <td className="p-4 text-center">
                        <span className="bg-slate-100 border border-slate-200 text-slate-700 px-2 py-1 rounded text-xs font-bold uppercase">
                          {order.paymentMethod}
                        </span>
                      </td>
                      
                      {/* Cột Trạng thái - Đã sửa thành Dropdown */}
                      <td className="p-4 text-center flex justify-center">
                        <select
                          value={order.status || 'pending'}
                          onChange={(e) => handleUpdateStatus(order._id, e.target.value)}
                          disabled={updatingId === order._id}
                          className={`text-xs font-bold rounded-full px-3 py-1.5 border-2 outline-none cursor-pointer transition-all ${getStatusColor(order.status)} ${updatingId === order._id ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'}`}
                        >
                          <option value="pending">⏳ Chờ xử lý</option>
                          <option value="processing">📦 Đang chuẩn bị</option>
                          <option value="shipped">🚚 Đang giao</option>
                          <option value="completed">✅ Đã giao</option>
                          <option value="cancelled">❌ Đã hủy</option>
                        </select>
                      </td>

                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleViewDetails(order)}
                          className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors shadow-sm inline-flex items-center justify-center"
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
            <div className="p-4 border-t flex items-center justify-between bg-[#151419]">
              <span className="text-sm text-gray-300">
                Hiển thị trang <span className="font-bold">{currentPage}</span> / <span className="font-bold">{totalPages}</span>
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  className="p-2 border bg-[#202028] rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="p-2 border bg-[#202028] rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Xem Chi Tiết Đơn Hàng (Được giữ nguyên) */}
        {isModalOpen && selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-[#202028] rounded-xl w-full max-w-3xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-[#151419]">
                <div>
                  <h2 className="text-lg font-bold uppercase text-white">Chi tiết đơn hàng</h2>
                  <p className="text-sm text-gray-400 font-mono mt-1">Mã: {selectedOrder._id}</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500 text-2xl font-bold">&times;</button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                    <h3 className="font-bold text-blue-800 mb-3 border-b border-blue-200 pb-2">Thông tin giao hàng</h3>
                    <ul className="space-y-2 text-sm text-gray-300">
                      <li><span className="font-semibold w-24 inline-block">Người nhận:</span> {selectedOrder.shippingAddress?.receiverName}</li>
                      <li><span className="font-semibold w-24 inline-block">Điện thoại:</span> <span className="font-bold">{selectedOrder.shippingAddress?.phone}</span></li>
                      <li><span className="font-semibold w-24 inline-block">Địa chỉ:</span> {selectedOrder.shippingAddress?.street}</li>
                    </ul>
                  </div>

                  <div className="bg-[#151419] p-4 rounded-xl border border-gray-100">
                    <h3 className="font-bold text-white mb-3 border-b border-gray-700 pb-2">Thông tin chung</h3>
                    <ul className="space-y-2 text-sm text-gray-300">
                      <li><span className="font-semibold w-28 inline-block">Trạng thái:</span> 
                        {/* Hiển thị badge trạng thái trong modal (dùng luôn CSS của hàm color) */}
                        <span className={`ml-2 px-2 py-1 rounded text-xs font-bold ${getStatusColor(selectedOrder.status)}`}>
                          {selectedOrder.status?.toUpperCase() || 'PENDING'}
                        </span>
                      </li>
                      <li><span className="font-semibold w-28 inline-block">Thanh toán:</span> <span className="font-bold uppercase">{selectedOrder.paymentMethod}</span></li>
                      <li><span className="font-semibold w-28 inline-block">Ngày đặt:</span> {formatDate(selectedOrder.createdAt)}</li>
                      {selectedOrder.note && (
                        <li><span className="font-semibold w-28 inline-block">Ghi chú:</span> <span className="text-red-500 italic">{selectedOrder.note}</span></li>
                      )}
                    </ul>
                  </div>
                </div>

                <h3 className="font-bold text-white mb-3">Sản phẩm đã đặt</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-800 text-gray-300 font-semibold">
                      <tr>
                        <th className="p-3 border-b">Sản phẩm</th>
                        <th className="p-3 border-b text-center">Số lượng</th>
                        <th className="p-3 border-b text-right">Đơn giá</th>
                        <th className="p-3 border-b text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedOrder.products?.map((item, index) => (
                        <tr key={index}>
                          <td className="p-3">
                            <div className="font-medium text-white">
                              {item.productId?.name || "Sản phẩm không xác định"}
                            </div>
                          </td>
                          <td className="p-3 text-center">{item.quantity}</td>
                          <td className="p-3 text-right text-gray-400">{formatPrice(item.priceAtPurchase || 0)}</td>
                          <td className="p-3 text-right font-semibold text-white">
                            {formatPrice((item.priceAtPurchase || 0) * item.quantity)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between font-bold text-lg items-center pt-2 border-t border-gray-700">
                      <span className="text-white">Tổng cộng:</span>
                      <span className="text-red-600 text-xl">{formatPrice(selectedOrder.totalPrice)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t flex justify-end bg-[#151419]">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 bg-gray-700 text-gray-300 rounded-lg font-semibold hover:bg-gray-300 transition"
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