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
  Menu,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const MENU_ITEMS = [
  { path: '/admin', name: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'superadmin', 'product_admin', 'order_admin', 'support_admin'] },
  { path: '/admin/products', name: 'Sản phẩm', icon: Package, roles: ['admin', 'superadmin', 'product_admin'] },
  { path: '/admin/categories', name: 'Danh mục', icon: FolderTree, roles: ['admin', 'superadmin', 'product_admin'] },
  { path: '/admin/orders', name: 'Đơn hàng', icon: ShoppingCart, roles: ['admin', 'superadmin', 'order_admin'] },
  { path: '/admin/users', name: 'Người dùng', icon: Users, roles: ['admin', 'superadmin'] },
  { path: '/admin/banners', name: 'Banner', icon: ImageIcon, roles: ['admin', 'superadmin', 'product_admin'] },
  { path: '/admin/news', name: 'Tin tức', icon: Newspaper, roles: ['admin', 'superadmin', 'product_admin'] },
  { path: '/admin/coupons', name: 'Coupon', icon: Ticket, roles: ['admin', 'superadmin', 'order_admin'] },
  { path: '/admin/notifications', name: 'Thông báo', icon: Bell, roles: ['admin', 'superadmin', 'support_admin'] },
  { path: '/admin/messages', name: 'Hỗ trợ khách hàng', icon: Mail, roles: ['admin', 'superadmin', 'support_admin'] },
];

