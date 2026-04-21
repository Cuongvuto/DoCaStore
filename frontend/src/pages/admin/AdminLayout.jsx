import React, { useEffect, useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { 
  LayoutDashboard, 
  Package, 
  FolderTree, 
  ShoppingCart, 
  Users, 
  Image as ImageIcon, 
  LogOut,
  Newspaper,
  Ticket,
  Bell,
  Search,
  Mail,
  Settings,
  Menu
} from 'lucide-react';
import { toast } from 'sonner';

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation(); 
  const { user, logout } = useAuth();
  const role = user?.role;
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { socket } = useNotification();
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    if (!socket) return;
    
    const handleNewMessage = () => {
      if (location.pathname !== '/admin/messages') {
        setUnreadMessages(prev => prev + 1);
      }
    };

    socket.on('new_message_notification', handleNewMessage);
    return () => socket.off('new_message_notification', handleNewMessage);
  }, [socket, location.pathname]);

  useEffect(() => {
    if (location.pathname === '/admin/messages') {
      setUnreadMessages(0);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (!role || role === 'customer') {
      toast.error('Bạn không có quyền truy cập khu vực này!');
      navigate('/');
    }
  }, [role, navigate]);

  if (!role || role === 'customer') return null;

  const menuItems = [
    { path: '/admin', name: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'superadmin', 'product_admin', 'order_admin', 'support_admin'] },
    { path: '/admin/products', name: 'Sản phẩm', icon: Package, roles: ['admin', 'superadmin', 'product_admin'] },
    { path: '/admin/categories', name: 'Danh mục', icon: FolderTree, roles: ['admin', 'superadmin', 'product_admin'] },
    { path: '/admin/orders', name: 'Đơn hàng', icon: ShoppingCart, roles: ['admin', 'superadmin', 'order_admin'] },
    { path: '/admin/users', name: 'Người dùng', icon: Users, roles: ['admin', 'superadmin'] },
    { path: '/admin/banners', name: 'Banner', icon: ImageIcon, roles: ['admin', 'superadmin', 'product_admin'] },
    { path: '/admin/news', name: 'Tin Tức', icon: Newspaper, roles: ['admin', 'superadmin', 'product_admin'] }, 
    { path: '/admin/coupons', name: 'Coupon', icon: Ticket, roles: ['admin', 'superadmin', 'order_admin'] }, 
    { path: '/admin/notifications', name: 'Thông báo', icon: Bell, roles: ['admin', 'superadmin', 'support_admin'] },
  ];

  const allowedMenuItems = menuItems.filter(item => item.roles.includes(role));

  return (
    <div className="admin-theme flex h-screen bg-[#151419] text-gray-200 font-sans overflow-hidden">
      
      {/* --- CỘT SIDEBAR BÊN TRÁI --- */}
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-[#202028] flex flex-col transition-all duration-300 z-20 border-r border-gray-800`}>
        
        {/* Logo / Header Sidebar */}
        <div className="h-20 flex items-center justify-center border-b border-gray-800 shrink-0">
          <Link to="/admin" className="flex items-center justify-center w-full px-4 text-[#7294ff]">
            <LayoutDashboard className="w-8 h-8 shrink-0" />
            {isSidebarOpen && <span className="ml-3 font-bold text-xl text-white tracking-wide truncate">DoCa Admin</span>}
          </Link>
        </div>
        
        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto py-6 custom-scrollbar">
          <ul className="space-y-4 px-3">
            {allowedMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path));

              return (
                <li key={item.path} className="relative group">
                  <Link 
                    to={item.path} 
                    className={`flex items-center p-3 rounded-xl transition-all duration-200 ${
                      isActive 
                        ? 'text-[#7294ff] relative' 
                        : 'text-gray-400 hover:text-gray-200'
                    } ${!isSidebarOpen && 'justify-center'}`}
                    title={!isSidebarOpen ? item.name : ""}
                  >
                    {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#7294ff] rounded-r-md"></div>}
                    <Icon className={`w-6 h-6 shrink-0 ${isActive ? 'text-[#7294ff]' : ''}`} />
                    {isSidebarOpen && <span className="ml-4 font-medium truncate">{item.name}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        
        {/* Nút Về trang chủ / Logout */}
        <div className="p-4 border-t border-gray-800">
          <button 
            onClick={() => { logout(); navigate('/'); }}
            className={`flex items-center w-full p-3 text-gray-400 hover:text-red-400 transition-all ${!isSidebarOpen && 'justify-center'}`}
            title={!isSidebarOpen ? "Đăng xuất" : ""}
          >
            <LogOut className="w-6 h-6 shrink-0" />
            {isSidebarOpen && <span className="ml-4 font-medium truncate">Đăng xuất</span>}
          </button>
        </div>
      </aside>

      {/* --- PHẦN NỘI DUNG BÊN PHẢI --- */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[#151419]">
        
        {/* Header */}
        <header className="h-20 bg-[#202028] border-b border-gray-800 flex items-center justify-between px-6 shrink-0 z-10">
          
          {/* Left: Toggle & Search */}
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 text-gray-400 hover:text-white transition-colors lg:hidden"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search" 
                className="bg-[#2a2a35] text-white pl-10 pr-4 py-2 rounded-lg border border-transparent focus:outline-none focus:border-[#7294ff] w-64 lg:w-80 transition-colors placeholder-gray-500"
              />
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-4">
            <Link to="/admin/messages" className="w-10 h-10 rounded-full bg-[#2a2a35] flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 transition-colors relative">
              <Mail className="w-5 h-5" />
              {unreadMessages > 0 && (
                <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-[#202028]"></span>
              )}
            </Link>
            <button className="w-10 h-10 rounded-full bg-[#2a2a35] flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 transition-colors">
              <Settings className="w-5 h-5" />
            </button>
            <button className="w-10 h-10 rounded-full bg-[#2a2a35] flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-[#7294ff] rounded-full"></span>
            </button>
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-700 ml-2 cursor-pointer">
              <img src={user?.avatar || "https://ui-avatars.com/api/?name=Admin&background=random"} alt="Admin Avatar" className="w-full h-full object-cover" />
            </div>
          </div>

        </header>

        {/* Nội dung thực tế (Outlet) */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar relative">
           <Outlet /> 
        </div>
      </main>

    </div>
  );
};

export default AdminLayout;