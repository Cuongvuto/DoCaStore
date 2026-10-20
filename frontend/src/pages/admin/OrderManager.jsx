import { useRef, useState } from 'react';
import { Eye, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import axiosClient from '../../api/axiosClient';
import useAdminList, { useAdminFilters } from './hooks/useAdminList';
import { PageHeading, SearchField, Field, StatusBadge, EmptyState, ErrorState, LoadingState, Pagination, AdminModal, ConfirmDialog } from './components/AdminUI';
import { ORDER_LABELS, PAYMENT_LABELS, money, dateTime } from './adminConfig';

export default function OrderManager() {
  const { filters, setFilter, clearFilters } = useAdminFilters();
  const list = useAdminList('/orders', filters);
  const [selected, setSelected] = useState(null);
  const [change, setChange] = useState(null);
  const [reason, setReason] = useState('');
  const allowed = order => ({ pending: order.paymentMethod === 'COD' || order.paymentStatus === 'paid' ? ['processing', 'cancelled'] : ['cancelled'], processing: ['shipped', 'cancelled'], shipped: ['completed'], completed: [], cancelled: [] })[order.status] || [];
  const reviews = { none: 'Không có', refund_required: 'Cần hoàn tiền', amount_mismatch: 'Sai số tiền', duplicate_payment: 'Thanh toán nhiều lần', inventory_unconfirmed: 'Chưa đối chiếu tồn kho' };
  const [busy, setBusy] = useState(false);
  const mutation = useRef(false);
  const update = async () => {
    if (mutation.current) return;
    mutation.current = true; setBusy(true);
    try {
      const response = await axiosClient.put('/orders/' + change.order._id + '/status', { status: change.status, reason });
      if (selected?._id === change.order._id) setSelected(previous => ({ ...previous, ...response.data.data }));
      toast.success('Đã cập nhật trạng thái đơn hàng.');
      setChange(null); list.reload();
    } catch (error) { toast.error(error.response?.data?.message || 'Không thể cập nhật đơn hàng.'); }
    finally { mutation.current = false; setBusy(false); }
  };
  return <div>
    <PageHeading title="Đơn hàng" description="Tra cứu, kiểm tra thanh toán và xử lý đơn hàng."><button className="admin-button" onClick={list.reload} disabled={list.loading}><RefreshCw size={16} />Làm mới</button></PageHeading>
    <div className="admin-toolbar">
      <SearchField value={filters.search || ''} onChange={value => setFilter('search', value)} placeholder="Mã đơn, người nhận hoặc điện thoại…" />
      <Field label="Trạng thái đơn"><select value={filters.status || ''} onChange={e => setFilter('status', e.target.value)}><option value="">Tất cả</option>{Object.entries(ORDER_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
      <Field label="Thanh toán"><select value={filters.paymentStatus || ''} onChange={e => setFilter('paymentStatus', e.target.value)}><option value="">Tất cả</option>{Object.entries(PAYMENT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
      <Field label="Đối soát"><select value={filters.paymentReview || ''} onChange={e => setFilter('paymentReview', e.target.value)}><option value="">Tất cả</option>{Object.entries(reviews).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field>
      <Field label="Từ ngày"><input type="date" value={filters.from || ''} max={filters.to || undefined} onChange={e => setFilter('from', e.target.value)} /></Field>
      <Field label="Đến ngày"><input type="date" value={filters.to || ''} min={filters.from || undefined} onChange={e => setFilter('to', e.target.value)} /></Field>
      {Object.keys(filters).length > 0 && <button className="admin-button" onClick={clearFilters}>Xóa bộ lọc</button>}
    </div>
    <section className="admin-panel">
      {list.error ? <ErrorState message={list.error} onRetry={list.reload} /> : list.loading ? <LoadingState /> : !list.data.length ? <EmptyState title="Không có đơn hàng phù hợp" message="Thử thay đổi mã tìm kiếm, ngày hoặc trạng thái." /> :
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Đơn hàng</th><th>Người nhận</th><th>Tổng tiền</th><th>Thanh toán</th><th>Trạng thái đơn</th><th>Chi tiết</th></tr></thead><tbody>{list.data.map(order => <tr key={order._id}>
        <td><button className="admin-link" onClick={() => setSelected(order)}>#{order._id.slice(-6).toUpperCase()}</button><p className="admin-muted text-xs mt-1">{dateTime(order.createdAt)}</p></td>
        <td className="admin-cell-title">{order.shippingAddress?.receiverName || 'Khách hàng'}<p className="admin-muted text-xs mt-1">{order.shippingAddress?.phone || '—'}</p></td>
        <td className="font-semibold">{money(order.totalPrice)}</td>
        <td><StatusBadge status={order.paymentStatus}>{PAYMENT_LABELS[order.paymentStatus] || 'Chưa xác định'}</StatusBadge><p className="admin-muted text-xs mt-1">{order.paymentMethod}</p>{order.paymentReview && order.paymentReview !== 'none' && <p className="text-amber-300 text-xs mt-1">{reviews[order.paymentReview]}</p>}</td>
        <td><select aria-label={'Trạng thái đơn ' + order._id.slice(-6)} value={order.status} disabled={busy || !allowed(order).length} onChange={e => { setReason(''); setChange({ order, status: e.target.value }); }}>{Object.entries(ORDER_LABELS).filter(([value]) => value === order.status || allowed(order).includes(value)).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></td>
        <td><button className="admin-button" aria-label={'Xem đơn ' + order._id.slice(-6)} onClick={() => setSelected(order)}><Eye size={17} /></button></td>
      </tr>)}</tbody></table></div>}
      {!list.error && <Pagination page={list.currentPage} pages={list.totalPages} total={list.totalCount} onChange={page => setFilter('page', page)} loading={list.loading} />}
    </section>
    {selected && <AdminModal wide title={'Đơn hàng #' + selected._id.slice(-6).toUpperCase()} onClose={() => setSelected(null)}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
        <section className="admin-panel p-5"><h3 className="font-semibold mb-3">Thông tin giao hàng</h3><p>{selected.shippingAddress?.receiverName}</p><p className="admin-muted mt-2">{selected.shippingAddress?.phone}</p><p className="admin-muted mt-2">{['street', 'ward', 'district', 'city'].map(key => selected.shippingAddress?.[key]).filter(Boolean).join(', ')}</p></section>
        <section className="admin-panel p-5"><h3 className="font-semibold mb-3">Thông tin thanh toán</h3><div className="flex flex-wrap gap-2"><StatusBadge status={selected.status}>{ORDER_LABELS[selected.status]}</StatusBadge><StatusBadge status={selected.paymentStatus}>{PAYMENT_LABELS[selected.paymentStatus]}</StatusBadge></div><p className="admin-muted mt-3">{selected.paymentMethod} · {dateTime(selected.createdAt)}</p>{selected.payosOrderCode && <p className="admin-muted mt-2">Mã PayOS: {selected.payosOrderCode}</p>}</section>
      </div>
      {typeof selected.stockReserved !== 'boolean' && !['completed', 'cancelled'].includes(selected.status) && <div className="admin-panel p-4 mb-5 text-amber-300">Đơn từ phiên bản cũ chưa có xác nhận giữ kho. Cần đối chiếu lịch sử nhập/xuất kho và thanh toán trước khi tiếp tục xử lý; hệ thống không tự hoàn kho.</div>}
      {selected.paymentReview && selected.paymentReview !== 'none' && <div className="admin-panel p-4 mb-5 text-amber-300">Cần đối soát: {reviews[selected.paymentReview]}. Kiểm tra giao dịch và tồn kho trước khi tiếp tục xử lý đơn.</div>}
      {selected.statusHistory?.length > 0 && <section className="admin-panel p-4 mb-5"><h3 className="font-semibold mb-3">Lịch sử xử lý</h3><ol className="space-y-3">{selected.statusHistory.map((event, index) => <li key={event._id || index}><strong>{ORDER_LABELS[event.to] || event.to}</strong><p className="admin-muted text-xs">{dateTime(event.at)} · {event.actorRole}{event.actorId ? ' · ' + event.actorId : ''}</p><p className="text-sm">{event.reason}</p></li>)}</ol></section>}
      {selected.note && <p className="admin-panel p-4 mb-5">Ghi chú: {selected.note}</p>}
      <div className="admin-panel admin-table-wrap"><table className="admin-table"><thead><tr><th>Sản phẩm</th><th>Số lượng</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead><tbody>{selected.products?.map((item, index) => <tr key={item._id || index}><td className="admin-cell-title">{item.name || item.productId?.name || 'Sản phẩm đã xóa'}</td><td>{item.quantity}</td><td>{money(item.priceAtPurchase)}</td><td>{money(item.priceAtPurchase * item.quantity)}</td></tr>)}</tbody></table></div>
      <div className="flex justify-between items-center mt-5"><span className="admin-muted">Tổng thanh toán sau ưu đãi</span><strong className="text-xl">{money(selected.totalPrice)}</strong></div>
    </AdminModal>}
    {change?.status === 'cancelled' ? <AdminModal title="Hủy đơn hàng" busy={busy} onClose={() => setChange(null)}><form onSubmit={event => { event.preventDefault(); void update(); }}><Field label="Lý do hủy"><textarea required maxLength={500} value={reason} onChange={event => setReason(event.target.value)} /></Field><p className="admin-muted my-4">Hủy sẽ hoàn tồn kho và lượt mã giảm giá. Đơn đã thanh toán sẽ được đánh dấu cần hoàn tiền.</p><button className="admin-button admin-button-danger" disabled={busy || !reason.trim()}>{busy ? 'Đang xử lý…' : 'Xác nhận hủy'}</button></form></AdminModal> : change && <ConfirmDialog title={change.status === 'cancelled' ? 'Hủy đơn hàng?' : 'Cập nhật trạng thái?'} message={'Đơn #' + change.order._id.slice(-6).toUpperCase() + ': ' + ORDER_LABELS[change.order.status] + ' → ' + ORDER_LABELS[change.status] + '.'} danger={change.status === 'cancelled'} busy={busy} onClose={() => setChange(null)} onConfirm={update} />}
  </div>;
}
