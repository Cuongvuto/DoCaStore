import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Bell, ChevronDown, ChevronRight, Fish, Heart, LayoutDashboard, LayoutGrid, LogOut, MapPin, Menu, Package, Search, ShoppingBag, User, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useNotification } from '../context/NotificationContext';
import axiosClient from '../api/axiosClient';
import CustomerChatWidget from './CustomerChatWidget';
import './Header.css';

const navigation = [
  { to: '/', label: 'Trang chủ', end: true },
  { to: '/products', label: 'Sản phẩm' },
  { to: '/about', label: 'Giới thiệu' },
  { to: '/news', label: 'Tin tức' },
  { to: '/contact', label: 'Liên hệ' },
];
const staffRoles = ['admin', 'superadmin', 'product_admin', 'order_admin', 'support_admin'];

function HeaderSearch({ initialValue }) {
  const [value, setValue] = useState(initialValue);
  const navigate = useNavigate();
  const submit = event => {
    event.preventDefault();
    const query = value.trim();
    navigate(query ? '/products?' + new URLSearchParams({ search: query }) : '/products');
  };
  return <form className="store-search" role="search" aria-label="Tìm sản phẩm" onSubmit={submit}><Search size={18} aria-hidden="true" /><input type="search" name="search" aria-label="Tên sản phẩm cần tìm" placeholder="Tìm cần câu, máy câu, phụ kiện…" maxLength={120} value={value} onChange={event => setValue(event.target.value)} /><button type="submit" aria-label="Tìm kiếm sản phẩm"><ArrowRight size={17} /></button></form>;
}

function ActionLink({ to, label, count, icon: Icon, className = '' }) {
  const safeCount = Math.max(0, Number(count) || 0);
  return <NavLink to={to} className={'store-action ' + className} aria-label={label + (safeCount ? ', ' + safeCount : '')} title={label}>{Icon && <Icon size={20} strokeWidth={1.65} />}{safeCount > 0 && <span className="store-counter" aria-hidden="true">{safeCount > 99 ? '99+' : safeCount}</span>}</NavLink>;
}

