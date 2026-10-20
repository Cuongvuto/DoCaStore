import { ArrowLeft, ArrowRight, RefreshCw } from 'lucide-react';

export function ProfileEmpty({ icon: Icon, title, description, children }) {
  return <div className="profile-empty"><span>{Icon && <Icon size={30} aria-hidden="true" />}</span><h3>{title}</h3><p>{description}</p>{children}</div>;
}

export function ProfilePagination({ page, totalPages, onChange, disabled = false }) {
  if (totalPages <= 1) return null;
  return <nav className="profile-pagination" aria-label="Phân trang"><button type="button" className="cart-button cart-button-outline" disabled={disabled || page <= 1} onClick={() => onChange(page - 1)}><ArrowLeft size={15} /> Trước</button><span>Trang <strong>{page}</strong> / {totalPages}</span><button type="button" className="cart-button cart-button-outline" disabled={disabled || page >= totalPages} onClick={() => onChange(page + 1)}>Sau <ArrowRight size={15} /></button></nav>;
}

export function ProfileRefresh({ busy, onClick }) {
  return <button type="button" className="profile-refresh" disabled={busy} onClick={onClick}><RefreshCw size={14} className={busy ? 'animate-spin' : ''} />{busy ? 'Đang tải…' : 'Làm mới'}</button>;
}
