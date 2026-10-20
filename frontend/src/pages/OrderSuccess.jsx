import { Link, useParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, CircleAlert, Clock3, MapPin, Package, RefreshCw, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PurchaseAlert, PurchaseCard, PurchaseLoading, PurchaseProducts, PurchaseShell, PurchaseSummary } from '../components/purchase/PurchaseUI';
import usePurchaseOrder from '../components/purchase/usePurchaseOrder';
import { addressText, dateTime, orderLabels, paymentLabels } from '../components/purchase/purchaseFormat';

function OrderResult({ orderId }) {
  const { order, error, loading, refreshing, refresh } = usePurchaseOrder(orderId);
  const review = order?.paymentReview && order.paymentReview !== 'none';
  const cancelled = order?.status === 'cancelled';
  const paid = order?.paymentStatus === 'paid';
  const cod = order?.paymentMethod === 'COD';
  const canPay = !review && order?.status === 'pending' && !paid && order?.paymentMethod === 'VietQR';
  const Icon = review ? CircleAlert : cancelled ? XCircle : paid || cod ? CheckCircle2 : Clock3;
  const title = review ? 'Giao dịch cần được kiểm tra' : cancelled ? 'Đơn hàng đã hủy' : paid ? 'Thanh toán thành công' : cod ? 'Đặt hàng thành công' : 'Đơn hàng đang chờ thanh toán';
  const description = review
    ? order.paymentReview === 'refund_required' ? 'Cửa hàng cần đối soát giao dịch và xử lý hoàn tiền. Vui lòng liên hệ hỗ trợ kèm mã đơn.' : 'Giao dịch đang cần đối soát. Vui lòng liên hệ cửa hàng trước khi thực hiện thêm thanh toán.'
    : cancelled ? paid ? 'Đơn đã hủy nhưng có ghi nhận thanh toán. Vui lòng liên hệ cửa hàng để kiểm tra giao dịch.' : 'Đơn này không tiếp tục được xử lý. Bạn có thể chọn lại sản phẩm để đặt đơn mới.'
      : paid ? 'Hệ thống đã ghi nhận thanh toán. Bạn có thể theo dõi tiến trình xử lý đơn bên dưới.'
        : cod ? 'Đơn hàng đã được ghi nhận. Bạn sẽ thanh toán cho người giao hàng khi nhận đơn.'
          : 'Đơn đã được tạo. Hoàn tất chuyển khoản VietQR để hệ thống ghi nhận thanh toán.';
  const address = order?.shippingAddress || {};
  return <PurchaseShell title="Thông tin đơn hàng" description="Mọi thông tin về đơn hàng của bạn, ngay tại đây." step={3}>
    {loading ? <PurchaseLoading /> : !order ? <PurchaseAlert onRetry={refresh} busy={refreshing}>{error || 'Không tìm thấy đơn hàng.'}</PurchaseAlert> : <>
      {error && <PurchaseAlert onRetry={refresh} busy={refreshing}>{error} Thông tin bên dưới là lần cập nhật gần nhất.</PurchaseAlert>}
      <section className={'purchase-status' + (review || (!cancelled && !paid && !cod) ? ' purchase-status-warning' : cancelled ? ' purchase-status-cancelled' : '')} aria-label="Kết quả đơn hàng"><div className="purchase-status-icon"><Icon size={28} aria-hidden="true" /></div><div><h2>{title}</h2><p>{description}</p></div></section>
      <div className="cart-layout">
        <div className="purchase-stack">
          <PurchaseCard title="Đơn hàng của bạn" icon={Package} action={<span className="purchase-badge">{orderLabels[order.status] || 'Đang cập nhật'}</span>}>
            <PurchaseProducts items={order.products || []} />
            <div className="purchase-order-meta"><p>Mã đơn: <strong>{order.payosOrderCode || order._id}</strong></p><p>Ngày đặt: {dateTime(order.createdAt)}</p></div>
          </PurchaseCard>
          <PurchaseCard title="Thông tin giao hàng" icon={MapPin}>
            <div className="purchase-address"><strong>{address.receiverName}</strong><p>{address.phone}</p><p>{addressText(address)}</p>{order.note && <div className="purchase-note"><span className="purchase-muted">Ghi chú đơn hàng</span><p>{order.note}</p></div>}</div>
          </PurchaseCard>
          {order.statusHistory?.length > 0 && <PurchaseCard title="Tiến trình đơn hàng" icon={Clock3}><ol className="purchase-timeline">{order.statusHistory.map((event, index) => <li key={event._id || index}><strong>{orderLabels[event.to] || event.to}</strong><time dateTime={event.at}>{dateTime(event.at)}</time>{event.reason && <p>{event.reason}</p>}</li>)}</ol></PurchaseCard>}
          <div className="purchase-actions"><Link className="cart-button cart-button-outline" to="/products">Tiếp tục mua sắm <ArrowRight size={16} /></Link><button type="button" className="purchase-text-button" disabled={refreshing} onClick={refresh}><RefreshCw size={14} className={'inline mr-2 ' + (refreshing ? 'animate-spin' : '')} />{refreshing ? 'Đang cập nhật…' : 'Cập nhật trạng thái'}</button></div>
        </div>
        <PurchaseSummary subtotal={order.pricing?.originalPrice ?? order.totalPrice} discount={order.pricing?.totalDiscount} total={order.totalPrice} messages={order.pricing?.messages} totalLabel={paid ? 'Tổng đã thanh toán' : cancelled ? 'Giá trị đơn hàng' : 'Tổng thanh toán'}>
          <dl className="purchase-summary-meta"><div><dt>Phương thức</dt><dd>{cod ? 'Khi nhận hàng (COD)' : order.paymentMethod}</dd></div><div><dt>Thanh toán</dt><dd>{paymentLabels[order.paymentStatus] || 'Đang cập nhật'}</dd></div><div><dt>Đơn hàng</dt><dd>{orderLabels[order.status] || 'Đang cập nhật'}</dd></div></dl>
          {canPay ? <Link className="cart-button cart-checkout" to={'/payment/' + order._id}>Tiếp tục thanh toán <ArrowRight size={16} /></Link> : review || (cancelled && paid) ? <Link className="cart-button cart-checkout" to="/contact">Liên hệ hỗ trợ <ArrowRight size={16} /></Link> : <Link className="cart-button cart-checkout" to="/profile">Theo dõi đơn hàng <ArrowRight size={16} /></Link>}
          <Link className="purchase-summary-link" to="/profile">Xem lịch sử đơn hàng</Link>
          <p className="purchase-muted">{review ? 'Cung cấp mã đơn khi liên hệ để cửa hàng kiểm tra giao dịch của bạn.' : cod && !paid && !cancelled ? 'Bạn chưa cần chuyển khoản cho đơn hàng này.' : 'Trạng thái thanh toán được cập nhật từ hệ thống của cửa hàng.'}</p>
        </PurchaseSummary>
      </div>
    </>}
  </PurchaseShell>;
}

export default function OrderSuccess() {
  const { orderId } = useParams();
  const { user } = useAuth();
  return <OrderResult key={(user?._id || user?.id || '') + orderId} orderId={orderId} />;
}
