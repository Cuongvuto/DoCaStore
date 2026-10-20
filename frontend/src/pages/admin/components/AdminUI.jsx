import { useEffect, useId, useRef } from 'react';
import { X, Search, ChevronLeft, ChevronRight, RefreshCw, Inbox, AlertCircle, LoaderCircle } from 'lucide-react';

export const PageHeading = ({ title, description, children }) => <div className="admin-page-heading"><div><p className="admin-eyebrow">DOCA / QUẢN TRỊ</p><h1>{title}</h1><p className="admin-muted">{description}</p></div><div className="flex flex-wrap gap-2">{children}</div></div>;
export const SearchField = ({ value, onChange, placeholder = 'Tìm kiếm…' }) => <label className="admin-search"><Search size={18} aria-hidden="true" /><span className="sr-only">{placeholder}</span><input type="search" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} /></label>;
export const Field = ({ label, children, hint }) => <label className="admin-field"><span>{label}</span>{children}{hint && <small className="admin-muted">{hint}</small>}</label>;
export const StatusBadge = ({ status, children }) => <span className={'admin-badge admin-badge-' + status}>{children || status}</span>;
export const EmptyState = ({ title = 'Chưa có dữ liệu', message = 'Dữ liệu sẽ xuất hiện tại đây khi có cập nhật.', children }) => <div className="admin-empty"><Inbox size={32} /><h3>{title}</h3><p>{message}</p>{children}</div>;
export const ErrorState = ({ message, onRetry }) => <div className="admin-error" role="alert"><AlertCircle size={20} /><span>{message}</span>{onRetry && <button className="admin-button" onClick={onRetry}><RefreshCw size={15} />Thử lại</button>}</div>;
export const LoadingState = () => <div className="admin-empty" role="status"><LoaderCircle size={26} className="animate-spin" /><p>Đang tải dữ liệu…</p></div>;
export const Pagination = ({ page, pages, total, onChange, loading }) => <div className="admin-pagination"><span>{total} kết quả · Trang {page}/{pages}</span><div className="flex gap-2"><button className="admin-button" aria-label="Trang trước" disabled={loading || page <= 1} onClick={() => onChange(page - 1)}><ChevronLeft size={17} /></button><button className="admin-button" aria-label="Trang sau" disabled={loading || page >= pages} onClick={() => onChange(page + 1)}><ChevronRight size={17} /></button></div></div>;

export const AdminModal = ({ title, onClose, children, busy = false, wide = false }) => {
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return <dialog ref={ref} className={'admin-modal admin-theme' + (wide ? ' admin-modal-wide' : '')} aria-labelledby={titleId} onCancel={e => { e.preventDefault(); if (!busy) onClose(); }}>
    <header><h2 id={titleId}>{title}</h2><button type="button" className="admin-button" aria-label="Đóng hộp thoại" disabled={busy} onClick={onClose}><X size={18} /></button></header>
    <div className="admin-modal-body">{children}</div>
  </dialog>;
};
export const ConfirmDialog = ({ title, message, onConfirm, onClose, busy, label = 'Xác nhận', danger = false }) => <AdminModal title={title} onClose={onClose} busy={busy}><p className="admin-muted mb-6">{message}</p><div className="flex justify-end gap-3"><button className="admin-button" disabled={busy} onClick={onClose}>Quay lại</button><button className={'admin-button ' + (danger ? 'admin-button-danger' : 'admin-button-primary')} disabled={busy} onClick={onConfirm}>{busy ? 'Đang xử lý…' : label}</button></div></AdminModal>;
