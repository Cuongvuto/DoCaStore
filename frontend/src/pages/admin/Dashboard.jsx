import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, ShoppingBag, Package, Users, MessagesSquare, Banknote, Clock, ArrowUpRight } from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import { useAuth } from '../../context/AuthContext';
import { PageHeading, LoadingState, ErrorState, EmptyState, StatusBadge } from './components/AdminUI';
import { ORDER_LABELS, money, dateTime, ADMIN_MENU } from './adminConfig';
import ActivityChart from './dashboard/ActivityChart';

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true); setError('');
      try {
        const response = await axiosClient.get('/dashboard/overview', { signal: controller.signal });
        if (!controller.signal.aborted) setData(response.data.data);
      } catch (error) {
        if (!controller.signal.aborted) setError(error.response?.data?.message || 'Không thể tải tổng quan.');
      } finally { if (!controller.signal.aborted) setLoading(false); }
    };
    void load();
    return () => controller.abort();
  }, [version]);
  const stats = data?.stats || {};
  const permissions = data?.permissions || {};
  const metrics = [
    ...(permissions.orders ? [
      { title: 'Doanh thu đơn đã giao', value: money(stats.totalRevenue), icon: Banknote, note: 'Tổng giá trị sau giảm giá', path: '/admin/orders?status=completed' },
      { title: 'Đơn chờ xác nhận', value: stats.pendingOrders, icon: Clock, note: 'Cần kiểm tra và xử lý', path: '/admin/orders?status=pending' },
      { title: 'Đang chuẩn bị', value: stats.processingOrders, icon: ShoppingBag, note: stats.totalOrders + ' đơn trong hệ thống', path: '/admin/orders?status=processing' }
    ] : []),
    ...(permissions.products ? [
      { title: 'Sản phẩm', value: stats.totalProducts, icon: Package, note: stats.outOfStock + ' hết hàng · ' + stats.lowStockCount + ' sắp hết', path: '/admin/products' }
    ] : []),
    ...(permissions.support ? [
      { title: 'Yêu cầu chờ hỗ trợ', value: stats.waitingTickets, icon: MessagesSquare, note: stats.activeTickets + ' phiên đang xử lý', path: '/admin/messages' }
    ] : []),
    ...(permissions.users ? [{ title: 'Tài khoản', value: stats.totalUsers, icon: Users, note: 'Khách hàng và nhân viên', path: '/admin/users' }] : [])
  ];
  const links = ADMIN_MENU.filter(item => item.path !== '/admin' && item.roles.includes(user?.role));
  return <div>
    <PageHeading title="Tổng quan cửa hàng" description={'Chào ' + (user?.name || 'bạn') + ', đây là những thông tin cần chú ý.'}>
      <button className="admin-button" onClick={() => setVersion(value => value + 1)} disabled={loading}><RefreshCw size={16} className={loading ? 'animate-spin' : ''} />Làm mới</button>
    </PageHeading>
    {error ? <ErrorState message={error} onRetry={() => setVersion(value => value + 1)} /> : loading ? <LoadingState /> : data && <>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        {metrics.map(metric => { const Icon = metric.icon; return <Link key={metric.title} to={metric.path} className="admin-panel admin-metric hover:border-emerald-600"><div className="admin-metric-label"><Icon size={17} />{metric.title}<ArrowUpRight className="ml-auto" size={15} /></div><strong className="admin-metric-value">{metric.value ?? 0}</strong><p className="admin-metric-note">{metric.note}</p></Link>; })}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        {permissions.orders && <div className="xl:col-span-2"><ActivityChart key={version} /></div>}
        <section className={'admin-panel ' + (!permissions.orders ? 'xl:col-span-3' : '')}>
          <div className="admin-panel-header"><h2>Truy cập nhanh</h2></div>
          <div className="grid gap-2 p-4 sm:grid-cols-2 xl:grid-cols-1">{links.map(item => { const Icon = item.icon; return <Link className="admin-nav-link" key={item.path} to={item.path}><Icon size={17} />{item.name}<ArrowUpRight className="ml-auto" size={15} /></Link>; })}</div>
        </section>
      </div>
      {permissions.orders && <section className="admin-panel mb-6">
        <div className="admin-panel-header"><h2>Đơn hàng gần đây</h2><Link className="admin-link text-sm" to="/admin/orders">Xem tất cả →</Link></div>
        {data.recentOrders.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Mã đơn / Khách hàng</th><th>Ngày đặt</th><th>Tổng tiền</th><th>Trạng thái</th></tr></thead><tbody>{data.recentOrders.map(order => <tr key={order._id}><td><Link className="admin-link" to={'/admin/orders?search=' + order._id}>#{order._id.slice(-6).toUpperCase()}</Link><p className="admin-muted mt-1">{order.shippingAddress?.receiverName || 'Khách hàng'}</p></td><td>{dateTime(order.createdAt)}</td><td>{money(order.totalPrice)}</td><td><StatusBadge status={order.status}>{ORDER_LABELS[order.status]}</StatusBadge></td></tr>)}</tbody></table></div> : <EmptyState title="Chưa có đơn hàng" message="Đơn hàng mới sẽ xuất hiện tại đây." />}
      </section>}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {permissions.products && <section className="admin-panel"><div className="admin-panel-header"><h2>Tồn kho cần chú ý</h2><Link className="admin-link text-sm" to="/admin/products?stock=low">Lọc sắp hết →</Link></div>{data.lowStock.length ? <div className="divide-y divide-emerald-900/40">{data.lowStock.map(item => <div key={item._id} className="flex justify-between items-center gap-4 p-5"><p>{item.name}</p><StatusBadge status={item.stock > 0 ? 'low' : 'out'}>{item.stock > 0 ? 'Còn ' + item.stock : 'Hết hàng'}</StatusBadge></div>)}</div> : <EmptyState title="Tồn kho ổn định" message="Không có sản phẩm ở mức tồn kho từ 5 trở xuống." />}</section>}
        {permissions.orders && <section className="admin-panel"><div className="admin-panel-header"><h2>Sản phẩm bán chạy</h2><span className="admin-muted text-xs">Theo đơn đã giao</span></div>{data.bestSellingProducts.length ? <ol>{data.bestSellingProducts.map((item, index) => <li key={item._id} className="flex gap-4 items-center p-5 border-b border-emerald-900/30 last:border-0"><span className="admin-muted text-lg">{String(index + 1).padStart(2, '0')}</span><p className="flex-1">{item.name}</p><strong>{item.sold} <span className="admin-muted text-xs font-normal">đã bán</span></strong></li>)}</ol> : <EmptyState title="Chưa có dữ liệu bán hàng" message="Thống kê xuất hiện sau khi đơn được giao." />}</section>}
      </div>
    </>}
  </div>;
}
