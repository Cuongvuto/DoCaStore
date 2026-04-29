import React, { useState, useEffect } from "react";
import axiosClient from "../../api/axiosClient";
import { toast } from "sonner";
import { Search, Trash2, Plus, X, Shield, User as UserIcon, ChevronLeft, ChevronRight, Crown } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const UserManager = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // State Tìm kiếm
  const [searchQuery, setSearchQuery] = useState("");

  const { user: currentUser } = useAuth();
  const canChangeRole = currentUser?.role === 'admin' || currentUser?.role === 'superadmin';

  // State Modal Thêm User
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "customer" });

  // --- FETCH DỮ LIỆU ---
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get("/user"); 
      if (res.data?.success) {
        setUsers(res.data.data);
      }
    } catch (error) {
      toast.error("Lỗi khi tải danh sách người dùng!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // --- TÌM KIẾM THEO TÊN ---
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      fetchUsers(); 
      return;
    }
    setLoading(true);
    try {
      const res = await axiosClient.get(`/user/search?name=${searchQuery}`);
      if (res.data?.success) {
        setUsers(res.data.data);
        setCurrentPage(1); 
        toast.success(res.data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi khi tìm kiếm!");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // --- XÓA NGƯỜI DÙNG ---
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Sếp có chắc chắn muốn xóa người dùng "${name}" không? Hành động này không thể hoàn tác!`)) {
      return;
    }
    try {
      const res = await axiosClient.delete(`/user/${id}`);
      if (res.data?.success) {
        toast.success("Xóa người dùng thành công!");
        setUsers(users.filter(user => user._id !== id));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi khi xóa người dùng!");
    }
  };

  // --- THAY ĐỔI ROLE ---
  const handleRoleChange = async (userId, newRole) => {
    try {
      const res = await axiosClient.put(`/user/${userId}/role`, { role: newRole });
      if (res.data?.success) {
        toast.success("Thay đổi quyền thành công!");
        setUsers(users.map(u => u._id === userId ? { ...u, role: newRole } : u));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi khi đổi quyền!");
    }
  };

  // --- THÊM NGƯỜI DÙNG MỚI ---
  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      const res = await axiosClient.post("/user/register", newUser);
      if (res.data?.success) {
        toast.success("Thêm người dùng mới thành công!");
        setIsAddModalOpen(false);
        setNewUser({ name: "", email: "", password: "", role: "customer" });
        fetchUsers(); 
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi khi thêm người dùng!");
    }
  };

  // --- LOGIC PHÂN TRANG ---
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = users.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(users.length / itemsPerPage);

  // --- FORMAT HIỂN THỊ ---
  const getRoleBadge = (role) => {
    switch (role) {
      case 'superadmin': return <span className="flex items-center gap-1 w-fit bg-red-900/30 text-red-400 border border-red-500/30 px-2 py-1 rounded text-xs font-bold uppercase"><Shield size={12}/> Super Admin</span>;
      case 'admin': return <span className="flex items-center gap-1 w-fit bg-red-900/30 text-red-400 border border-red-500/30 px-2 py-1 rounded text-xs font-bold uppercase"><Shield size={12}/> Admin</span>;
      case 'product_admin': return <span className="flex items-center gap-1 w-fit bg-blue-900/30 text-blue-400 border border-blue-500/30 px-2 py-1 rounded text-xs font-bold uppercase"><Shield size={12}/> Product Admin</span>;
      case 'order_admin': return <span className="flex items-center gap-1 w-fit bg-yellow-900/30 text-yellow-400 border border-yellow-500/30 px-2 py-1 rounded text-xs font-bold uppercase"><Shield size={12}/> Order Admin</span>;
      case 'support_admin': return <span className="flex items-center gap-1 w-fit bg-purple-900/30 text-purple-400 border border-purple-500/30 px-2 py-1 rounded text-xs font-bold uppercase"><Shield size={12}/> Support Admin</span>;
      default: return <span className="flex items-center gap-1 w-fit bg-green-900/30 text-green-400 border border-green-500/30 px-2 py-1 rounded text-xs font-bold uppercase"><UserIcon size={12}/> Customer</span>;
    }
  };

  // MỚI: Badge cho Rank (Cấp bậc)
  const getTierBadge = (tier) => {
    switch (tier) {
      case 'vip':
        return <span className="flex items-center gap-1 w-fit bg-purple-100 text-purple-800 border border-purple-200 px-2 py-1 rounded text-xs font-bold uppercase shadow-sm"><Crown size={12}/> VIP</span>;
      case 'gold':
        return <span className="flex items-center gap-1 w-fit bg-yellow-100 text-yellow-800 border border-yellow-200 px-2 py-1 rounded text-xs font-bold uppercase"><Crown size={12}/> Gold</span>;
      case 'silver':
        return <span className="flex items-center gap-1 w-fit bg-gray-700 text-white border border-gray-700 px-2 py-1 rounded text-xs font-bold uppercase"><Crown size={12}/> Silver</span>;
      case 'normal':
        return <span className="flex items-center gap-1 w-fit bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded text-xs font-bold uppercase">Normal</span>;
      default: // newbie
        return <span className="flex items-center gap-1 w-fit bg-slate-100 text-slate-600 border border-slate-200 px-2 py-1 rounded text-xs font-bold uppercase">Newbie</span>;
    }
  };

  // MỚI: Format tiền Việt Nam
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
  };

  return (
    <div className="p-4 md:p-8 bg-[#151419] min-h-screen">
      <div className="max-w-7xl mx-auto">
        
        {/* Header & Công cụ */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white uppercase tracking-wider">Quản lý Tài Khoản</h1>
            <p className="text-gray-400 text-xs md:text-sm mt-1">Tổng số người dùng: <span className="text-[#7294ff] font-bold">{users.length}</span></p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
            <form onSubmit={handleSearch} className="relative w-full sm:w-64 lg:w-80">
              <input
                type="text"
                placeholder="Tìm tên người dùng..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#202028] text-white rounded-xl border border-gray-700 focus:ring-2 focus:ring-[#7294ff] focus:border-transparent outline-none transition-all text-sm"
              />
              <Search className="absolute left-3 top-3 text-gray-500" size={18} />
            </form>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-[#7294ff] text-white rounded-xl font-bold hover:bg-[#5a7dee] transition-all shadow-lg shadow-[#7294ff]/20 text-sm"
            >
              <Plus size={18} /> <span>Thêm User</span>
            </button>
          </div>
        </div>

        {/* Bảng danh sách */}
        <div className="bg-[#202028] rounded-2xl shadow-xl border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead className="bg-[#151419] text-gray-400 uppercase text-[10px] md:text-xs font-bold tracking-widest border-b border-gray-700">
                <tr>
                  <th className="p-4">ID</th>
                  <th className="p-4">Họ và Tên</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Hạng</th>
                  <th className="p-4">Đã chi tiêu</th>
                  <th className="p-4">Phân quyền</th>
                  <th className="p-4 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-sm">
                {loading ? (
                  <tr><td colSpan="7" className="p-12 text-center text-gray-500 font-medium">Đang tải dữ liệu...</td></tr>
                ) : currentUsers.length === 0 ? (
                  <tr><td colSpan="7" className="p-12 text-center text-gray-500 font-medium">Không tìm thấy người dùng nào.</td></tr>
                ) : (
                  currentUsers.map((user) => (
                    <tr key={user._id} className="hover:bg-[#151419]/50 transition-colors">
                      <td className="p-4 font-mono text-[10px] text-gray-500">{user._id.slice(-6).toUpperCase()}</td>
                      <td className="p-4">
                        <div className="font-bold text-white text-sm md:text-base">{user.name}</div>
                      </td>
                      <td className="p-4 text-gray-400 text-xs md:text-sm">{user.email}</td>
                      
                      <td className="p-4">{getTierBadge(user.tier)}</td>
                      <td className="p-4 font-bold text-[#00c9a7] text-xs md:text-sm">{formatCurrency(user.totalSpent)}</td>
                      
                      <td className="p-4">
                        {canChangeRole ? (
                          <select
                            value={user.role}
                            onChange={(e) => handleRoleChange(user._id, e.target.value)}
                            className="bg-[#151419] text-gray-300 border border-gray-700 rounded-lg py-1.5 px-3 outline-none focus:ring-2 focus:ring-[#7294ff] text-[10px] md:text-xs font-bold uppercase transition-all"
                            disabled={user._id === currentUser?._id && user.role === 'superadmin'}
                          >
                            <option value="customer">Customer</option>
                            <option value="admin">Admin</option>
                            <option value="superadmin">Super Admin</option>
                            <option value="product_admin">Product Admin</option>
                            <option value="order_admin">Order Admin</option>
                            <option value="support_admin">Support Admin</option>
                          </select>
                        ) : (
                          getRoleBadge(user.role)
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleDelete(user._id, user.name)}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all shadow-sm inline-flex items-center justify-center border border-transparent hover:border-red-500/20"
                          title="Xóa tài khoản"
                        >
                          <Trash2 size={18} />
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
                Hiển thị <span className="text-white font-bold">{indexOfFirstItem + 1}</span> - <span className="text-white font-bold">{Math.min(indexOfLastItem, users.length)}</span> / <span className="text-white font-bold">{users.length}</span>
              </span>
              <div className="flex gap-2">
                <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="p-2 border border-gray-700 bg-[#202028] rounded-xl hover:bg-gray-800 disabled:opacity-30 transition-all"><ChevronLeft size={18} /></button>
                <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="p-2 border border-gray-700 bg-[#202028] rounded-xl hover:bg-gray-800 disabled:opacity-30 transition-all"><ChevronRight size={18} /></button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Thêm Người Dùng */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-[#202028] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-700">
              <div className="p-5 border-b border-gray-700 flex justify-between items-center bg-[#202028]">
                <h2 className="text-lg font-bold uppercase text-white tracking-wide">Thêm Người Dùng Mới</h2>
                <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-gray-700 rounded-full transition-colors text-gray-400 hover:text-red-500"><X size={24} /></button>
              </div>

              <form onSubmit={handleAddUser} className="p-6 space-y-5">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-tight">Họ và Tên</label>
                  <input required type="text" value={newUser.name} onChange={(e) => setNewUser({...newUser, name: e.target.value})} className="w-full p-2.5 bg-[#151419] border border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-[#7294ff] text-white text-sm transition-all" placeholder="Nguyễn Văn A" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-tight">Email</label>
                  <input required type="email" value={newUser.email} onChange={(e) => setNewUser({...newUser, email: e.target.value})} className="w-full p-2.5 bg-[#151419] border border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-[#7294ff] text-white text-sm transition-all" placeholder="email@example.com" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-tight">Mật khẩu</label>
                  <input required type="password" value={newUser.password} onChange={(e) => setNewUser({...newUser, password: e.target.value})} className="w-full p-2.5 bg-[#151419] border border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-[#7294ff] text-white text-sm transition-all" placeholder="••••••••" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-tight">Phân quyền</label>
                  <select value={newUser.role} onChange={(e) => setNewUser({...newUser, role: e.target.value})} className="w-full p-2.5 bg-[#151419] border border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-[#7294ff] text-white text-sm transition-all">
                    <option value="customer">Customer (Khách hàng)</option>
                    <option value="admin">Admin (Quản trị viên chung)</option>
                    <option value="superadmin">Super Admin (Quản trị cấp cao)</option>
                    <option value="product_admin">Product Admin (Quản lý Sản phẩm)</option>
                    <option value="order_admin">Order Admin (Quản lý Đơn hàng)</option>
                    <option value="support_admin">Support Admin (CSKH)</option>
                  </select>
                </div>
                
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-2.5 bg-[#151419] text-gray-400 font-bold rounded-xl hover:bg-gray-800 transition-all border border-gray-700">Hủy</button>
                  <button type="submit" className="flex-1 py-2.5 bg-[#7294ff] text-white font-bold rounded-xl hover:bg-[#5a7dee] transition-all shadow-lg shadow-[#7294ff]/20">Tạo mới</button>
                </div>
              </form>
            </div>
          </div>
        )}


      </div>
    </div>
  );
};

export default UserManager;