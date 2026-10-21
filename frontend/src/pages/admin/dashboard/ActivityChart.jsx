import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import axiosClient from '../../../api/axiosClient';
import { LoadingState, ErrorState, EmptyState } from '../components/AdminUI';
import { money } from '../adminConfig';

export default function ActivityChart() {
  const [basis, setBasis] = useState('completedAt');
  const [period, setPeriod] = useState('daily');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true); setError('');
      try {
        const response = await axiosClient.get('/dashboard/activity', { params: { period, basis }, signal: controller.signal });
        if (!controller.signal.aborted) setData(response.data.data);
      } catch (error) {
        if (!controller.signal.aborted) setError(error.response?.data?.message || 'Không thể tải biểu đồ.');
      } finally { if (!controller.signal.aborted) setLoading(false); }
    };
    void load();
    return () => controller.abort();
  }, [period, basis, version]);
  return <section className="admin-panel h-full">
    <div className="admin-panel-header flex-wrap"><div><h2>Doanh thu theo kỳ</h2><p className="admin-muted text-xs mt-1">Giờ Việt Nam · Theo ngày hoàn tất/thu tiền chỉ gồm đơn có ghi nhận thời điểm</p></div>
      <select aria-label="Cơ sở thống kê" value={basis} onChange={e => setBasis(e.target.value)}><option value="completedAt">Ngày hoàn tất</option><option value="paidAt">Ngày thu tiền (trừ đơn hủy)</option><option value="createdAt">Ngày đặt đơn đã giao</option></select>
      <select aria-label="Kỳ thống kê doanh thu" value={period} onChange={e => setPeriod(e.target.value)}><option value="daily">7 ngày gần đây</option><option value="weekly">8 tuần gần đây</option><option value="monthly">12 tháng gần đây</option></select>
    </div>
    <div className="p-5 h-[320px]">
      {error ? <ErrorState message={error} onRetry={() => setVersion(value => value + 1)} /> : loading ? <LoadingState /> : !data.some(row => row.value > 0) ? <EmptyState title="Chưa có doanh thu trong kỳ" message="Thử chọn khoảng thời gian khác." /> :
      <ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ top: 10, right: 0, left: 0, bottom: 5 }} accessibilityLayer>
        <CartesianGrid vertical={false} stroke="var(--admin-border)" strokeDasharray="3 5" />
        <XAxis dataKey="name" tick={{ fill: 'var(--admin-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis width={58} tick={{ fill: 'var(--admin-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={value => new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(value)} />
        <Tooltip contentStyle={{ backgroundColor: 'var(--admin-surface)', border: '1px solid var(--admin-border)', borderRadius: 10, color: 'var(--admin-text)' }} itemStyle={{ color: 'var(--admin-accent)' }} cursor={{ fill: '#ffffff08' }} formatter={value => [money(value), 'Doanh thu']} />
        <Bar dataKey="value" fill="var(--admin-accent)" radius={[5, 5, 0, 0]} maxBarSize={32} />
      </BarChart></ResponsiveContainer>}
    </div>
  </section>;
}
