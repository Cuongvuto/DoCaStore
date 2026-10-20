import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, ChevronRight, CircleAlert, CreditCard, ImageOff, LoaderCircle, Minus, Package, Plus, RefreshCw, ShoppingBag, TicketPercent, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import axiosClient from '../../api/axiosClient';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import './CartPage.css';

const money = value => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(value) || 0);
const hasStockIssue = item => !item.product_id || item.product_id.stock <= 0 || item.quantity > item.product_id.stock;
const cartError = error => error.response?.data?.message || 'Không thể kết nối tới cửa hàng. Vui lòng thử lại.';

function ProductPhoto({ src, name }) {
  const [broken, setBroken] = useState(false);
  return src && !broken
    ? <img src={src} alt={name} loading="lazy" onError={() => setBroken(true)} />
    : <span className="cart-photo-fallback"><ImageOff size={28} aria-hidden="true" /><span>Chưa có ảnh</span></span>;
}

function QuantityControl({ quantity, stock, name, disabled, onChange }) {
  const [draft, setDraft] = useState(String(quantity));
  const commit = () => {
    const next = Number(draft);
    if (!/^\d+$/.test(draft) || !Number.isSafeInteger(next) || next < 1 || (Number.isFinite(stock) && next > stock)) {
      setDraft(String(quantity));
      toast.error(stock > 0 ? 'Số lượng phải từ 1 đến ' + stock + '.' : 'Số lượng không hợp lệ.');
      return;
    }
    if (next !== quantity) {
      setDraft(String(quantity));
      onChange(next);
    }
  };
  return <div className="cart-quantity" role="group" aria-label={'Số lượng ' + name}>
    <button type="button" disabled={disabled || quantity <= 1 || stock === 0} aria-label={'Giảm số lượng ' + name} onClick={() => onChange(Math.min(quantity - 1, stock ?? quantity - 1))}><Minus size={15} /></button>
    <input aria-label={'Nhập số lượng ' + name} type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6} value={draft} disabled={disabled || stock === 0} onChange={event => setDraft(event.target.value)} onBlur={commit} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); if (event.key === 'Escape') { event.preventDefault(); setDraft(String(quantity)); } }} />
    <button type="button" disabled={disabled || quantity >= stock} aria-label={'Tăng số lượng ' + name} onClick={() => onChange(quantity + 1)}><Plus size={15} /></button>
  </div>;
}

function CartSkeleton() {
  return <div className="cart-layout cart-skeleton" role="status" aria-label="Đang tải giỏ hàng">
    <div className="cart-items-panel">{[1, 2, 3].map(item => <div className="cart-skeleton-row" key={item}><div /><span><i /><i /><i /></span></div>)}</div>
    <div className="cart-skeleton-summary"><i /><i /><i /></div>
    <span className="sr-only">Đang tải giỏ hàng…</span>
  </div>;
}