export default function Header() {
  const { user, logout } = useAuth();
  const { cartCount } = useCart();
  const { wishlist } = useWishlist();
  const { unreadCount } = useNotification();
  const location = useLocation();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [categoryLoading, setCategoryLoading] = useState(true);
  const [categoryError, setCategoryError] = useState(false);
  const [categoryVersion, setCategoryVersion] = useState(0);
  const [menu, setMenu] = useState(null);
  const routeKey = location.key + ':' + (user?._id || user?.id || 'guest');
  const openMenu = menu?.routeKey === routeKey ? menu.name : null;
  const accountRoot = useRef(null);
  const categoryRoot = useRef(null);
  const mobilePanel = useRef(null);
  const mobileButton = useRef(null);
  const accountButton = useRef(null);
  const categoryButton = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setCategoryLoading(true); setCategoryError(false);
      try {
        const response = await axiosClient.get('/category', { signal: controller.signal });
        if (!controller.signal.aborted) setCategories(Array.isArray(response.data.data) ? response.data.data : []);
      } catch { if (!controller.signal.aborted) setCategoryError(true); }
      finally { if (!controller.signal.aborted) setCategoryLoading(false); }
    };
    void load();
    return () => controller.abort();
  }, [categoryVersion]);

  useEffect(() => {
    if (!openMenu) return;
    const root = openMenu === 'account' ? accountRoot : openMenu === 'categories' ? categoryRoot : mobilePanel;
    const trigger = openMenu === 'account' ? accountButton : openMenu === 'categories' ? categoryButton : mobileButton;
    if (openMenu === 'mobile') mobilePanel.current?.querySelector('a')?.focus({ preventScroll: true });
    const outside = event => {
      if (!root.current?.contains(event.target) && !trigger.current?.contains(event.target)) setMenu(null);
    };
    const escape = event => {
      if (event.key === 'Escape') { event.preventDefault(); setMenu(null); trigger.current?.focus(); }
    };
    const media = window.matchMedia('(max-width: 1023px)');
    const resize = () => setMenu(null);
    document.addEventListener('pointerdown', outside);
    document.addEventListener('focusin', outside);
    document.addEventListener('keydown', escape);
    media.addEventListener('change', resize);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('focusin', outside);
      document.removeEventListener('keydown', escape);
      media.removeEventListener('change', resize);
    };
  }, [openMenu]);

  const toggle = name => setMenu(openMenu === name ? null : { name, routeKey });
  const close = () => setMenu(null);
  const signOut = () => { close(); logout(); navigate('/login'); };
  const categoryFeedback = categoryLoading
    ? <p className="store-menu-feedback" role="status">Đang tải danh mục…</p>
    : categoryError
      ? <div className="store-menu-feedback" role="alert">Chưa tải được danh mục. <button type="button" onClick={() => setCategoryVersion(value => value + 1)}>Thử lại</button></div>
      : !categories.length ? <p className="store-menu-feedback">Danh mục đang được cập nhật. Bạn có thể xem tất cả sản phẩm.</p> : null;
  const initials = (user?.name || '').trim().split(/\s+/).slice(-2).map(part => part[0]).join('').toLocaleUpperCase('vi-VN');
  const currentSearch = location.pathname === '/products' ? new URLSearchParams(location.search).get('search') || '' : '';

  return <header className="store-header">
    <div className="store-header-container store-main">
      <button type="button" ref={mobileButton} className="store-action store-mobile-trigger" onClick={() => toggle('mobile')} aria-label={openMenu === 'mobile' ? 'Đóng menu điều hướng' : 'Mở menu điều hướng'} aria-expanded={openMenu === 'mobile'} aria-controls="store-mobile-navigation">{openMenu === 'mobile' ? <X size={23} /> : <Menu size={23} />}</button>
      <Link className="store-brand" to="/" onClick={close} aria-label="DoCa Store — Trang chủ"><span className="store-brand-mark"><Fish size={28} strokeWidth={1.45} /></span><span className="store-brand-wordmark">DoCa<span>Store</span><small>ĐỒ CÂU & PHỤ KIỆN</small></span></Link>
      <HeaderSearch key={location.key} initialValue={currentSearch} />
      <div className="store-actions">
        <div className="store-chat"><CustomerChatWidget triggerClassName="store-action store-chat-trigger" /></div>
        <ActionLink to="/wishlist" label="Sản phẩm yêu thích" count={user ? wishlist?.length : 0} icon={Heart} className="store-wishlist" />
        <ActionLink to="/notifications" label="Thông báo chưa đọc" count={user ? unreadCount : 0} icon={Bell} />
        <ActionLink to="/cart" label="Giỏ hàng" count={user ? cartCount : 0} icon={ShoppingBag} />
        <span className="store-action-divider" />
        {user ? <div className="store-account" ref={accountRoot}>
          <button type="button" ref={accountButton} className="store-account-toggle" aria-label="Menu tài khoản" aria-expanded={openMenu === 'account'} aria-controls="store-account-navigation" onClick={() => toggle('account')}><span className="store-avatar" aria-hidden="true">{initials || <User size={18} />}</span><span className="store-account-name"><small>Xin chào,</small><strong>{user.name}</strong></span><ChevronDown size={13} /></button>
          {openMenu === 'account' && <nav id="store-account-navigation" className="store-account-menu" aria-label="Tài khoản"><div className="store-account-intro"><strong>{user.name}</strong><span>{user.email}</span></div><Link to="/profile" onClick={close}><User size={16} />Hồ sơ cá nhân</Link><Link to="/profile?tab=orders" onClick={close}><Package size={16} />Đơn hàng của tôi</Link><Link to="/profile?tab=addresses" onClick={close}><MapPin size={16} />Sổ địa chỉ</Link><Link to="/wishlist" onClick={close}><Heart size={16} />Sản phẩm yêu thích</Link>{staffRoles.includes(user.role) && <Link to="/admin" onClick={close}><LayoutDashboard size={16} />Trang quản trị</Link>}<button type="button" className="store-logout" onClick={signOut}><LogOut size={16} />Đăng xuất</button></nav>}
        </div> : <Link to="/login" className="store-login" aria-label="Đăng nhập"><User size={17} /><span>Đăng nhập</span></Link>}
      </div>
    </div>
    <div className="store-navigation-bar"><div className="store-header-container store-navigation-inner">
      <div className="store-categories" ref={categoryRoot}><button type="button" ref={categoryButton} className="store-category-toggle" onClick={() => toggle('categories')} aria-expanded={openMenu === 'categories'} aria-controls="store-category-navigation"><LayoutGrid size={16} />Danh mục sản phẩm<ChevronDown size={13} /></button>
        {openMenu === 'categories' && <nav id="store-category-navigation" className="store-category-menu" aria-label="Danh mục sản phẩm"><div className="store-category-menu-heading"><div><span>KHÁM PHÁ DOCA STORE</span><h2>Chọn đồ nghề cho chuyến câu</h2></div><Link to="/products" onClick={close}>Tất cả sản phẩm <ArrowRight size={15} /></Link></div>{categoryFeedback}<div className="store-category-grid">{!categoryLoading && !categoryError && categories.map(category => <div key={category._id}><Link className="store-category-parent" to={'/category/' + encodeURIComponent(category.slug)} onClick={close}>{category.name}<ChevronRight size={14} /></Link>{category.children?.length > 0 && <ul>{category.children.map(child => <li key={child._id}><Link to={'/category/' + encodeURIComponent(child.slug)} onClick={close}>{child.name}</Link></li>)}</ul>}</div>)}</div></nav>}
      </div>
      <nav className="store-navigation" aria-label="Điều hướng chính">{navigation.map(item => <NavLink key={item.to} to={item.to} end={item.end} onClick={close} className={({ isActive }) => isActive || (item.to === '/products' && /^\/(category|product)\//.test(location.pathname)) ? 'store-nav-link store-nav-active' : 'store-nav-link'}>{item.label}</NavLink>)}</nav>
      <span className="store-tagline"><span />Đồng hành cùng cần thủ</span>
    </div></div>
    {openMenu === 'mobile' && <nav id="store-mobile-navigation" className="store-mobile-panel" ref={mobilePanel} aria-label="Điều hướng trên điện thoại"><div className="store-mobile-links">{navigation.map(item => <NavLink key={item.to} to={item.to} end={item.end} onClick={close}>{item.label}<ChevronRight size={15} /></NavLink>)}</div><div className="store-mobile-categories"><h2>Danh mục sản phẩm</h2>{categoryFeedback}{!categoryLoading && !categoryError && categories.map(category => category.children?.length ? <details key={category._id}><summary>{category.name}<ChevronDown size={15} /></summary><Link to={'/category/' + encodeURIComponent(category.slug)} onClick={close}>Xem tất cả {category.name.toLocaleLowerCase('vi-VN')}</Link>{category.children.map(child => <Link key={child._id} to={'/category/' + encodeURIComponent(child.slug)} onClick={close}>{child.name}</Link>)}</details> : <Link key={category._id} to={'/category/' + encodeURIComponent(category.slug)} onClick={close}>{category.name}<ChevronRight size={14} /></Link>)}</div><div className="store-mobile-quick"><Link to="/wishlist" onClick={close}><Heart size={16} />Yêu thích{user && wishlist?.length > 0 && <span>{wishlist.length}</span>}</Link><Link to="/profile?tab=orders" onClick={close}><Package size={16} />Đơn hàng của tôi</Link></div></nav>}
  </header>;
}
