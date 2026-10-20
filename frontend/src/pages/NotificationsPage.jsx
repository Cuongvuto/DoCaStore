import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bell, BellOff, Check, CheckCheck, ChevronRight, Clock3, Info, LifeBuoy, LoaderCircle, Package, RefreshCw, Tag, User, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PurchaseAlert } from '../components/purchase/PurchaseUI';
import { dateTime } from '../components/purchase/purchaseFormat';
import useNotificationsFeed from '../components/notifications/useNotificationsFeed';
import { toInternalPath } from '../utils/navigation';
import './NotificationsPage.css';

const types = {
  order: { label: 'Đơn hàng', icon: Package, action: 'Xem đơn hàng' },
  promotion: { label: 'Ưu đãi', icon: Tag, action: 'Khám phá ưu đãi' },
  system: { label: 'Cửa hàng', icon: Info, action: 'Xem nội dung liên quan' },
};

function NotificationIcon({ type, large = false }) {
  const { icon: Icon } = types[type] || types.system;
  return <span className={'notifications-icon notifications-icon-' + (types[type] ? type : 'system') + (large ? ' notifications-icon-large' : '')}><Icon size={large ? 27 : 21} aria-hidden="true" /></span>;
}

function NotificationDetails({ item, onClose, reading, readError, onRetry }) {
  const dialog = useRef(null);
  const opener = useRef(null);
  const type = types[item.type] || types.system;
  const path = toInternalPath(item.linkUrl, '');
  useEffect(() => {
    if (!opener.current) opener.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (!dialog.current.open) dialog.current.showModal();
    return () => { document.body.style.overflow = previousOverflow; opener.current?.focus(); };
  }, []);
  const closeOnBackdrop = event => {
    if (event.target !== event.currentTarget) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
  };
  return <dialog ref={dialog} className="notifications-dialog" aria-labelledby="notification-title" onClose={onClose} onClick={closeOnBackdrop}>
    <header className="notifications-dialog-header"><span>THÔNG BÁO TỪ DOCA STORE</span><button type="button" className="notifications-close" onClick={onClose} aria-label="Đóng thông báo" autoFocus><X size={19} /></button></header>
    <div className="notifications-dialog-body"><NotificationIcon type={item.type} large /><span className="notifications-dialog-type">{type.label}</span><h2 id="notification-title">{item.title}</h2><time dateTime={item.createdAt}><Clock3 size={13} />{dateTime(item.createdAt)}</time>
      <div className="notifications-message"><p>{item.message}</p></div>
      {readError && <PurchaseAlert onRetry={onRetry} busy={reading}>{readError}</PurchaseAlert>}
      <p className="notifications-read-state" role="status">{reading ? <><LoaderCircle size={14} className="animate-spin" />Đang đánh dấu đã đọc…</> : item.isRead ? <><CheckCheck size={14} />Đã đọc</> : <>Chưa đánh dấu đã đọc</>}</p>
      <div className="notifications-dialog-actions">{path && <Link className="cart-button cart-button-primary" to={path} onClick={onClose}>{type.action}<ArrowRight size={16} /></Link>}<button type="button" className="cart-button cart-button-outline" onClick={onClose}>Đóng</button></div>
    </div>
  </dialog>;
}

function NotificationSkeleton() {
  return <div className="notifications-skeleton" role="status" aria-label="Đang tải thông báo">{[1, 2, 3, 4].map(index => <div key={index}><span /><div><i /><i /><i /></div></div>)}<span className="sr-only">Đang tải thông báo…</span></div>;
}

function groupByDate(items, today) {
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const groups = new Map();
  for (const item of items) {
    const date = new Date(item.createdAt);
    const valid = Number.isFinite(date.getTime());
    const day = valid ? date.toLocaleDateString('vi-VN') : 'Thông báo khác';
    const label = valid && date.toDateString() === today.toDateString() ? 'Hôm nay' : valid && date.toDateString() === yesterday.toDateString() ? 'Hôm qua' : day;
    if (!groups.has(day)) groups.set(day, { label, items: [] });
    groups.get(day).items.push(item);
  }
  return [...groups.values()];
}

