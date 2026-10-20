import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, MapPin, Package, QrCode, TicketPercent, Truck, WalletCards } from 'lucide-react';
import { toast } from 'sonner';
import axiosClient from '../api/axiosClient';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { PurchaseAlert, PurchaseCard, PurchaseLoading, PurchaseProducts, PurchaseShell, PurchaseSummary } from '../components/purchase/PurchaseUI';
import ShippingFields from '../components/purchase/ShippingFields';
import { addressText, money } from '../components/purchase/purchaseFormat';

function CheckoutContent() {
  const navigate = useNavigate();
  const { updateCartCount } = useCart();
  const { fetchUnreadCount } = useNotification();
  const request = useRef(null);
  const lock = useRef(false);
  const couponLock = useRef(false);
  const [placing, setPlacing] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [orderError, setOrderError] = useState('');
  const [version, setVersion] = useState(0);
  const [addresses, setAddresses] = useState([]);
  const [addressWarning, setAddressWarning] = useState('');
  const [addressId, setAddressId] = useState('new');
  const [shipping, setShipping] = useState({ receiverName: '', phone: '', street: '', city: '', district: '', ward: '' });
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [coupon, setCoupon] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState('');
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponError, setCouponError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true); setLoadError('');
      const results = await Promise.allSettled([
        axiosClient.get('/cart', { signal: controller.signal }),
        axiosClient.get('/address', { signal: controller.signal }),
      ]);
      if (controller.signal.aborted) return;
      const [cartResult, addressResult] = results;
      if (cartResult.status === 'fulfilled' && Array.isArray(cartResult.value.data?.data?.items)) {
        setCart(cartResult.value.data.data);
      } else {
        setLoadError(cartResult.reason?.response?.data?.message || 'Không thể tải giỏ hàng. Vui lòng thử lại.');
      }
      if (addressResult.status === 'fulfilled') {
        const saved = addressResult.value.data?.data || [];
        setAddresses(saved);
        setAddressId((saved.find(address => address.isDefault) || saved[0])?._id || 'new');
        setAddressWarning('');
      } else {
        setAddressWarning('Chưa tải được sổ địa chỉ. Bạn vẫn có thể nhập địa chỉ giao hàng bên dưới.');
      }
      setLoading(false);
    };
    void load();
    return () => controller.abort();
  }, [version]);

  const applyCoupon = async (remove = false) => {
    if (couponLock.current || lock.current || uncertain) return;
    const code = remove ? '' : coupon.trim();
    if (!remove && !code) { setCouponError('Nhập mã giảm giá trước khi áp dụng.'); return; }
    couponLock.current = true; setCouponBusy(true); setCouponError('');
    try {
      const response = await axiosClient.post('/orders/preview', { couponCode: code || undefined });
      const pricing = response.data.data;
      setCart(previous => ({ ...previous, subTotal: pricing.originalPrice, finalPrice: pricing.finalPrice, discountAmount: pricing.totalDiscount, discountMessages: pricing.messages || [] }));
      setAppliedCoupon(code);
      setCoupon(code);
    } catch (error) {
      // Keep the last server-confirmed price, including automatic customer offers.
      setCouponError(error.response?.data?.message || 'Chưa thể cập nhật ưu đãi. Vui lòng thử lại.');
    } finally { couponLock.current = false; setCouponBusy(false); }
  };

  const placeOrder = async event => {
    event.preventDefault();
    if (lock.current || couponLock.current || !cart?.items.length) return;
    if (!request.current) {
      const selected = addressId === 'new' ? shipping : addresses.find(address => address._id === addressId);
      const shippingAddress = Object.fromEntries(['receiverName', 'phone', 'street', 'ward', 'district', 'city'].map(key => [key, selected?.[key]?.trim() || '']));
      if (Object.values(shippingAddress).some(value => !value)) {
        setOrderError('Vui lòng điền đầy đủ địa chỉ và thông tin người nhận.');
        toast.error('Vui lòng điền đầy đủ địa chỉ và thông tin người nhận.');
        return;
      }
      request.current = { key: crypto.randomUUID(), payload: { shippingAddress, note: note.trim(), paymentMethod, couponCode: appliedCoupon || null } };
    }
    lock.current = true; setPlacing(true); setOrderError('');
    try {
      const response = await axiosClient.post('/orders', request.current.payload, { headers: { 'Idempotency-Key': request.current.key } });
      const order = response.data?.data;
      if (!order?._id) throw new Error('Missing order');
      request.current = null; setUncertain(false);
      void updateCartCount(); void fetchUnreadCount();
      toast.success('Đã tạo đơn hàng.');
      if (order.paymentMethod === 'VietQR' && order.status === 'pending' && order.paymentStatus !== 'paid') {
        navigate('/payment/' + order._id);
      } else navigate('/order-success/' + order._id);
    } catch (error) {
      const definite = [400, 401, 403, 404, 409, 422, 502, 503].includes(error.response?.status);
      if (definite) request.current = null;
      setUncertain(!definite);
      const message = error.response?.data?.message || 'Chưa xác nhận được đơn hàng. Bấm thử lại để kiểm tra cùng yêu cầu đặt hàng.';
      setOrderError(message);
      toast.error(message);
    } finally { lock.current = false; setPlacing(false); }
  };

  const items = cart?.items || [];
  const unavailable = items.some(item => !item.product_id || item.product_id.stock <= 0 || item.quantity > item.product_id.stock);
  const disabled = placing || couponBusy || (!uncertain && unavailable);
  const submitLabel = placing ? 'Đang xử lý…' : uncertain ? 'Thử lại đặt hàng' : 'Xác nhận đặt hàng';
  return <PurchaseShell title="Thanh toán" description="Kiểm tra thông tin để món đồ bạn chọn đến đúng nơi." mobile={!loading && !loadError && items.length > 0}>
    {loading ? <PurchaseLoading /> : loadError ? <PurchaseAlert onRetry={() => setVersion(value => value + 1)}>{loadError}</PurchaseAlert> : !items.length ? <div className="purchase-card purchase-empty"><h2>Giỏ hàng đang trống</h2><p className="purchase-muted">Chọn sản phẩm yêu thích trước khi thanh toán nhé.</p><Link className="cart-button cart-button-primary" to="/products">Khám phá sản phẩm <ArrowRight size={16} /></Link></div> : <>
      {orderError && <PurchaseAlert tone="error">{orderError}</PurchaseAlert>}
      {uncertain && <PurchaseAlert>Thông tin đơn được giữ nguyên trong lúc chờ xác nhận. Bấm “Thử lại đặt hàng” để tránh tạo đơn trùng.</PurchaseAlert>}
      {unavailable && !uncertain && <PurchaseAlert>Một số sản phẩm đã hết hàng hoặc không đủ số lượng. <Link className="purchase-text-button" to="/cart">Cập nhật giỏ hàng</Link></PurchaseAlert>}
      <div className="cart-layout">
        <form id="checkout-form" className="purchase-form purchase-stack" onSubmit={placeOrder}>
          <fieldset disabled={placing || uncertain}>
            <PurchaseCard title="Thông tin giao hàng" icon={MapPin}>
              {addressWarning && <PurchaseAlert>{addressWarning}</PurchaseAlert>}
              {addresses.length > 0 && <div className="purchase-options">
                {addresses.map(address => <label className="purchase-option" key={address._id}><input type="radio" name="shipping-address" value={address._id} checked={addressId === address._id} onChange={() => setAddressId(address._id)} /><div><strong>{address.receiverName}{address.isDefault && <span className="purchase-badge">Mặc định</span>}</strong><p>{address.phone}</p><p>{addressText(address)}</p></div></label>)}
                <label className="purchase-option"><input type="radio" name="shipping-address" value="new" checked={addressId === 'new'} onChange={() => setAddressId('new')} /><strong>Dùng địa chỉ khác</strong></label>
              </div>}
              {addressId === 'new' && <div className={addresses.length ? 'purchase-form-section' : ''}><ShippingFields value={shipping} onChange={setShipping} /></div>}
              <label className="purchase-field purchase-form-section">Ghi chú đơn hàng <span className="purchase-muted">Không bắt buộc · tối đa 1.000 ký tự</span><textarea rows={3} maxLength={1000} value={note} onChange={event => setNote(event.target.value)} placeholder="Ví dụ: gọi cho tôi trước khi giao hàng" /></label>
            </PurchaseCard>
          </fieldset>
          <fieldset disabled={placing || uncertain}>
            <PurchaseCard title="Phương thức thanh toán" icon={WalletCards}>
              <div className="purchase-options purchase-methods">
                <label className="purchase-option"><input type="radio" name="payment-method" checked={paymentMethod === 'COD'} onChange={() => setPaymentMethod('COD')} /><div><strong><Truck size={18} /> Khi nhận hàng</strong><p>Thanh toán cho người giao hàng khi nhận đơn.</p></div></label>
                <label className="purchase-option"><input type="radio" name="payment-method" checked={paymentMethod === 'VietQR'} onChange={() => setPaymentMethod('VietQR')} /><div><strong><QrCode size={18} /> Chuyển khoản VietQR</strong><p>Quét mã bằng ứng dụng ngân hàng sau khi đặt hàng.</p></div></label>
              </div>
            </PurchaseCard>
          </fieldset>
          <PurchaseCard title={'Sản phẩm trong đơn · ' + items.reduce((sum, item) => sum + item.quantity, 0)} icon={Package} action={<Link className="purchase-text-button" to="/cart">Sửa giỏ hàng</Link>}><PurchaseProducts items={items} cart /></PurchaseCard>
          <fieldset disabled={placing || uncertain || couponBusy}>
            <PurchaseCard title="Ưu đãi của bạn" icon={TicketPercent}>
              <label className="purchase-field" htmlFor="checkout-coupon">Mã giảm giá</label><div className="purchase-coupon"><input id="checkout-coupon" value={coupon} disabled={Boolean(appliedCoupon)} maxLength={50} onChange={event => setCoupon(event.target.value)} placeholder="Nhập mã ưu đãi" onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); if (!appliedCoupon) void applyCoupon(); } }} /><button type="button" className="cart-button cart-button-outline" onClick={() => applyCoupon(Boolean(appliedCoupon))}>{couponBusy ? 'Đang kiểm tra…' : appliedCoupon ? 'Gỡ mã' : 'Áp dụng'}</button></div>
              {appliedCoupon && <p className="purchase-coupon-status" role="status">Đã áp dụng mã {appliedCoupon}.</p>}
              {couponError && <div className="purchase-form-section"><PurchaseAlert tone="error">{couponError}</PurchaseAlert></div>}
            </PurchaseCard>
          </fieldset>
          <Link className="cart-back" to="/cart"><ArrowLeft size={16} /> Quay lại giỏ hàng</Link>
        </form>
        <PurchaseSummary subtotal={cart.subTotal} discount={cart.discountAmount} total={cart.finalPrice} messages={cart.discountMessages}>
          <dl className="purchase-summary-meta"><div><dt>Thanh toán</dt><dd>{paymentMethod === 'COD' ? 'Khi nhận hàng' : 'VietQR'}</dd></div><div><dt>Số lượng</dt><dd>{items.reduce((sum, item) => sum + item.quantity, 0)} sản phẩm</dd></div></dl>
          <button type="submit" form="checkout-form" className="cart-button cart-checkout purchase-desktop-submit" disabled={disabled}>{submitLabel}<ArrowRight size={16} /></button>
          <p className="purchase-muted">{paymentMethod === 'COD' ? 'Bạn sẽ thanh toán khi nhận hàng.' : 'Mã QR sẽ xuất hiện ở bước tiếp theo. Đơn chỉ ghi nhận đã thanh toán khi hệ thống xác nhận.'}</p>
        </PurchaseSummary>
      </div>
      <div className="cart-mobile-checkout"><div><span>Tổng thanh toán</span><strong>{money(cart.finalPrice)}</strong></div><button type="submit" form="checkout-form" className="cart-button cart-checkout" disabled={disabled}>{submitLabel}<ArrowRight size={16} /></button></div>
    </>}
  </PurchaseShell>;
}

export default function Checkout() {
  const { user } = useAuth();
  return <CheckoutContent key={user?._id || user?.id || 'guest'} />;
}
