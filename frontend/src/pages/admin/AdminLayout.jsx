import React, { useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, 
  Package, 
  FolderTree, 
  ShoppingCart, 
  Users, 
  Image as ImageIcon, 
  ArrowLeft,
  Settings,
  Newspaper,
  Ticket,
  Bell // 1. Import thêm icon Bell cho Thông báo
} from 'lucide-react';
import { toast } from 'sonner';

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation(); 
  const { user } = useAuth();
  const role = user?.role; // 🚀 BẢO MẬT: Lấy role trực tiếp từ AuthContext (dữ liệu token Decoding) thay vì LocalStorage dễ bị sửa

  useEffect(() => {
    if (!role || role !== 'admin') {
      toast.error('Bạn không có quyền truy cập khu vực này!');
      navigate('/');
    }
  }, [role, navigate]);

  if (role !== 'admin') return null; 

  // 2. Thêm Quản lý Thông báo vào danh sách menu
  const menuItems = [
    { path: '/admin', name: 'Thống kê chung', icon: LayoutDashboard },
    { path: '/admin/products', name: 'Quản lý Sản phẩm', icon: Package },
    { path: '/admin/categories', name: 'Quản lý Danh mục', icon: FolderTree },
    { path: '/admin/orders', name: 'Quản lý Đơn hàng', icon: ShoppingCart },
    { path: '/admin/users', name: 'Quản lý User', icon: Users },
    { path: '/admin/banners', name: 'Quản lý Banner', icon: ImageIcon },
    { path: '/admin/news', name: 'Quản lý Tin Tức', icon: Newspaper }, 
    { path: '/admin/coupons', name: 'Quản lý Coupon', icon: Ticket }, 
    { path: '/admin/notifications', name: 'Quản lý Thông báo', icon: Bell }, // Thêm mục Thông báo ở đây
  ];

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
      
      {/* --- CỘT SIDEBAR BÊN TRÁI --- */}
      <aside className="w-64 bg-slate-900 flex flex-col shadow-2xl z-10 transition-all duration-300">
        
        {/* Logo / Header Sidebar */}
        <div className="h-16 flex items-center justify-center border-b border-slate-800 bg-slate-950/50">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 tracking-wide">
            <Settings className="w-6 h-6 text-[#5a8c76] animate-[spin_4s_linear_infinite]" /> 
            Admin Panel
          </h2>
        </div>
        
        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto py-6 custom-scrollbar">
          <ul className="space-y-2 px-4">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path));

              return (
                <li key={item.path}>
                  <Link 
                    to={item.path} 
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                      isActive 
                        ? 'bg-[#5a8c76] text-white shadow-md shadow-[#5a8c76]/30 font-semibold' 
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100 font-medium'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        
        {/* Nút Về trang chủ (Dưới cùng) */}
        <div className="p-4 border-t border-slate-800 bg-slate-900">
          <Link 
            to="/" 
            className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-xl transition-all font-semibold border border-transparent hover:border-red-500/20"
          >
            <ArrowLeft className="w-5 h-5" />
            Về trang Cửa hàng
          </Link>
        </div>
      </aside>

      {/* --- PHẦN NỘI DUNG BÊN PHẢI --- */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50">
        {/* Header giả */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-8 shadow-sm shrink-0">
          <h1 className="text-xl font-bold text-gray-800">
            {menuItems.find(item => location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path)))?.name || 'Bảng điều khiển'}
          </h1>
        </header>

        {/* Nội dung thực tế (Outlet) */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet /> 
          </div>
        </div>
      </main>

    </div>
  );
};

export default AdminLayout;