const SidebarContent = ({
  collapsed,
  items,
  pathname,
  onNavigate,
  onLogout,
  unreadMessages
}) => (
  <>
    <div className="h-16 lg:h-20 flex items-center border-b border-gray-800 shrink-0 px-3 overflow-hidden">
      <Link
        to="/admin"
        onClick={() => onNavigate('/admin')}
        className={`flex items-center text-[#7294ff] min-w-0 ${collapsed ? 'justify-center w-full' : 'gap-3'}`}
        aria-label="Doca Admin - Dashboard"
      >
        <LayoutDashboard className="w-7 h-7 shrink-0" />
        {!collapsed && <span className="font-bold text-lg text-white tracking-wide truncate">DoCa Admin</span>}
      </Link>
    </div>

    <nav className="flex-1 overflow-y-auto py-4 custom-scrollbar" aria-label="Điều hướng quản trị">
      <ul className="space-y-1 px-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path || (item.path !== '/admin' && pathname.startsWith(item.path));
          return (
            <li key={item.path} className="relative group">
              <Link
                to={item.path}
                onClick={() => onNavigate(item.path)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center p-3 rounded-xl transition-all duration-200 ${
                  isActive ? 'text-[#8fa8ff] bg-[#2a2a35]' : 'text-gray-400 hover:text-gray-200 hover:bg-[#2a2a35]/50'
                } ${collapsed ? 'justify-center' : 'gap-4'}`}
                title={collapsed ? item.name : ''}
              >
                {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#8fa8ff] rounded-r-md" />}
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#8fa8ff]' : ''}`} />
                {!collapsed && <span className="font-medium text-sm truncate">{item.name}</span>}
                {!collapsed && item.path === '/admin/messages' && unreadMessages > 0 && (
                  <span className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-black text-white">
                    {Math.min(unreadMessages, 99)}
                  </span>
                )}
              </Link>
              {collapsed && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none transition-all duration-150 z-50 border border-gray-700 shadow-lg">
                  {item.name}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </nav>

    <div className="p-2 border-t border-gray-800 shrink-0">
      <button
        onClick={onLogout}
        className={`flex items-center w-full p-3 text-gray-400 hover:text-red-400 rounded-xl transition-all hover:bg-red-500/10 ${collapsed ? 'justify-center' : 'gap-4'}`}
        title={collapsed ? 'Đăng xuất' : ''}
      >
        <LogOut className="w-5 h-5 shrink-0" />
        {!collapsed && <span className="font-medium text-sm">Đăng xuất</span>}
      </button>
    </div>
  </>
);

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation(); 
  const { user, logout } = useAuth();
  const role = user?.role;

  // On desktop: controls sidebar collapsed/expanded state
  // On mobile: sidebar is always hidden unless mobileOpen is true
  const [isCollapsed, setIsCollapsed] = useState(false);  // desktop sidebar state
  const [mobileOpen, setMobileOpen] = useState(false);     // mobile overlay state
  
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

  const allowedMenuItems = MENU_ITEMS.filter(item => item.roles.includes(role));
  const handleNavigate = (path) => {
    setMobileOpen(false);
    if (path === '/admin/messages') setUnreadMessages(0);
  };
  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="admin-theme flex h-screen bg-[#151419] text-gray-200 font-sans overflow-hidden">

      {/* ── MOBILE OVERLAY ── */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-20 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── MOBILE SIDEBAR (slide-in overlay) ── */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64
        bg-[#202028] flex flex-col border-r border-gray-800
        transition-transform duration-300
        lg:hidden
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <SidebarContent collapsed={false} items={allowedMenuItems} pathname={location.pathname} onNavigate={handleNavigate} onLogout={handleLogout} unreadMessages={unreadMessages} />
      </aside>

      {/* ── DESKTOP SIDEBAR (always visible, collapsible) ── */}
      <aside className={`
        hidden lg:flex flex-col shrink-0
        bg-[#202028] border-r border-gray-800
        transition-all duration-300
        ${isCollapsed ? 'w-[72px]' : 'w-64'}
      `}>
        <SidebarContent collapsed={isCollapsed} items={allowedMenuItems} pathname={location.pathname} onNavigate={handleNavigate} onLogout={handleLogout} unreadMessages={unreadMessages} />
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">

        {/* Header */}
        <header className="h-16 bg-[#202028] border-b border-gray-800 flex items-center justify-between px-4 shrink-0 z-10 gap-3">

          {/* Left: Toggle + Search */}
          <div className="flex items-center gap-3 min-w-0">

            {/* Mobile hamburger */}
            <button 
              onClick={() => setMobileOpen(prev => !prev)}
              className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-[#2a2a35] lg:hidden"
              aria-label={mobileOpen ? 'Đóng menu quản trị' : 'Mở menu quản trị'}
              aria-expanded={mobileOpen}
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Desktop collapse toggle */}
            <button
              onClick={() => setIsCollapsed(prev => !prev)}
              className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-[#2a2a35] hidden lg:flex items-center justify-center"
              aria-label={isCollapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
            >
              {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>

            {/* Search */}
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              <input 
                type="text" 
                placeholder="Tìm kiếm..." 
                className="bg-[#2a2a35] text-white pl-9 pr-4 py-2 rounded-lg border border-transparent focus:outline-none focus:border-[#7294ff] w-40 md:w-56 lg:w-72 transition-all placeholder-gray-500 text-sm"
              />
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {allowedMenuItems.some((item) => item.path === '/admin/messages') && <Link
              to="/admin/messages" 
              onClick={() => handleNavigate('/admin/messages')}
              aria-label="Tin nhắn hỗ trợ"
              className="w-9 h-9 rounded-full bg-[#2a2a35] flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 transition-colors relative"
              title="Tin nhắn"
            >
              <Mail className="w-4 h-4" />
              {unreadMessages > 0 && (
                <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#202028]" />
              )}
            </Link>}

            {allowedMenuItems.some((item) => item.path === '/admin/notifications') && <Link
              to="/admin/notifications"
              aria-label="Quản lý thông báo"
              className="w-9 h-9 rounded-full bg-[#2a2a35] flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 transition-colors relative"
            >
              <Bell className="w-4 h-4" />
            </Link>}

            <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-gray-700 cursor-pointer shrink-0 hover:border-[#7294ff] transition-colors">
              <img 
                src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'Admin')}&background=7294ff&color=fff`} 
                alt="Admin Avatar" 
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover" 
              />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 custom-scrollbar">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