function NotificationsContent() {
  const feed = useNotificationsFeed();
  const [selectedId, setSelectedId] = useState(null);
  const [today] = useState(() => new Date());
  const selected = feed.items.find(item => item._id === selectedId);
  const working = feed.loading || feed.loadingMore || feed.markingAll || feed.readingIds.length > 0;
  const hasUnread = feed.unreadCount > 0 || feed.items.some(item => !item.isRead);
  const groups = groupByDate(feed.items, today);
  const open = item => { setSelectedId(item._id); void feed.markRead(item); };

  return <div className="cart-page purchase-page notifications-page"><div className="cart-container">
    <nav className="cart-breadcrumb" aria-label="Đường dẫn"><Link to="/">Trang chủ</Link><ChevronRight size={12} /><span aria-current="page">Thông báo</span></nav>
    <header className="cart-heading notifications-heading"><div><p className="cart-eyebrow">DOCA STORE · LUÔN KẾT NỐI</p><h1>Thông báo của bạn<span className="cart-heading-dot">.</span></h1><p>Cập nhật đơn hàng, ưu đãi và những thông tin mới từ cửa hàng.</p></div><Link to="/profile" className="cart-back"><User size={16} />Tài khoản của tôi <ArrowRight size={15} /></Link></header>
    <div className="notifications-layout">
      <section className="notifications-feed" aria-label="Danh sách thông báo">
        <div className="notifications-toolbar"><div><Bell size={18} /><h2>Thông báo gần đây</h2></div><button type="button" className="notifications-refresh" onClick={feed.refresh} disabled={working}><RefreshCw size={15} className={feed.loading ? 'animate-spin' : ''} />Làm mới</button></div>
        {feed.hasUpdates && <button type="button" className="notifications-new" disabled={working} onClick={feed.refresh}><span><Bell size={15} />Có cập nhật mới</span><span>Xem ngay <ArrowRight size={14} /></span></button>}
        {feed.loading ? <NotificationSkeleton /> : feed.error ? <div className="notifications-feedback"><PurchaseAlert onRetry={feed.refresh}>{feed.error}</PurchaseAlert></div> : !feed.items.length ? <div className="notifications-empty"><div><BellOff size={35} strokeWidth={1.4} /></div><h2>Hộp thư đang yên tĩnh</h2><p>Khi có cập nhật đơn hàng hoặc ưu đãi mới, bạn sẽ tìm thấy tại đây.</p><Link to="/products" className="cart-button cart-button-primary">Khám phá sản phẩm <ArrowRight size={16} /></Link></div> : <>
          {groups.map(group => <section className="notifications-day" key={group.label} aria-label={group.label}><h3>{group.label}<span>{group.items.length}</span></h3><ul>{group.items.map(item => <li className={'notifications-row' + (!item.isRead ? ' notifications-unread' : '')} key={item._id}><button type="button" className="notifications-open" onClick={() => open(item)} aria-haspopup="dialog"><NotificationIcon type={item.type} /><span className="notifications-row-content"><span className="notifications-row-meta"><span>{(types[item.type] || types.system).label}</span><time dateTime={item.createdAt}>{dateTime(item.createdAt)}</time></span><strong>{item.title}</strong><span className="notifications-preview">{item.message}</span><span className="notifications-row-state">{item.isRead ? <><Check size={12} />Đã đọc</> : <><span className="notifications-unread-dot" />Chưa đọc</>}</span></span><ChevronRight size={16} className="notifications-row-arrow" /></button></li>)}</ul></section>)}
          <footer className="notifications-feed-footer">
            {feed.moreError && <PurchaseAlert onRetry={feed.loadMore} busy={feed.loadingMore}>{feed.moreError}</PurchaseAlert>}
            {feed.page < feed.totalPages ? <button type="button" className="cart-button cart-button-outline" disabled={working} onClick={feed.loadMore}>{feed.loadingMore ? <><LoaderCircle size={15} className="animate-spin" />Đang tải…</> : <>Xem thêm thông báo <ArrowRight size={15} /></>}</button> : <p><CheckCheck size={15} />Bạn đã xem hết danh sách thông báo.</p>}
          </footer>
        </>}
      </section>
      <aside className="notifications-sidebar">
        <section className="notifications-inbox"><div className="notifications-inbox-top"><span>HỘP THƯ CỦA BẠN</span><Bell size={21} strokeWidth={1.5} /></div><strong>{feed.unreadCount}</strong><h2>thông báo chưa đọc</h2><p>Đừng bỏ lỡ những cập nhật về đơn hàng và ưu đãi dành cho bạn.</p><button type="button" className="cart-button cart-checkout" disabled={!hasUnread || working} onClick={feed.markAll}><CheckCheck size={16} />{feed.markingAll ? 'Đang đánh dấu…' : 'Đánh dấu tất cả đã đọc'}</button></section>
        <section className="notifications-shortcuts"><h2>Đến nơi bạn cần</h2><Link to="/profile?tab=orders"><span className="notifications-shortcut-icon"><Package size={18} /></span><span><strong>Đơn hàng của tôi</strong><span>Theo dõi trạng thái giao hàng</span></span><ChevronRight size={15} /></Link><Link to="/profile?tab=chat"><span className="notifications-shortcut-icon"><LifeBuoy size={18} /></span><span><strong>Lịch sử hỗ trợ</strong><span>Xem lại trao đổi với cửa hàng</span></span><ChevronRight size={15} /></Link></section>
        <div className="notifications-note"><Info size={16} /><p>Thông báo được lưu trong khoảng 30 ngày. Bạn luôn có thể xem lại đơn hàng trong hồ sơ.</p></div>
      </aside>
    </div>
    {selected && <NotificationDetails key={selected._id} item={selected} onClose={() => setSelectedId(null)} reading={feed.readingIds.includes(selected._id) || feed.markingAll} readError={feed.readError?.id === selected._id ? feed.readError.message : ''} onRetry={() => feed.markRead(selected)} />}
  </div></div>;
}

export default function Notifications() {
  const { user } = useAuth();
  return <NotificationsContent key={user?._id || user?.id || 'guest'} />;
}
