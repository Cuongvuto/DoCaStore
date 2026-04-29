import React, { useState, useEffect } from "react";
import axiosClient from "../../api/axiosClient";
import { toast } from "sonner";
import { Bell, Plus, Trash2, X, Send, Megaphone, Package, Info, ChevronLeft, ChevronRight, Users, User, Filter } from "lucide-react";

const NotificationManager = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [isModalOpen, setIsModalOpen] = useState(false);
  // 🔥 Thêm giá trị 'group' vào targetAudience
  const [targetAudience, setTargetAudience] = useState("all"); 
  const [newNoti, setNewNoti] = useState({ 
    title: "", 
    message: "", 
    type: "promotion", 
    linkUrl: "",
    userId: "",
    groupType: "newbie" // 🔥 Thêm trường này để gửi cho nhóm
  });

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get("/notifications/admin"); 
      if (res.data?.success) {
        setNotifications(res.data.data);
      }
    } catch (error) {
      toast.error("Lỗi khi tải danh sách thông báo!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleSendNotification = async (e) => {
    e.preventDefault();

    const payload = {
      title: newNoti.title,
      message: newNoti.message,
      type: newNoti.type,
      linkUrl: newNoti.linkUrl,
      targetAudience: targetAudience // Gửi targetAudience xuống Backend
    };

    // Chuẩn bị payload theo từng đối tượng
    if (targetAudience === "specific") {
      if (!newNoti.userId.trim()) {
        toast.error("Vui lòng nhập ID của người dùng!");
        return;
      }
      payload.userId = newNoti.userId.trim();
    } else if (targetAudience === "group") {
      payload.groupType = newNoti.groupType; // Gửi loại nhóm xuống
    }

    try {
      const res = await axiosClient.post("/notifications/admin", payload);
      if (res.data?.success) {
        toast.success("Đã gửi thông báo thành công!");
        setIsModalOpen(false);
        setNewNoti({ title: "", message: "", type: "promotion", linkUrl: "", userId: "", groupType: "newbie" });
        setTargetAudience("all");
        fetchNotifications();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi khi gửi thông báo!");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(`Sếp có chắc chắn muốn xóa thông báo này không?`)) return;
    try {
      const res = await axiosClient.delete(`/notifications/admin/${id}`);
      if (res.data?.success) {
        toast.success("Xóa thông báo thành công!");
        setNotifications(notifications.filter(n => n._id !== id));
      }
    } catch (error) {
      toast.error("Lỗi khi xóa thông báo!");
    }
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = notifications.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(notifications.length / itemsPerPage);

  const getTypeBadge = (type) => {
    switch (type) {
      case 'order': return <span className="flex items-center gap-1 w-fit bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-1 rounded text-xs font-bold uppercase"><Package size={12}/> Đơn hàng</span>;
      case 'promotion': return <span className="flex items-center gap-1 w-fit bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-1 rounded text-xs font-bold uppercase"><Megaphone size={12}/> Khuyến mãi</span>;
      default: return <span className="flex items-center gap-1 w-fit bg-[#151419] text-gray-400 border border-gray-700 px-2 py-1 rounded text-xs font-bold uppercase"><Info size={12}/> Hệ thống</span>;
    }
  };

  // Hàm render hiển thị "Đối tượng nhận" trên bảng cho ngầu
  const renderTargetInfo = (noti) => {
    if (noti.targetAudience === 'group') {
      return (
        <span className="text-purple-400 font-bold text-[10px] bg-purple-500/10 px-2 py-1 rounded w-fit uppercase flex items-center gap-1 border border-purple-500/20">
          <Filter size={12} /> Nhóm KH ({noti.groupType})
        </span>
      );
    }
    if (noti.userId) {
      return (
        <div className="flex flex-col">
          <span className="text-blue-400 font-bold text-[10px] bg-blue-500/10 px-2 py-1 rounded w-fit uppercase flex items-center gap-1 border border-blue-500/20">
            <User size={12} /> Cá nhân
          </span>
          <span className="text-gray-500 text-[10px] mt-1 break-all">ID: {noti.userId}</span>
        </div>
      );
    }
    return (
      <span className="text-red-400 font-bold text-[10px] bg-red-500/10 px-2 py-1 rounded w-fit uppercase flex items-center gap-1 border border-red-500/20">
        <Users size={12} /> Toàn hệ thống
      </span>
    );
  };

  return (
    <div className="p-4 md:p-8 bg-[#151419] min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white uppercase tracking-wide flex items-center gap-2">
              <Bell className="text-blue-500" /> Quản lý Thông báo
            </h1>
            <p className="text-gray-400 text-sm mt-1">Đã gửi tổng cộng: <span className="text-[#7294ff] font-bold">{notifications.length}</span> thông báo</p>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-600/20 text-sm">
            <Send size={18} /> Tạo Thông Báo Mới
          </button>
        </div>

        <div className="bg-[#202028] rounded-2xl shadow-xl border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead className="bg-[#151419] text-gray-400 uppercase text-[10px] md:text-xs font-bold tracking-widest border-b border-gray-700">
                <tr>
                  <th className="p-4">Loại</th>
                  <th className="p-4">Tiêu đề & Nội dung</th>
                  <th className="p-4">Đối tượng nhận</th>
                  <th className="p-4">Thời gian</th>
                  <th className="p-4 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-sm">
                {loading ? (
                  <tr><td colSpan="5" className="p-10 text-center text-gray-400 font-medium italic">Đang tải dữ liệu...</td></tr>
                ) : currentItems.length === 0 ? (
                  <tr><td colSpan="5" className="p-10 text-center text-gray-400">Chưa có thông báo nào.</td></tr>
                ) : (
                  currentItems.map((noti) => (
                    <tr key={noti._id} className="hover:bg-[#151419]/50 transition-colors">
                      <td className="p-4">{getTypeBadge(noti.type)}</td>
                      <td className="p-4 max-w-xs">
                        <p className="font-bold text-white truncate">{noti.title}</p>
                        <p className="text-gray-400 text-xs truncate mt-1">{noti.message}</p>
                      </td>
                      <td className="p-4">{renderTargetInfo(noti)}</td>
                      <td className="p-4 text-gray-400 text-xs font-medium whitespace-nowrap">{new Date(noti.createdAt).toLocaleString('vi-VN')}</td>
                      <td className="p-4 text-center">
                        <button onClick={() => handleDelete(noti._id)} className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-colors shadow-sm inline-flex items-center justify-center border border-transparent hover:border-red-500/20">
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="p-4 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between bg-[#151419]/50 gap-4">
              <span className="text-xs md:text-sm text-gray-400">
                Trang <span className="text-white font-bold">{currentPage}</span> / <span className="text-white font-bold">{totalPages}</span>
              </span>
              <div className="flex gap-2">
                <button onClick={() => setCurrentPage(p => Math.max(p-1,1))} disabled={currentPage===1} className="p-2 border border-gray-700 bg-[#202028] rounded-xl hover:bg-gray-800 disabled:opacity-30 transition-all"><ChevronLeft size={18}/></button>
                <button onClick={() => setCurrentPage(p => Math.min(p+1,totalPages))} disabled={currentPage===totalPages} className="p-2 border border-gray-700 bg-[#202028] rounded-xl hover:bg-gray-800 disabled:opacity-30 transition-all"><ChevronRight size={18}/></button>
              </div>
            </div>
          )}
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-[#202028] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-gray-700">
              <div className="p-5 border-b border-gray-700 flex justify-between items-center bg-[#202028]">
                <h2 className="text-lg font-bold uppercase text-white flex items-center gap-2">
                  <Send size={20} className="text-blue-500"/> Gửi Thông Báo Mới
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-700 rounded-full transition-colors text-gray-400 hover:text-red-400"><X size={22} /></button>
              </div>

              <form onSubmit={handleSendNotification} className="p-5 md:p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
                
                {/* Đối tượng nhận */}
                <div className="bg-[#151419] p-4 rounded-xl border border-gray-700">
                  <label className="block text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">Đối tượng nhận thông báo</label>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="audience" value="all" checked={targetAudience === "all"} onChange={(e) => setTargetAudience(e.target.value)} className="w-4 h-4 accent-blue-500" />
                      <span className="text-sm font-medium text-gray-300 flex items-center gap-1"><Users size={15}/> Toàn hệ thống</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="audience" value="group" checked={targetAudience === "group"} onChange={(e) => setTargetAudience(e.target.value)} className="w-4 h-4 accent-purple-500" />
                      <span className="text-sm font-medium text-gray-300 flex items-center gap-1"><Filter size={15}/> Nhóm khách hàng</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="audience" value="specific" checked={targetAudience === "specific"} onChange={(e) => setTargetAudience(e.target.value)} className="w-4 h-4 accent-blue-500" />
                      <span className="text-sm font-medium text-gray-300 flex items-center gap-1"><User size={15}/> Một người dùng</span>
                    </label>
                  </div>
                  
                  {targetAudience === "group" && (
                    <div className="mt-4">
                      <select 
                        value={newNoti.groupType} 
                        onChange={(e) => setNewNoti({...newNoti, groupType: e.target.value})} 
                        className="w-full p-2.5 bg-[#202028] border border-purple-500/40 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-sm text-purple-400 font-semibold transition-all"
                      >
                        <option value="newbie">Khách mới (Chưa có đơn hàng nào)</option>
                        <option value="vip">Khách VIP (Đã mua trên 10 đơn hàng)</option>
                        <option value="frequent">Khách quen (Đã mua trong 30 ngày qua)</option>
                        <option value="inactive">Khách ngủ đông (Không mua gì trên 3 tháng)</option>
                      </select>
                      <p className="text-[11px] text-purple-400/70 mt-1 italic">* Backend sẽ tự động lọc danh sách khách hàng này.</p>
                    </div>
                  )}

                  {targetAudience === "specific" && (
                    <div className="mt-4">
                      <input type="text" value={newNoti.userId} onChange={(e) => setNewNoti({...newNoti, userId: e.target.value})} className="w-full p-2.5 bg-[#202028] border border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm text-white transition-all" placeholder="Nhập chính xác ID của người dùng..." required={targetAudience === "specific"} />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-tight">Loại thông báo</label>
                    <select value={newNoti.type} onChange={(e) => setNewNoti({...newNoti, type: e.target.value})} className="w-full p-2.5 bg-[#151419] border border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-white text-sm transition-all">
                      <option value="promotion">Khuyến mãi / Sale</option>
                      <option value="system">Thông báo hệ thống</option>
                      <option value="order">Cập nhật đơn hàng</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-tight">Link đính kèm (Tùy chọn)</label>
                    <input type="text" value={newNoti.linkUrl} onChange={(e) => setNewNoti({...newNoti, linkUrl: e.target.value})} className="w-full p-2.5 bg-[#151419] border border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-white text-sm transition-all" placeholder="VD: /products" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-tight">Tiêu đề</label>
                  <input required type="text" value={newNoti.title} onChange={(e) => setNewNoti({...newNoti, title: e.target.value})} className="w-full p-2.5 bg-[#151419] border border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-white text-sm transition-all" placeholder="VD: Tặng bạn mã giảm 50K đơn đầu tiên!" />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-tight">Nội dung chi tiết</label>
                  <textarea required rows="3" value={newNoti.message} onChange={(e) => setNewNoti({...newNoti, message: e.target.value})} className="w-full p-2.5 bg-[#151419] border border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 resize-none text-white text-sm transition-all" placeholder="Nhập nội dung gửi đến khách hàng..." />
                </div>
                
                <div className="pt-4 border-t border-gray-700 flex flex-col sm:flex-row gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 bg-[#151419] text-gray-400 font-bold rounded-xl hover:bg-gray-800 transition border border-gray-700">Hủy</button>
                  <button type="submit" className="flex-1 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20">
                    <Send size={18}/> 
                    {targetAudience === "all" ? "Bắn toàn hệ thống" : targetAudience === "group" ? "Gửi theo nhóm" : "Gửi cá nhân"}
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

export default NotificationManager;