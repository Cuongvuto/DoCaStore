import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, BadgeCheck, ChevronRight, Clock3, Leaf, LifeBuoy, MapPin, PackageCheck, ShoppingBag, User, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PurchaseAlert, PurchaseCard, PurchaseLoading } from '../components/purchase/PurchaseUI';
import { addressText, dateTime, money, orderLabels } from '../components/purchase/purchaseFormat';
import ProfileAddresses from '../components/profile/ProfileAddresses';
import ProfileOrders from '../components/profile/ProfileOrders';
import ProfileSupport from '../components/profile/ProfileSupport';
import { ProfileEmpty } from '../components/profile/ProfileUI';
import useProfileResource from '../components/profile/useProfileResource';
import './Profile.css';

const tabs = [
  { id: 'info', label: 'Tổng quan tài khoản', icon: User },
  { id: 'orders', label: 'Đơn hàng của tôi', icon: ShoppingBag },
  { id: 'addresses', label: 'Sổ địa chỉ', icon: MapPin },
  { id: 'chat', label: 'Lịch sử hỗ trợ', icon: LifeBuoy },
];
const tierLabels = { newbie: 'Thành viên mới', normal: 'Thành viên chuẩn', silver: 'Thành viên Bạc', gold: 'Thành viên Vàng', vip: 'Khách hàng VIP' };

