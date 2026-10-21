import { Component } from 'react';
import { Link, useLocation } from 'react-router-dom';

class PageErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Không thể hiển thị trang:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return <section className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center px-6 py-16 text-center" role="alert">
      <h1 className="text-2xl font-bold text-brand-700">Không thể tải trang này</h1>
      <p className="mt-4 text-sm leading-7 text-slate-600">Nội dung trang chưa tải được hoặc đã có bản cập nhật mới. Bạn có thể tải lại trang hoặc quay về để tiếp tục xem.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={() => window.location.reload()} className="rounded-lg bg-brand-700 px-5 py-3 font-semibold text-white hover:bg-brand-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">
          Tải lại trang
        </button>
        <Link to={this.props.returnTo} className="rounded-lg border border-brand-700 px-5 py-3 font-semibold text-brand-700 hover:bg-brand-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">
          {this.props.returnTo === '/news' ? 'Về trang Tin tức' : 'Về trang chủ'}
        </Link>
      </div>
    </section>;
  }
}

export default function RouteErrorBoundary({ children }) {
  const { pathname, search } = useLocation();
  // A new URL resets the failed page, so Back/Forward and navigation still work.
  // Reload explicitly retries a failed lazy import, whose rejection React caches.
  return <PageErrorBoundary key={`${pathname}${search}`} returnTo={pathname.startsWith('/news/') ? '/news' : '/'}>
    {children}
  </PageErrorBoundary>;
}
