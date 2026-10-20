import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ImageOff, LoaderCircle, CircleAlert } from 'lucide-react';
import { money } from './purchaseFormat';
import '../../pages/client/CartPage.css';
import './PurchaseFlow.css';

export function PurchaseShell({ title, description, step = 2, mobile = false, children }) {
  return <div className={'cart-page purchase-page' + (mobile ? ' cart-page-filled' : '')}><div className="cart-container">
    <nav className="cart-breadcrumb" aria-label="Đường dẫn"><Link to="/">Trang chủ</Link><ChevronRight size={12} /><Link to="/cart">Giỏ hàng</Link><ChevronRight size={12} /><span aria-current="page">{step === 3 ? 'Kết quả đơn hàng' : 'Thanh toán'}</span></nav>
    <header className="cart-heading"><div><p className="cart-eyebrow">DOCA STORE · MUA SẮM CÙNG BẠN</p><h1>{title}<span className="cart-heading-dot">.</span></h1><p>{description}</p></div>
      <ol className="cart-steps" aria-label="Các bước mua hàng">{['Giỏ hàng', 'Thanh toán', 'Hoàn tất'].map((label, index) => <li key={label} aria-current={step === index + 1 ? 'step' : undefined}><span>0{index + 1}</span>{label}</li>)}</ol>
    </header>{children}
  </div></div>;
}

export function PurchaseCard({ title, icon: Icon, children, action }) {
  return <section className="purchase-card"><div className="purchase-card-heading"><h2>{Icon && <Icon size={19} aria-hidden="true" />}{title}</h2>{action}</div>{children}</section>;
}

export function PurchaseAlert({ children, onRetry, busy, tone = 'warning' }) {
  return <div className={'purchase-alert purchase-alert-' + tone} role="alert"><CircleAlert size={18} aria-hidden="true" /><div>{children}</div>{onRetry && <button type="button" className="purchase-text-button" disabled={busy} onClick={onRetry}>Thử lại</button>}</div>;
}

export function PurchaseLoading() {
  return <div className="purchase-loading" role="status"><LoaderCircle className="animate-spin" size={26} /><p>Đang tải thông tin…</p></div>;
}

function ProductImage({ src, name }) {
  const [broken, setBroken] = useState(false);
  return <div className="purchase-product-image">{src && !broken ? <img src={src} alt={name} loading="lazy" onError={() => setBroken(true)} /> : <ImageOff size={22} aria-label="Chưa có ảnh sản phẩm" />}</div>;
}

export function PurchaseProducts({ items, cart = false }) {
  return <ul className="purchase-products">{items.map((item, index) => {
    const product = cart ? item.product_id : item.productId;
    const name = (cart ? product?.name : item.name || product?.name) || 'Sản phẩm không còn khả dụng';
    const price = cart ? product?.price : item.priceAtPurchase;
    return <li key={item._id || product?._id || index}><ProductImage key={product?.imageUrl || index} src={product?.imageUrl} name={name} /><div className="purchase-product-info"><p>{name}</p><span>{item.quantity} × {money(price)}</span></div><strong>{money(item.quantity * (price || 0))}</strong></li>;
  })}</ul>;
}

export function PurchaseSummary({ subtotal, discount = 0, total, messages = [], children, title = 'Tóm tắt đơn hàng', totalLabel = 'Tổng thanh toán' }) {
  return <aside className="cart-summary purchase-summary"><p className="cart-summary-kicker">THÔNG TIN ĐƠN HÀNG</p><h2>{title}</h2><dl className="cart-summary-lines"><div><dt>Tạm tính</dt><dd>{money(subtotal)}</dd></div>{discount > 0 && <div className="cart-summary-discount"><dt>Ưu đãi</dt><dd>−{money(discount)}</dd></div>}</dl>{messages.length > 0 && <ul className="purchase-discounts">{messages.map((message, index) => <li key={index}>{message}</li>)}</ul>}<div className="cart-summary-total"><span>{totalLabel}</span><strong>{money(total)}</strong></div>{children}</aside>;
}
