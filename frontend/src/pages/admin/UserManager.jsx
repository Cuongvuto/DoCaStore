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
    <div className="p-6 md:p-8 bg-[#151419] min-h-screen">
      <div className="max-w-7xl mx-auto">
        
        {/* Header & Công cụ */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white uppercase tracking-wide">Quản lý Tài Khoản</h1>
            <p className="text-gray-400 text-sm mt-1">Tổng số người dùng: {users.length}</p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <form onSubmit={handleSearch} className="relative flex-1 md:w-64">
              <input
                type="text"
                placeholder="Tìm tên người dùng..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              />
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <button type="submit" className="hidden"></button>
            </form>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition shadow-sm"
            >
              <Plus size={18} /> <span className="hidden md:inline">Thêm User</span>
            </button>
          </div>
        </div>

        {/* Bảng danh sách */}
        <div className="bg-[#202028] rounded-xl shadow-sm border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-800 text-gray-300 uppercase text-xs font-bold tracking-wider">
                <tr>
                  <th className="p-4 border-b">ID</th>
                  <th className="p-4 border-b">Họ và Tên</th>
                  <th className="p-4 border-b">Email</th>
                  <th className="p-4 border-b">Hạng</th> {/* CỘT MỚI */}
                  <th className="p-4 border-b">Đã chi tiêu</th> {/* CỘT MỚI */}
                  <th className="p-4 border-b">Phân quyền</th>
                  <th className="p-4 border-b text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {loading ? (
                  <tr><td colSpan="7" className="p-10 text-center text-gray-400 font-medium">Đang tải dữ liệu...</td></tr>
                ) : currentUsers.length === 0 ? (
                  <tr><td colSpan="7" className="p-10 text-center text-gray-400">Không tìm thấy người dùng nào.</td></tr>
                ) : (
                  currentUsers.map((user) => (
                    <tr key={user._id} className="hover:bg-[#151419] transition-colors">
                      <td className="p-4 font-mono text-xs text-gray-400">{user._id.slice(-6).toUpperCase()}</td>
                      <td className="p-4 font-bold text-white">{user.name}</td>
                      <td className="p-4 text-gray-300">{user.email}</td>
                      
                      {/* DỮ LIỆU CỘT MỚI */}
                      <td className="p-4">{getTierBadge(user.tier)}</td>
                      <td className="p-4 font-medium text-green-600">{formatCurrency(user.totalSpent)}</td>
                      
                      <td className="p-4">
                        {canChangeRole ? (
                          <select
                            value={user.role}
                            onChange={(e) => handleRoleChange(user._id, e.target.value)}
                            className="bg-[#151419] text-gray-300 border border-gray-600 rounded py-1 px-2 outline-none focus:ring-1 focus:ring-blue-500 text-xs font-bold uppercase transition"
                            disabled={user._id === currentUser?._id && user.role === 'superadmin'} // Không cho tự đổi role superadmin của mình
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
                          className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors shadow-sm inline-flex items-center justify-center"
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
            <div className="p-4 border-t flex items-center justify-between bg-[#151419]">
              <span className="text-sm text-gray-300">
                Hiển thị <span className="font-bold">{indexOfFirstItem + 1}</span> - <span className="font-bold">{Math.min(indexOfLastItem, users.length)}</span> / <span className="font-bold">{users.length}</span>
              </span>
              <div className="flex gap-2">
                <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="p-2 border bg-[#202028] rounded-md hover:bg-gray-800 disabled:opacity-50 transition"><ChevronLeft size={18} /></button>
                <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="p-2 border bg-[#202028] rounded-md hover:bg-gray-800 disabled:opacity-50 transition"><ChevronRight size={18} /></button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Thêm Người Dùng */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-[#202028] rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-[#151419]">
                <h2 className="text-lg font-bold uppercase text-white">Thêm Người Dùng Mới</h2>
                <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-red-500"><X size={24} /></button>
              </div>

              <form onSubmit={handleAddUser} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-1">Họ và Tên</label>
                  <input required type="text" value={newUser.name} onChange={(e) => setNewUser({...newUser, name: e.target.value})} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nguyễn Văn A" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-1">Email</label>
                  <input required type="email" value={newUser.email} onChange={(e) => setNewUser({...newUser, email: e.target.value})} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="email@example.com" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-1">Mật khẩu</label>
                  <input required type="password" value={newUser.password} onChange={(e) => setNewUser({...newUser, password: e.target.value})} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="••••••••" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-1">Phân quyền</label>
                  <select value={newUser.role} onChange={(e) => setNewUser({...newUser, role: e.target.value})} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-[#202028]">
                    <option value="customer">Customer (Khách hàng)</option>
                    <option value="admin">Admin (Quản trị viên chung)</option>
                    <option value="superadmin">Super Admin (Quản trị cấp cao)</option>
                    <option value="product_admin">Product Admin (Quản lý Sản phẩm)</option>
                    <option value="order_admin">Order Admin (Quản lý Đơn hàng)</option>
                    <option value="support_admin">Support Admin (CSKH)</option>
                  </select>
                </div>
                
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-2 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-300 transition">Hủy</button>
                  <button type="submit" className="flex-1 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition">Tạo mới</button>
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