function ProfileOverview({ user, ordersResource, addressesResource }) {
  const orders = ordersResource.data?.data || [];
  const addresses = addressesResource.data?.data || [];
  const defaultAddress = addresses.find(address => address.isDefault) || addresses[0];
  const pending = orders.filter(order => order.status === 'pending').length;
  const count = ordersResource.loading || ordersResource.error ? '—' : orders.length;
  return <div className="purchase-stack">
    <section className="profile-welcome"><div><p className="profile-welcome-kicker">GÓC NHỎ CỦA BẠN</p><h2>Rất vui được gặp lại bạn.</h2><p>Thông tin tài khoản và hành trình mua sắm,<br className="profile-desktop-break" /> tất cả ở cùng một nơi.</p><Link to="/products">Khám phá sản phẩm <ArrowRight size={16} /></Link></div><div className="profile-welcome-art" aria-hidden="true"><Leaf size={72} strokeWidth={1} /><span>DOCA</span></div></section>
    <div className="profile-stats"><Link to="/profile?tab=orders"><span className="profile-stat-icon"><ShoppingBag size={20} /></span><div><strong>{count}</strong><span>Đơn đã đặt</span></div><ArrowRight size={15} /></Link><Link to="/profile?tab=orders&status=pending"><span className="profile-stat-icon"><Clock3 size={20} /></span><div><strong>{ordersResource.loading || ordersResource.error ? '—' : pending}</strong><span>Chờ xác nhận</span></div><div className="profile-stat-dot" /></Link><div><span className="profile-stat-icon"><Wallet size={20} /></span><div><strong>{money(user.totalSpent)}</strong><span>Chi tiêu từ đơn hoàn tất</span></div></div></div>
    <PurchaseCard title="Thông tin tài khoản" icon={User} action={user.isVerified && <span className="purchase-badge"><BadgeCheck size={13} /> Đã xác thực</span>}>
      <dl className="profile-details"><div><dt>Họ và tên</dt><dd>{user.name}</dd></div><div><dt>Địa chỉ email</dt><dd>{user.email}</dd></div><div><dt>Hạng thành viên</dt><dd>{tierLabels[user.tier] || tierLabels.newbie}</dd></div><div><dt>Ngày tham gia</dt><dd>{user.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : 'Chưa có thông tin'}</dd></div></dl>
    </PurchaseCard>
    <PurchaseCard title="Đơn hàng gần đây" icon={PackageCheck} action={<Link className="purchase-text-button" to="/profile?tab=orders">Xem tất cả</Link>}>
      {ordersResource.loading ? <PurchaseLoading /> : ordersResource.error ? <PurchaseAlert onRetry={ordersResource.refresh}>{ordersResource.error}</PurchaseAlert> : !orders.length ? <ProfileEmpty icon={ShoppingBag} title="Bạn chưa có đơn hàng nào" description="Những món đồ bạn chọn sẽ được lưu lại ở đây." /> : <div className="profile-recent-orders">{orders.slice(0, 3).map(order => <Link key={order._id} to={'/order-success/' + order._id}><span className="profile-recent-icon"><ShoppingBag size={19} /></span><div><strong>Đơn #{String(order._id).slice(-6).toUpperCase()}</strong><span>{dateTime(order.createdAt)}</span></div><span className={'profile-status profile-status-' + order.status}>{orderLabels[order.status] || 'Đang cập nhật'}</span><strong>{money(order.totalPrice)}</strong><ChevronRight size={16} /></Link>)}</div>}
    </PurchaseCard>
    <PurchaseCard title="Địa chỉ nhận hàng" icon={MapPin} action={<Link className="purchase-text-button" to="/profile?tab=addresses">Quản lý địa chỉ</Link>}>
      {addressesResource.loading ? <PurchaseLoading /> : addressesResource.error ? <PurchaseAlert onRetry={addressesResource.refresh}>{addressesResource.error}</PurchaseAlert> : defaultAddress ? <div className="profile-default-address"><div><strong>{defaultAddress.receiverName}</strong>{defaultAddress.isDefault && <span className="purchase-badge">Mặc định</span>}</div><p>{defaultAddress.phone}</p><p>{addressText(defaultAddress)}</p></div> : <p className="purchase-muted">Bạn chưa lưu địa chỉ. Thêm một địa chỉ để thanh toán thuận tiện hơn.</p>}
    </PurchaseCard>
  </div>;
}

function ProfileContent() {
  const { user, refreshUser } = useAuth();
  const [searchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const activeTab = tabs.some(tab => tab.id === requestedTab) ? requestedTab : 'info';
  const ordersResource = useProfileResource('/orders/my-orders');
  const addressesResource = useProfileResource('/address');
  useEffect(() => { void refreshUser(); }, [refreshUser]);
  const initials = (user.name || 'Bạn').trim().split(/\s+/).slice(-2).map(part => part[0]).join('').toLocaleUpperCase('vi-VN');
  return <div className="cart-page purchase-page profile-page"><div className="cart-container">
    <nav className="cart-breadcrumb" aria-label="Đường dẫn"><Link to="/">Trang chủ</Link><ChevronRight size={12} /><span aria-current="page">Tài khoản của tôi</span></nav>
    <header className="cart-heading profile-heading"><div><p className="cart-eyebrow">DOCA STORE · ĐỒNG HÀNH CÙNG BẠN</p><h1>Tài khoản của tôi<span className="cart-heading-dot">.</span></h1><p>Quản lý thông tin và theo dõi những món đồ bạn yêu thích.</p></div><Link className="cart-back" to="/products">Tiếp tục mua sắm <ArrowRight size={16} /></Link></header>
    <div className="profile-layout">
      <aside className="profile-sidebar"><div className="profile-identity"><div className="profile-avatar" aria-hidden="true">{initials}</div><h2>{user.name}</h2><p>{user.email}</p><span className="profile-tier"><Leaf size={14} />{tierLabels[user.tier] || tierLabels.newbie}</span></div>
        <nav className="profile-nav" aria-label="Quản lý tài khoản">{tabs.map(({ id, label, icon: Icon }) => <Link key={id} to={'/profile?tab=' + id} aria-current={activeTab === id ? 'page' : undefined}>{Icon && <Icon size={18} />}<span>{label}</span><ChevronRight size={15} /></Link>)}</nav>
        <div className="profile-sidebar-help"><LifeBuoy size={22} /><h3>Bạn cần hỗ trợ?</h3><p>Cửa hàng sẵn sàng giúp bạn với đơn hàng và sản phẩm.</p><Link to="/contact">Liên hệ cửa hàng <ArrowRight size={14} /></Link></div>
      </aside>
      <div className="profile-content">
        {activeTab === 'info' && <ProfileOverview user={user} ordersResource={ordersResource} addressesResource={addressesResource} />}
        {activeTab === 'orders' && <ProfileOrders key={searchParams.get('status') || 'all'} resource={ordersResource} initialStatus={searchParams.get('status')} />}
        {activeTab === 'addresses' && <ProfileAddresses resource={addressesResource} />}
        {activeTab === 'chat' && <ProfileSupport userId={user._id || user.id} />}
      </div>
    </div>
  </div></div>;
}

export default function Profile() {
  const { user } = useAuth();
  if (!user) return <div className="cart-page purchase-page"><div className="cart-container"><PurchaseLoading /></div></div>;
  return <ProfileContent key={user._id || user.id} />;
}
