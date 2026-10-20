import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown, MapPin, Package, Search, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import axiosClient from '../../api/axiosClient';
import { PurchaseAlert, PurchaseLoading, PurchaseProducts } from '../purchase/PurchaseUI';
import { addressText, dateTime, money, orderLabels, paymentLabels } from '../purchase/purchaseFormat';
import { ProfileEmpty, ProfilePagination, ProfileRefresh } from './ProfileUI';

function OrderCard({ order, onUpdated }) {
  const [expanded, setExpanded] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const review = order.paymentReview && order.paymentReview !== 'none';
  const canPay = order.status === 'pending' && order.paymentStatus !== 'paid' && order.paymentMethod === 'VietQR' && !review;
  const cancel = async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true);
    try {
      await axiosClient.put('/orders/' + order._id + '/cancel');
      toast.success('Đã hủy đơn hàng.'); setConfirm(false); onUpdated();
    } catch (error) { toast.error(error.response?.data?.message || 'Chưa thể hủy đơn. Hãy cập nhật trạng thái rồi thử lại.'); }
    finally { lock.current = false; setBusy(false); }
  };
  const products = order.products || [];
  return <article className="profile-order">
    <div className="profile-order-heading"><div><p>ĐƠN HÀNG <strong>#{String(order._id).slice(-6).toUpperCase()}</strong></p><time dateTime={order.createdAt}>{dateTime(order.createdAt)}</time></div><span className={'profile-status profile-status-' + order.status}>{orderLabels[order.status] || 'Đang cập nhật'}</span></div>
    <div className="profile-order-body"><PurchaseProducts items={expanded ? products : products.slice(0, 1)} />{!expanded && products.length > 1 && <p className="profile-order-more">Và {products.length - 1} sản phẩm khác</p>}
      <div className="profile-order-totals"><p>{products.reduce((total, item) => total + item.quantity, 0)} sản phẩm · {order.paymentMethod === 'COD' ? 'Thanh toán khi nhận hàng' : order.paymentMethod}<span>{paymentLabels[order.paymentStatus] || 'Chưa có trạng thái thanh toán'}</span></p><div><span>Tổng đơn hàng</span><strong>{money(order.totalPrice)}</strong></div></div>
      {review && <PurchaseAlert>Giao dịch cần được cửa hàng đối soát{order.paymentReview === 'refund_required' ? ' và xử lý hoàn tiền' : ''}. <Link className="purchase-text-button" to={'/order-success/' + order._id}>Xem thông tin</Link></PurchaseAlert>}
      {expanded && <div id={'order-details-' + order._id} className="profile-order-details"><p><MapPin size={15} /><strong>{order.shippingAddress?.receiverName}</strong><span>{order.shippingAddress?.phone}</span></p><p>{addressText(order.shippingAddress)}</p>{order.note && <p className="profile-order-note">Ghi chú: {order.note}</p>}<p className="purchase-muted">Mã đầy đủ: {order._id}</p></div>}
      <div className="profile-order-actions"><button type="button" className="profile-expand" aria-expanded={expanded} aria-controls={'order-details-' + order._id} onClick={() => setExpanded(value => !value)}>{expanded ? 'Thu gọn' : 'Chi tiết'}<ChevronDown size={15} className={expanded ? 'profile-chevron-open' : ''} /></button><div>{order.status === 'pending' && !confirm && <button type="button" className="purchase-text-button" onClick={() => { setConfirm(true); setExpanded(true); }}>Hủy đơn</button>}<Link className="cart-button cart-button-outline" to={'/order-success/' + order._id}>Theo dõi đơn <ArrowRight size={14} /></Link>{canPay && <Link className="cart-button cart-button-primary" to={'/payment/' + order._id}>Thanh toán</Link>}</div></div>
      {confirm && <div className="profile-confirm" role="alert"><p>Bạn muốn hủy đơn này? Nếu đã chuyển khoản, hãy kiểm tra trạng thái hoặc liên hệ cửa hàng trước khi hủy.</p><div><button type="button" disabled={busy} onClick={() => setConfirm(false)}>Giữ đơn hàng</button><button type="button" className="profile-danger" disabled={busy} onClick={cancel}>{busy ? 'Đang hủy…' : 'Xác nhận hủy'}</button></div></div>}
    </div>
  </article>;
}

export default function ProfileOrders({ resource, initialStatus = 'all' }) {
  const { data, loading, error, refresh } = resource;
  const [status, setStatus] = useState(orderLabels[initialStatus] ? initialStatus : 'all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const orders = data?.data || [];
  const query = search.trim().toLocaleLowerCase('vi-VN');
  const filtered = orders.filter(order => (status === 'all' || order.status === status) && (!query || [order._id, order.payosOrderCode, ...(order.products || []).map(item => item.name || item.productId?.name)].some(value => String(value || '').toLocaleLowerCase('vi-VN').includes(query))));
  const totalPages = Math.max(1, Math.ceil(filtered.length / 5));
  const currentPage = Math.min(page, totalPages);
  return <div className="purchase-stack"><div className="profile-section-title"><div><h2>Đơn hàng của bạn</h2><p>Theo dõi hành trình những món đồ bạn đã chọn.</p></div><ProfileRefresh busy={loading} onClick={refresh} /></div>
    <div className="profile-order-tools"><label className="profile-search"><Search size={17} /><input aria-label="Tìm đơn hàng theo mã hoặc tên sản phẩm" placeholder="Tìm mã đơn hoặc tên sản phẩm…" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} /></label><div className="profile-filters" aria-label="Lọc trạng thái đơn hàng">{[['all', 'Tất cả'], ...Object.entries(orderLabels)].map(([key, label]) => <button key={key} type="button" aria-pressed={status === key} onClick={() => { setStatus(key); setPage(1); }}>{label}{key === 'all' && data && <span>{orders.length}</span>}</button>)}</div></div>
    {loading ? <PurchaseLoading /> : error ? <PurchaseAlert onRetry={refresh}>{error}</PurchaseAlert> : !filtered.length ? <div className="purchase-card"><ProfileEmpty icon={orders.length ? Search : ShoppingBag} title={orders.length ? 'Chưa tìm thấy đơn phù hợp' : 'Đơn hàng đầu tiên đang chờ bạn'} description={orders.length ? 'Thử một mã đơn, tên sản phẩm hoặc trạng thái khác.' : 'Khám phá sản phẩm và chọn một món đồ bạn yêu thích.'}>{orders.length ? <button type="button" className="cart-button cart-button-outline" onClick={() => { setSearch(''); setStatus('all'); setPage(1); }}>Xóa bộ lọc</button> : <Link className="cart-button cart-button-primary" to="/products">Khám phá sản phẩm <ArrowRight size={16} /></Link>}</ProfileEmpty></div> : <><p className="profile-result-count"><Package size={14} />{filtered.length} đơn hàng{search.trim() && ' phù hợp với tìm kiếm'}</p>{filtered.slice((currentPage - 1) * 5, currentPage * 5).map(order => <OrderCard key={order._id} order={order} onUpdated={refresh} />)}<ProfilePagination page={currentPage} totalPages={totalPages} onChange={setPage} /></>}
  </div>;
}
