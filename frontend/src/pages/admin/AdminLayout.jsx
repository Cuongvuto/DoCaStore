import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, LogOut, PanelLeftClose, PanelLeftOpen, ArrowUpRight, Fish, MessagesSquare } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ADMIN_MENU, ROLE_LABELS } from './adminConfig';
import { AdminModal, SearchField } from './components/AdminUI';
import './admin.css';

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState('');
  const allowed = ADMIN_MENU.filter(item => item.roles.includes(user?.role));
  const current = allowed.find(item => item.path === pathname);
  const normalized = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase();
  const visible = allowed.filter(item => normalized(item.name).includes(normalized(search)));
  useEffect(() => {
    const content = document.getElementById('admin-content');
    content?.scrollTo({ top: 0 });
  }, [pathname]);
  const navigateTo = () => { setMobileOpen(false); setSearch(''); };
  const navigation = compact => <nav aria-label="Chức năng quản trị" className="admin-navigation">
    {visible.length === 0 && <p className="admin-muted p-4 text-sm">Không tìm thấy chức năng.</p>}
    {visible.map((item, index) => {
      const Icon = item.icon;
      return <div key={item.path}>
        {!compact && visible[index - 1]?.group !== item.group && <p className="admin-nav-group">{item.group}</p>}
        <Link to={item.path} onClick={navigateTo} title={compact ? item.name : undefined} aria-label={item.name} aria-current={pathname === item.path ? 'page' : undefined} className={'admin-nav-link' + (pathname === item.path ? ' is-active' : '') + (compact ? ' is-compact' : '')}><Icon size={19} />{!compact && <span>{item.name}</span>}</Link>
      </div>;
    })}
  </nav>;
  return <div className="admin-theme admin-shell">
    <aside className={'admin-sidebar' + (collapsed ? ' is-collapsed' : '')}>
      <Link to="/admin" className="admin-brand" aria-label="DoCaStore quản trị"><span><Fish size={25} /></span>{!collapsed && <div>DoCaStore<small>Không gian quản trị</small></div>}</Link>
      {navigation(collapsed)}
      <div className="admin-sidebar-bottom"><button className="admin-nav-link" aria-label="Đăng xuất" onClick={() => { logout(); navigate('/'); }}><LogOut size={18} />{!collapsed && 'Đăng xuất'}</button></div>
    </aside>
    <div className="admin-workspace">
      <header className="admin-topbar">
        <button className="admin-button admin-mobile-toggle" aria-label="Mở menu quản trị" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}><Menu size={20} /></button>
        <button className="admin-button admin-desktop-toggle" aria-label={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'} onClick={() => setCollapsed(value => !value)}>{collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}</button>
        <div className="min-w-0 flex-1"><p className="admin-topbar-title">{current?.name || 'Quản trị'}</p><p className="admin-muted text-xs">{ROLE_LABELS[user?.role]}</p></div>
        <div className="hidden lg:block w-60"><SearchField value={search} onChange={value => { setSearch(value); if (value) setCollapsed(false); }} placeholder="Tìm chức năng quản trị" /></div>
        {allowed.some(item => item.path === '/admin/messages') && <Link className="admin-button admin-support-link" to="/admin/messages" aria-label="Mở hỗ trợ khách hàng"><MessagesSquare size={18} /></Link>}
        <Link to="/" className="admin-button" aria-label="Xem cửa hàng"><span className="hidden sm:inline">Cửa hàng</span><ArrowUpRight size={17} /></Link>
        <div className="admin-avatar" title={user?.name} aria-label={user?.name}>{user?.name?.trim().charAt(0).toUpperCase() || 'A'}</div>
      </header>
      <main id="admin-content" className="admin-content"><Outlet /></main>
    </div>
    {mobileOpen && <AdminModal title="DoCaStore · Quản trị" onClose={() => setMobileOpen(false)}><SearchField value={search} onChange={setSearch} placeholder="Tìm chức năng quản trị" />{navigation(false)}<button className="admin-button mt-4" onClick={() => { logout(); navigate('/'); }}><LogOut size={17} />Đăng xuất</button></AdminModal>}
  </div>;
};
export default AdminLayout;