function CartContent() {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  const [operation, setOperation] = useState(null);
  const [removeId, setRemoveId] = useState(null);
  const lock = useRef(false);
  const lifetime = useRef(null);
  const { updateCartCount } = useCart();
  const navigate = useNavigate();

  const readCart = useCallback(async signal => {
    const response = await axiosClient.get('/cart', { signal });
    const data = response.data?.data;
    if (!data || !Array.isArray(data.items)) throw new Error('Invalid cart response');
    if (!signal.aborted) setCart(data);
    return data;
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    const load = async () => {
      setLoading(true); setError('');
      try { await readCart(controller.signal); }
      catch (error) { if (!controller.signal.aborted) setError(cartError(error)); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    };
    void load();
    return () => controller.abort();
  }, [readCart, version]);

  const mutate = async (id, quantity) => {
    if (lock.current || loading || error || !id) return;
    lock.current = true;
    const signal = lifetime.current.signal;
    const removing = quantity === null;
    setOperation({ id, kind: removing ? 'remove' : 'quantity' });
    let saved = false;
    try {
      if (removing) await axiosClient.delete('/cart/' + id, { signal });
      else await axiosClient.put('/cart/' + id, { quantity }, { signal });
      saved = true;
      await readCart(signal);
      if (signal.aborted) return;
      if (removing) { setRemoveId(null); toast.success('Đã xóa sản phẩm khỏi giỏ hàng.'); void updateCartCount(); }
    } catch (error) {
      if (signal.aborted) return;
      if (saved) setError('Đã gửi thay đổi nhưng chưa tải lại được giỏ hàng. Hãy thử tải lại để kiểm tra tổng tiền.');
      else toast.error(cartError(error));
    } finally {
      lock.current = false;
      if (!signal.aborted) setOperation(null);
    }
  };

  const checkout = async () => {
    if (lock.current || loading || error) return;
    lock.current = true;
    const signal = lifetime.current.signal;
    setOperation({ kind: 'checkout' });
    try {
      const current = await readCart(signal);
      if (signal.aborted) return;
      if (!current.items.length) return toast.info('Giỏ hàng hiện đang trống.');
      if (current.items.some(hasStockIssue)) return toast.error('Vui lòng điều chỉnh các sản phẩm có cảnh báo tồn kho.');
      navigate('/checkout');
    } catch (error) { if (!signal.aborted) setError(cartError(error)); }
    finally { lock.current = false; if (!signal.aborted) setOperation(null); }
  };

  const items = cart?.items || [];
  const quantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const stockIssues = items.filter(hasStockIssue).length;
  const busy = Boolean(operation);
  const total = cart?.finalPrice ?? cart?.totalPrice ?? cart?.subTotal ?? 0;
  const blocked = busy || loading || Boolean(error) || stockIssues > 0 || !items.length;
  const checkoutLabel = operation?.kind === 'checkout' ? 'Đang kiểm tra…' : 'Tiến hành thanh toán';

  return <div className={'cart-page' + (items.length ? ' cart-page-filled' : '')}>
    <div className="cart-container">
      <nav className="cart-breadcrumb" aria-label="Đường dẫn"><Link to="/">Trang chủ</Link><ChevronRight size={13} aria-hidden="true" /><span aria-current="page">Giỏ hàng</span></nav>
      <header className="cart-heading">
        <div><p className="cart-eyebrow">CHUẨN BỊ CHO CHUYẾN CÂU TIẾP THEO</p><h1>Giỏ hàng của bạn<span className="cart-heading-dot">.</span></h1><p>Kiểm tra lựa chọn của bạn trước khi lên đường.</p></div>
        <ol className="cart-steps" aria-label="Các bước mua hàng">
          <li aria-current="step"><span>01</span>Giỏ hàng</li><li><span>02</span>Thanh toán</li><li><span>03</span>Hoàn tất</li>
        </ol>
      </header>

      {error && <div className="cart-error" role="alert"><CircleAlert size={21} /><div><strong>Chưa thể cập nhật giỏ hàng</strong><p>{error}</p></div><button className="cart-button cart-button-outline" disabled={busy || loading} onClick={() => setVersion(value => value + 1)}><RefreshCw size={16} />Thử lại</button></div>}

      {loading && !cart ? <CartSkeleton /> : !cart ? <div className="cart-failed"><Package size={38} aria-hidden="true" /><p>Thông tin giỏ hàng sẽ xuất hiện khi kết nối được khôi phục.</p><Link to="/products" className="cart-back"><ArrowLeft size={16} />Quay lại cửa hàng</Link></div> : !items.length ? <section className="cart-empty">
        <div className="cart-empty-art"><ShoppingBag size={48} strokeWidth={1.3} /><span><Plus size={18} /></span></div>
        <p className="cart-eyebrow">CHUYẾN CÂU BẮT ĐẦU TỪ ĐÂY</p><h2>Giỏ hàng đang chờ bạn</h2><p>Khám phá đồ câu và chọn những món phù hợp<br className="hidden sm:block" /> cho chuyến đi sắp tới.</p>
        <Link to="/products" className="cart-button cart-button-primary">Khám phá sản phẩm<ArrowRight size={18} /></Link><Link to="/wishlist" className="cart-empty-wishlist">Xem sản phẩm yêu thích</Link>
      </section> : <div className="cart-layout">
        <section className="cart-products" aria-labelledby="cart-products-title">
          <div className="cart-section-heading"><h2 id="cart-products-title">Sản phẩm đã chọn <span>{items.length}</span></h2><span>{quantity} sản phẩm</span></div>
          {stockIssues > 0 && <div className="cart-stock-alert" role="status"><CircleAlert size={17} /><p>Có {stockIssues} mặt hàng cần điều chỉnh số lượng hoặc xóa trước khi thanh toán.</p></div>}
          <div className="cart-items-panel" aria-busy={busy || loading}>
            <div className="cart-table-labels" aria-hidden="true"><span>Sản phẩm</span><span>Số lượng</span><span>Thành tiền</span><span /></div>
            <ul>{items.map((item, index) => {
              const product = item.product_id;
              const id = product?._id;
              const name = product?.name || 'Sản phẩm không còn khả dụng';
              const outOfStock = !product || product.stock <= 0;
              const overStock = product && item.quantity > product.stock && !outOfStock;
              const updating = operation?.id === id;
              const rowKey = id || item._id || String(index);
              return <li key={rowKey} className={'cart-item' + (outOfStock ? ' cart-item-unavailable' : '')}>
                <div className="cart-item-main">
                  {id ? <Link to={'/product/' + id} className="cart-product-photo" aria-label={'Xem ' + name}><ProductPhoto key={product.imageUrl} src={product.imageUrl} name={name} /></Link> : <div className="cart-product-photo"><ProductPhoto name={name} /></div>}
                  <div className="cart-product-info">{id ? <Link className="cart-product-name" to={'/product/' + id}>{name}</Link> : <h3 className="cart-product-name">{name}</h3>}
                    <p className="cart-unit-price">{money(product?.price)}<span> / sản phẩm</span></p>
                    <p className={'cart-stock ' + (outOfStock || overStock ? 'cart-stock-warning' : '')}>{outOfStock ? <CircleAlert size={13} /> : <span className="cart-stock-dot" />}{outOfStock ? 'Tạm hết hàng' : overStock ? 'Chỉ còn ' + product.stock + ' sản phẩm' : product.stock <= 5 ? 'Còn ' + product.stock + ' sản phẩm' : 'Còn hàng'}</p>
                  </div>
                </div>
                <div className="cart-item-quantity"><QuantityControl key={item.quantity + ':' + busy} quantity={item.quantity} stock={product?.stock} name={name} disabled={busy || loading || Boolean(error) || !id} onChange={next => mutate(id, next)} />{updating && operation.kind === 'quantity' && <span className="cart-item-saving" role="status"><LoaderCircle size={12} className="animate-spin" />Đang lưu</span>}</div>
                <div className="cart-item-total"><span>Thành tiền</span><strong>{money((product?.price || 0) * item.quantity)}</strong></div>
                <button className="cart-remove" type="button" aria-label={'Xóa ' + name} title="Xóa sản phẩm" disabled={busy || loading || Boolean(error) || !id} onClick={() => setRemoveId(removeId === id ? null : id)}><Trash2 size={17} /></button>
                {removeId === id && id && <div className="cart-remove-confirm"><p>Xóa sản phẩm này khỏi giỏ hàng?</p><div><button type="button" disabled={busy} onClick={() => setRemoveId(null)}>Giữ lại</button><button type="button" className="cart-confirm-danger" disabled={busy} onClick={() => mutate(id, null)}>{updating ? 'Đang xóa…' : 'Xóa sản phẩm'}</button></div></div>}
              </li>;
            })}</ul>
          </div>
          <div className="cart-list-footer"><Link to="/products" className="cart-back"><ArrowLeft size={16} />Tiếp tục mua sắm</Link><p><RefreshCw size={13} className={loading ? 'animate-spin' : ''} />{loading ? 'Đang cập nhật giỏ hàng…' : 'Giá và tồn kho được kiểm tra lại khi thanh toán.'}</p></div>
          {cart.discountAmount > 0 && <div className="cart-discount-note"><span className="cart-discount-icon"><TicketPercent size={22} /></span><div><strong>Thêm một lý do để bắt đầu chuyến đi</strong><p>{cart.discountMessages?.join(' · ') || 'Ưu đãi của bạn đã được áp dụng vào tổng tiền.'}</p></div><span className="cart-discount-value">−{money(cart.discountAmount)}</span></div>}
        </section>

        <aside className="cart-summary" aria-labelledby="cart-summary-title">
          <p className="cart-summary-kicker">SẴN SÀNG CHO CHUYẾN ĐI</p><h2 id="cart-summary-title">Tóm tắt giỏ hàng</h2>
          <dl className="cart-summary-lines"><div><dt>Tạm tính <span>({quantity} sản phẩm)</span></dt><dd>{money(cart.subTotal ?? cart.totalPrice)}</dd></div>{cart.discountAmount > 0 && <div className="cart-summary-discount"><dt>Ưu đãi đã áp dụng</dt><dd>−{money(cart.discountAmount)}</dd></div>}</dl>
          <div className="cart-summary-total" aria-live="polite" aria-atomic="true"><span>Tổng tiền hàng</span><strong>{money(total)}</strong>{cart.discountAmount > 0 && <p><Check size={14} />Bạn tiết kiệm {money(cart.discountAmount)}</p>}</div>
          <button className="cart-button cart-checkout" type="button" disabled={blocked} onClick={checkout}>{busy ? <LoaderCircle size={18} className="animate-spin" /> : null}{checkoutLabel}{!busy && <ArrowRight size={18} />}</button>
          {stockIssues > 0 && <p className="cart-summary-warning">Vui lòng xử lý cảnh báo tồn kho để tiếp tục.</p>}
          <div className="cart-summary-coupon"><TicketPercent size={19} /><p>Có mã giảm giá?<span>Nhập mã ở bước thanh toán.</span></p></div>
          <div className="cart-summary-methods"><CreditCard size={17} /><span>Thanh toán khi nhận hàng hoặc VietQR</span></div>
        </aside>
      </div>}
      <p className="sr-only" role="status">{operation?.kind === 'quantity' ? 'Đang cập nhật số lượng và tổng tiền.' : operation?.kind === 'remove' ? 'Đang xóa sản phẩm.' : ''}</p>
    </div>
    {items.length > 0 && <div className="cart-mobile-checkout"><div><span>Tổng tiền hàng</span><strong>{money(total)}</strong></div><button className="cart-button cart-button-primary" disabled={blocked} onClick={checkout}>{busy ? <LoaderCircle size={17} className="animate-spin" /> : null}{busy ? 'Đang xử lý…' : 'Thanh toán'}{!busy && <ArrowRight size={17} />}</button></div>}
  </div>;
}

export default function CartPage() {
  const { user } = useAuth();
  return <CartContent key={user?._id || user?.id || 'guest'} />;
}
