import React, { useState, useEffect } from "react";
import axiosClient from "../../api/axiosClient";
import { toast } from "sonner"; // Hoặc react-toastify tùy sếp đang dùng
import { FiPlus, FiPower, FiChevronLeft, FiChevronRight } from "react-icons/fi";

const CouponManager = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);

  // State Phân trang (Frontend Pagination)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // State Modal (Chỉ dùng để Thêm mới)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    code: "",
    discountPercent: "",
    expiryDate: "",
    usageLimit: 100,
    targetAudience: "all",
    groupType: "vip"
  });

  // --- 1. FETCH DỮ LIỆU TỪ BACKEND ---
  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get("/coupons");
      if (res.data?.success) {
        setCoupons(res.data.data);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi khi tải danh sách mã giảm giá!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  // --- 2. TẠO MÃ MỚI ---
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axiosClient.post("/coupons", formData);
      if (res.data?.success) {
        toast.success("Thêm mã giảm giá mới thành công!");
        setIsModalOpen(false);
        setFormData({ code: "", discountPercent: "", expiryDate: "", usageLimit: 100, targetAudience: "all", groupType: "vip" });
        fetchCoupons(); // Tải lại danh sách
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Tạo mã thất bại!");
    }
  };

  // --- 3. BẬT/TẮT MÃ GIẢM GIÁ (TOGGLE) ---
  const handleToggleStatus = async (id, currentStatus) => {
    const action = currentStatus ? "Vô hiệu hóa" : "Kích hoạt";
    if (window.confirm(`Sếp có chắc muốn ${action} mã này không?`)) {
      try {
        const res = await axiosClient.put(`/coupons/${id}/toggle`);
        if (res.data?.success) {
          toast.success(res.data.message);
          fetchCoupons(); // Tải lại danh sách để cập nhật UI
        }
      } catch (error) {
        toast.error("Lỗi khi thay đổi trạng thái!");
      }
    }
  };

  // --- LOGIC TÍNH TOÁN PHÂN TRANG FRONTEND ---
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCoupons = coupons.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(coupons.length / itemsPerPage);

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  return (
    <div className="p-4 md:p-8 bg-[#151419] min-h-screen">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white uppercase tracking-wider">Quản lý Coupon</h1>
            <p className="text-gray-400 text-xs md:text-sm mt-1">Tổng số mã hiện có: <span className="text-blue-500 font-bold">{coupons.length}</span></p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition-all hover:scale-105 active:scale-95 text-sm"
          >
            <FiPlus size={20} /> TẠO MÃ MỚI
          </button>
        </div>

        {/* Table Section */}
        <div className="bg-[#202028] rounded-2xl shadow-xl border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="bg-[#151419] text-gray-400 uppercase text-[10px] md:text-xs font-bold tracking-widest border-b border-gray-700">
                <tr>
                  <th className="p-4">Mã Code</th>
                  <th className="p-4 text-center">Giảm giá</th>
                  <th className="p-4">Ngày hết hạn</th>
                  <th className="p-4 text-center">Sử dụng</th>
                  <th className="p-4 text-center">Trạng thái</th>
                  <th className="p-4 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="p-12 text-center text-gray-500 font-medium italic">Đang tải dữ liệu...</td>
                  </tr>
                ) : currentCoupons.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-12 text-center text-gray-500 font-medium">Chưa có mã giảm giá nào.</td>
                  </tr>
                ) : (
                  currentCoupons.map((item) => {
                    const isExpired = new Date(item.expiryDate) < new Date();
                    return (
                      <tr key={item._id} className="hover:bg-white/5 transition-colors">
                        <td className="p-4">
                          <span className="bg-blue-500/10 text-blue-500 px-3 py-1.5 rounded-lg font-mono font-bold border border-blue-500/20 uppercase text-xs md:text-sm">
                            {item.code}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <p className="font-bold text-red-500 text-base md:text-lg">{item.discountPercent}%</p>
                          {item.targetAudience === 'group' && (
                             <span className="text-[9px] bg-purple-500/10 text-purple-400 px-2 py-0.5 mt-1 rounded-md font-bold uppercase tracking-tighter inline-block">Nhóm: {item.groupType}</span>
                          )}
                        </td>
                        <td className="p-4 text-gray-300 font-medium text-xs md:text-sm">
                          {new Date(item.expiryDate).toLocaleDateString("vi-VN")}
                          {isExpired && <span className="block sm:inline sm:ml-2 text-[10px] text-red-400 font-bold bg-red-400/10 px-2 py-0.5 rounded-md mt-1 sm:mt-0">Hết hạn</span>}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex flex-col items-center">
                            <span className="font-bold text-white text-sm">{item.usedCount}</span>
                            <div className="w-12 h-1 bg-gray-700 rounded-full mt-1 overflow-hidden">
                              <div 
                                className="h-full bg-blue-500" 
                                style={{ width: `${Math.min((item.usedCount / item.usageLimit) * 100, 100)}%` }}
                              ></div>
                            </div>
                            <span className="text-[10px] text-gray-500 mt-1 uppercase font-bold tracking-tighter">/ {item.usageLimit}</span>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-tighter ${item.isActive ? "bg-green-500/10 text-green-500 border border-green-500/20" : "bg-gray-700 text-gray-400 border border-gray-600"}`}>
                            {item.isActive ? "Đang bật" : "Đã tắt"}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleToggleStatus(item._id, item.isActive)}
                            title={item.isActive ? "Tắt mã này" : "Bật mã này"}
                            className={`p-2.5 rounded-xl transition-all shadow-sm ${item.isActive ? "bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white" : "bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-white"}`}
                          >
                            <FiPower size={18} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between bg-[#151419]/50 gap-4">
              <span className="text-xs text-gray-400">
                Hiển thị <span className="text-white font-bold">{indexOfFirstItem + 1}</span> - <span className="text-white font-bold">{Math.min(indexOfLastItem, coupons.length)}</span> / <span className="text-white font-bold">{coupons.length}</span> mã
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  className="p-2 border border-gray-700 bg-[#202028] rounded-xl hover:bg-gray-800 disabled:opacity-30 transition-all"
                >
                  <FiChevronLeft size={18} />
                </button>
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="p-2 border border-gray-700 bg-[#202028] rounded-xl hover:bg-gray-800 disabled:opacity-30 transition-all"
                >
                  <FiChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Thêm Mới */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-[#202028] rounded-2xl w-full max-w-md shadow-2xl border border-gray-700 overflow-hidden transform transition-all">
              <div className="p-5 border-b border-gray-700 flex justify-between items-center bg-[#202028]">
                <h2 className="text-lg font-bold uppercase text-white tracking-wide">Tạo mã giảm giá</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-700 rounded-full transition-colors text-gray-400 text-2xl font-bold">&times;</button>
              </div>

              <form onSubmit={handleCreateSubmit} className="p-5 md:p-6 space-y-5">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Mã Coupon</label>
                  <input
                    required
                    type="text"
                    placeholder="VD: KHAIXUAN2024"
                    className="w-full bg-[#151419] border border-gray-700 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-white uppercase font-mono text-sm tracking-widest transition-all"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">% Giảm giá</label>
                    <input
                      required
                      type="number"
                      min="1"
                      max="100"
                      placeholder="10"
                      className="w-full bg-[#151419] border border-gray-700 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-white text-sm transition-all"
                      value={formData.discountPercent}
                      onChange={(e) => setFormData({ ...formData, discountPercent: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Số lượt tối đa</label>
                    <input
                      required
                      type="number"
                      min="1"
                      placeholder="100"
                      className="w-full bg-[#151419] border border-gray-700 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-white text-sm transition-all"
                      value={formData.usageLimit}
                      onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Đối tượng</label>
                    <select
                      className="w-full bg-[#151419] border border-gray-700 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-white text-sm transition-all"
                      value={formData.targetAudience}
                      onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                    >
                      <option value="all">Tất cả</option>
                      <option value="group">Theo Nhóm</option>
                    </select>
                  </div>
                  <div>
                    <label className={`block text-xs font-bold mb-1.5 uppercase tracking-wider ${formData.targetAudience === 'group' ? 'text-purple-400' : 'text-gray-600'}`}>Nhóm KH</label>
                    <select
                      disabled={formData.targetAudience !== 'group'}
                      className={`w-full border p-3 rounded-xl outline-none text-xs font-bold transition-all ${formData.targetAudience === 'group' ? 'bg-[#151419] text-purple-400 border-purple-500/50 focus:ring-2 focus:ring-purple-500' : 'bg-[#151419]/50 text-gray-600 border-gray-800 cursor-not-allowed'}`}
                      value={formData.groupType}
                      onChange={(e) => setFormData({ ...formData, groupType: e.target.value })}
                    >
                      <option value="newbie">Mới (Newbie)</option>
                      <option value="vip">VIP (VIP)</option>
                      <option value="frequent">Quen (Normal)</option>
                      <option value="inactive">Ngủ đông</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Ngày hết hạn</label>
                  <input
                    required
                    type="date"
                    className="w-full bg-[#151419] border border-gray-700 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-white text-sm transition-all"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-700">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="w-full sm:flex-1 px-4 py-3 bg-[#151419] border border-gray-700 rounded-xl text-gray-400 font-bold text-sm hover:bg-gray-800 transition-all"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all"
                  >
                    Xác nhận
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}


      </div>
    </div>
  );
};

export default CouponManager;