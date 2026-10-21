import { ChevronLeft, ChevronRight } from 'lucide-react';
import './Pagination.css';

export default function Pagination({ currentPage, totalPages, onChange, label = 'Phân trang' }) {
  if (totalPages <= 1) return null;
  const pages = [...new Set([1, currentPage - 1, currentPage, currentPage + 1, totalPages])]
    .filter(page => page >= 1 && page <= totalPages).sort((a, b) => a - b);
  const items = [];
  pages.forEach((page, index) => {
    const previous = pages[index - 1];
    if (previous && page - previous === 2) items.push(previous + 1);
    else if (previous && page - previous > 2) items.push(`gap-${page}`);
    items.push(page);
  });

  return <nav className="store-pagination" aria-label={label}>
    <button type="button" className="store-pagination-step" disabled={currentPage <= 1} onClick={() => onChange(currentPage - 1)}>
      <ChevronLeft size={17} aria-hidden="true" /> Trước
    </button>
    <div className="store-pagination-pages">
      {items.map(page => typeof page === 'number' ? <button
        key={page} type="button" aria-label={`Trang ${page}`}
        aria-current={page === currentPage ? 'page' : undefined}
        onClick={() => { if (page !== currentPage) onChange(page); }}
      >{page}</button> : <span key={page} className="store-pagination-gap" aria-hidden="true">…</span>)}
    </div>
    <button type="button" className="store-pagination-step" disabled={currentPage >= totalPages} onClick={() => onChange(currentPage + 1)}>
      Sau <ChevronRight size={17} aria-hidden="true" />
    </button>
  </nav>;
}
