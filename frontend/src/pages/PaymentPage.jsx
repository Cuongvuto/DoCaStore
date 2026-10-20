import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { Check, Copy, Clock3, QrCode, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import { PurchaseAlert, PurchaseCard, PurchaseLoading, PurchaseShell, PurchaseSummary } from '../components/purchase/PurchaseUI';
import usePurchaseOrder from '../components/purchase/usePurchaseOrder';
import { dateTime } from '../components/purchase/purchaseFormat';

function PaymentContent({ orderId }) {
  const navigate = useNavigate();
  const { order, error, loading, refreshing, refresh } = usePurchaseOrder(orderId);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(Date.now);
  const cancelLock = useRef(false);
  const copyTimer = useRef(null);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(timer); clearTimeout(copyTimer.current); };
  }, []);
  useEffect(() => {
    if (order && (order.status !== 'pending' || order.paymentStatus === 'paid' || order.paymentMethod !== 'VietQR' || (order.paymentReview && order.paymentReview !== 'none'))) {
      navigate('/order-success/' + orderId, { replace: true });
    }
  }, [order, orderId, navigate]);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(String(order.payosOrderCode || order._id));
      setCopied(true);
      clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch { toast.error('Không thể sao chép. Bạn có thể chọn và sao chép mã đơn trực tiếp.'); }
  };
  const cancel = async () => {
    if (cancelLock.current) return;
    cancelLock.current = true; setCancelling(true); setCancelError('');
    try {
      await axiosClient.put('/orders/' + orderId + '/cancel');
      toast.info('Đã hủy đơn hàng.');
      navigate('/order-success/' + orderId, { replace: true });
    } catch (failure) {
      setCancelError(failure.response?.data?.message || 'Chưa thể hủy đơn. Vui lòng kiểm tra lại trạng thái.');
      refresh();
    } finally { cancelLock.current = false; setCancelling(false); }
  };

  const expires = new Date(order?.paymentExpiresAt).getTime();
  const hasExpiry = Boolean(order?.paymentExpiresAt) && Number.isFinite(expires);
  const expired = hasExpiry && now >= expires;
  const remaining = Math.max(0, Math.ceil((expires - now) / 1000));
  const countdown = Math.floor(remaining / 60) + ':' + String(remaining % 60).padStart(2, '0');
  const qrCode = order?.stockReserved === true ? order?.paymentLink?.qrCode : undefined;
  const legacyOrder = order && typeof order.stockReserved !== 'boolean';
  const canPay = order?.status === 'pending' && order?.paymentStatus !== 'paid' && order?.paymentMethod === 'VietQR' && (!order?.paymentReview || order.paymentReview === 'none');
  return <PurchaseShell title="Thanh toán VietQR" description="Một bước nữa để hoàn tất thanh toán cho đơn hàng của bạn.">
    {loading ? <PurchaseLoading /> : !order ? <PurchaseAlert onRetry={refresh} busy={refreshing}>{error || 'Không tìm thấy đơn hàng.'}</PurchaseAlert> : <>
      {error && <PurchaseAlert onRetry={refresh} busy={refreshing}>{error} Mã QR tạm ẩn cho đến khi kiểm tra lại trạng thái.</PurchaseAlert>}
      {legacyOrder && <PurchaseAlert>Đơn hàng cũ cần cửa hàng đối chiếu tồn kho và thanh toán. Vui lòng không chuyển thêm tiền; liên hệ hỗ trợ kèm mã đơn để được xử lý.</PurchaseAlert>}
      <div className="cart-layout">
        <div className="purchase-stack">
          <PurchaseCard title="Quét mã thanh toán" icon={QrCode}>
            <div className="purchase-qr-panel">
              <span className="purchase-badge"><Clock3 size={13} aria-hidden="true" />&nbsp;{expired ? 'Mã thanh toán đã hết hạn' : 'Chờ xác nhận thanh toán'}</span>
              {!canPay ? <p className="purchase-muted purchase-form-section">Đang mở kết quả đơn hàng…</p> : expired ? <div className="purchase-form-section"><PurchaseAlert>Mã QR đã hết hạn. Nếu đã chuyển khoản, hãy kiểm tra trạng thái hoặc liên hệ cửa hàng kèm mã đơn.</PurchaseAlert></div> : error ? <p className="purchase-muted purchase-form-section">Kết nối đang gián đoạn. Hãy kiểm tra lại trước khi chuyển khoản.</p> : qrCode ? <div className="purchase-qr"><QRCodeCanvas value={qrCode} size={260} level="H" includeMargin aria-label="Mã QR thanh toán đơn hàng" /></div> : <div className="purchase-form-section"><PurchaseAlert>Chưa có mã QR cho đơn hàng này. Hãy cập nhật trạng thái hoặc liên hệ cửa hàng.</PurchaseAlert></div>}
              {!expired && canPay && !error && qrCode && <p className="purchase-muted">Mở ứng dụng ngân hàng và quét mã. Giữ nguyên số tiền và nội dung chuyển khoản đã được điền sẵn.</p>}
              {hasExpiry && !expired && <p className="purchase-muted purchase-form-section">Mã có hiệu lực trong <strong>{countdown}</strong> · đến {dateTime(order.paymentExpiresAt)}</p>}
            </div>
          </PurchaseCard>
          <PurchaseCard title="Thanh toán trong 3 bước">
            <ol className="purchase-instructions"><li>Mở ứng dụng ngân hàng trên điện thoại, chọn quét mã QR hoặc tải ảnh QR từ thư viện.</li><li>Kiểm tra người nhận, số tiền và nội dung chuyển khoản trước khi xác nhận.</li><li>Quay lại trang này. Trạng thái sẽ tự cập nhật khi hệ thống xác nhận giao dịch.</li></ol>
          </PurchaseCard>
          <div className="purchase-actions"><Link className="cart-button cart-button-outline" to={'/order-success/' + orderId}>Xem thông tin đơn hàng</Link>{canPay && !confirmCancel && <button type="button" className="purchase-text-button" onClick={() => setConfirmCancel(true)}>Hủy đơn hàng</button>}</div>
          {confirmCancel && canPay && <PurchaseCard title="Bạn muốn hủy đơn hàng?"><p className="purchase-muted">Nếu đã chuyển khoản, hãy kiểm tra trạng thái hoặc liên hệ cửa hàng trước khi hủy.</p><div className="purchase-actions purchase-form-section"><button type="button" className="cart-button cart-button-outline" disabled={cancelling} onClick={() => setConfirmCancel(false)}>Giữ đơn hàng</button><button type="button" className="cart-button cart-button-primary" disabled={cancelling} onClick={cancel}>{cancelling ? 'Đang hủy…' : 'Xác nhận hủy đơn'}</button></div></PurchaseCard>}
          {cancelError && <PurchaseAlert tone="error">{cancelError}</PurchaseAlert>}
        </div>
        <PurchaseSummary subtotal={order.pricing?.originalPrice ?? order.totalPrice} discount={order.pricing?.totalDiscount} total={order.totalPrice} messages={order.pricing?.messages} title="Thông tin thanh toán" totalLabel="Số tiền cần chuyển">
          <div className="purchase-payment-code"><div>Mã đơn hàng<strong>{order.payosOrderCode || order._id}</strong></div><button type="button" className="purchase-copy" onClick={copyCode} aria-label={copied ? 'Đã sao chép mã đơn' : 'Sao chép mã đơn'}>{copied ? <Check size={17} /> : <Copy size={17} />}</button></div>
          <button type="button" className="cart-button cart-checkout" onClick={refresh} disabled={refreshing || cancelling}><RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />{refreshing ? 'Đang kiểm tra…' : 'Kiểm tra thanh toán'}</button>
          <p className="purchase-muted" role="status">{refreshing ? 'Đang lấy trạng thái mới nhất.' : 'Tự kiểm tra mỗi 10 giây. Nếu vừa chuyển khoản, vui lòng chờ hệ thống xác nhận.'}</p>
          <Link className="purchase-summary-link" to="/contact">Cần hỗ trợ thanh toán?</Link>
        </PurchaseSummary>
      </div>
    </>}
  </PurchaseShell>;
}

export default function PaymentPage() {
  const { orderId } = useParams();
  const { user } = useAuth();
  return <PaymentContent key={(user?._id || user?.id || '') + orderId} orderId={orderId} />;
}
