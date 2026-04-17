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
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 uppercase tracking-wide">Quản lý Coupon</h1>
            <p className="text-gray-500 text-sm mt-1">Tổng số mã hiện có: {coupons.length}</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 shadow-md transition-colors"
          >
            <FiPlus size={20} /> TẠO MÃ MỚI
          </button>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-100 text-gray-600 uppercase text-xs font-bold tracking-wider">
                <tr>
                  <th className="p-4 border-b">Mã Code</th>
                  <th className="p-4 border-b text-center">Giảm giá</th>
                  <th className="p-4 border-b">Ngày hết hạn</th>
                  <th className="p-4 border-b text-center">Đã dùng / Giới hạn</th>
                  <th className="p-4 border-b text-center">Trạng thái</th>
                  <th className="p-4 border-b text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="p-10 text-center text-gray-500 font-medium">Đang tải dữ liệu...</td>
                  </tr>
                ) : currentCoupons.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-10 text-center text-gray-500">Chưa có mã giảm giá nào.</td>
                  </tr>
                ) : (
                  currentCoupons.map((item) => {
                    const isExpired = new Date(item.expiryDate) < new Date();
                    return (
                      <tr key={item._id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4">
                          <span className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded font-mono font-bold border border-blue-200 uppercase">
                            {item.code}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <p className="font-bold text-red-600 text-base">{item.discountPercent}%</p>
                          {item.targetAudience === 'group' && (
                             <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 mt-1 rounded font-bold uppercase whitespace-nowrap inline-block">Nhóm: {item.groupType}</span>
                          )}
                        </td>
                        <td className="p-4 text-gray-700 font-medium">
                          {new Date(item.expiryDate).toLocaleDateString("vi-VN")}
                          {isExpired && <span className="ml-2 text-xs text-red-500 font-bold bg-red-100 px-2 py-0.5 rounded">(Hết hạn)</span>}
                        </td>
                        <td className="p-4 text-center">
                          <span className="font-bold text-gray-800">{item.usedCount}</span>
                          <span className="text-gray-400 mx-1">/</span>
                          <span className="text-gray-500">{item.usageLimit}</span>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${item.isActive ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"}`}>
                            {item.isActive ? "Đang bật" : "Đã tắt"}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleToggleStatus(item._id, item.isActive)}
                            title={item.isActive ? "Tắt mã này" : "Bật mã này"}
                            className={`p-2 rounded-lg transition-colors shadow-sm ${item.isActive ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-green-50 text-green-600 hover:bg-green-100"}`}
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

          {/* Phân trang (Pagination) */}
          {totalPages > 1 && (
            <div className="p-4 border-t flex items-center justify-between bg-gray-50">
              <span className="text-sm text-gray-600">
                Hiển thị <span className="font-bold">{indexOfFirstItem + 1}</span> đến <span className="font-bold">{Math.min(indexOfLastItem, coupons.length)}</span> trong số <span className="font-bold">{coupons.length}</span> mã
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  className="p-2 border bg-white rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <FiChevronLeft size={18} />
                </button>
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="p-2 border bg-white rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <FiChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Thêm Mới */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl w-full max-w-md shadow-2xl">
              <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-lg font-bold uppercase text-gray-800">Thêm mã giảm giá mới</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500 text-2xl font-bold">&times;</button>
              </div>

              <form onSubmit={handleCreateSubmit} className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Mã Coupon (Tự động in hoa)</label>
                  <input
                    required
                    type="text"
                    placeholder="VD: KHAIXUAN2024"
                    className="w-full border p-2.5 rounded-lg outline-none focus:border-blue-500 uppercase font-mono"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">% Giảm giá</label>
                    <input
                      required
                      type="number"
                      min="1"
                      max="100"
                      placeholder="10"
                      className="w-full border p-2.5 rounded-lg outline-none focus:border-blue-500"
                      value={formData.discountPercent}
                      onChange={(e) => setFormData({ ...formData, discountPercent: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Giới hạn số lượt</label>
                    <input
                      required
                      type="number"
                      min="1"
                      placeholder="100"
                      className="w-full border p-2.5 rounded-lg outline-none focus:border-blue-500"
                      value={formData.usageLimit}
                      onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Đối tượng nhận mã</label>
                    <select
                      className="w-full border p-2.5 rounded-lg outline-none focus:border-blue-500 bg-white"
                      value={formData.targetAudience}
                      onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                    >
                      <option value="all">Tất cả khách hàng</option>
                      <option value="group">Chỉ định theo Nhóm</option>
                    </select>
                  </div>
                  <div>
                    <label className={`block text-sm font-semibold mb-1 ${formData.targetAudience === 'group' ? 'text-purple-700' : 'text-gray-400'}`}>Chọn Nhóm</label>
                    <select
                      disabled={formData.targetAudience !== 'group'}
                      className={`w-full border p-2.5 rounded-lg outline-none focus:border-purple-500 font-semibold ${formData.targetAudience === 'group' ? 'bg-purple-50 text-purple-900 border-purple-200' : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'}`}
                      value={formData.groupType}
                      onChange={(e) => setFormData({ ...formData, groupType: e.target.value })}
                    >
                      <option value="newbie">Khách mới (Newbie)</option>
                      <option value="vip">Khách VIP (VIP)</option>
                      <option value="frequent">Khách quen (Normal)</option>
                      <option value="inactive">Khách ngủ đông</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Ngày hết hạn</label>
                  <input
                    required
                    type="date"
                    className="w-full border p-2.5 rounded-lg outline-none focus:border-blue-500"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  />
                </div>

                <div className="flex gap-3 pt-4 mt-2 border-t">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-2.5 border rounded-lg text-gray-600 font-semibold hover:bg-gray-50 transition"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                  >
                    Xác nhận thêm
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