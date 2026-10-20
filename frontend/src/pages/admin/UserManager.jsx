import { useRef, useState } from 'react';
import { Plus, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import axiosClient from '../../api/axiosClient';
import { useAuth } from '../../context/AuthContext';
import useAdminList, { useAdminFilters } from './hooks/useAdminList';
import { PageHeading, SearchField, Field, StatusBadge, EmptyState, ErrorState, LoadingState, Pagination, AdminModal, ConfirmDialog } from './components/AdminUI';
import { ROLE_LABELS, money } from './adminConfig';

export default function UserManager() {
  const { user: actor } = useAuth();
  const { filters, setFilter, clearFilters } = useAdminFilters();
  const list = useAdminList('/user', filters);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'customer' });
  const [formError, setFormError] = useState('');
  const [action, setAction] = useState(null);
  const [busy, setBusy] = useState(false);
  const mutation = useRef(false);
  const roles = Object.entries(ROLE_LABELS).filter(([role]) => role !== 'superadmin' || actor?.role === 'superadmin');
  const protectedUser = user => user._id === actor?._id || (user.role === 'superadmin' && actor?.role !== 'superadmin');
  const save = async event => {
    event.preventDefault();
    if (mutation.current) return;
    mutation.current = true; setBusy(true); setFormError('');
    try {
      await axiosClient.post('/user/admin/staff', form);
      toast.success('Đã tạo tài khoản.');
      setCreating(false); setForm({ name: '', email: '', password: '', role: 'customer' }); list.reload();
    } catch (error) { setFormError(error.response?.data?.message || 'Không thể tạo tài khoản.'); }
    finally { mutation.current = false; setBusy(false); }
  };
  const confirmAction = async () => {
    if (mutation.current) return;
    mutation.current = true; setBusy(true);
    try {
      if (action.type === 'delete') await axiosClient.delete('/user/' + action.user._id);
      else await axiosClient.put('/user/' + action.user._id + '/role', { role: action.role });
      toast.success(action.type === 'delete' ? 'Đã xóa tài khoản.' : 'Đã cập nhật vai trò.');
      if (action.type === 'delete' && list.data.length === 1 && list.currentPage > 1) setFilter('page', list.currentPage - 1); else list.reload();
      setAction(null);
    } catch (error) { toast.error(error.response?.data?.message || 'Không thể cập nhật tài khoản.'); }
    finally { mutation.current = false; setBusy(false); }
  };
  return <div>
    <PageHeading title="Người dùng" description="Quản lý tài khoản, trạng thái xác thực và quyền truy cập.">
      <button className="admin-button" onClick={list.reload} disabled={list.loading}><RefreshCw size={16} />Làm mới</button>
      <button className="admin-button admin-button-primary" onClick={() => { setFormError(''); setCreating(true); }}><Plus size={17} />Tạo tài khoản</button>
    </PageHeading>
    <div className="admin-toolbar">
      <SearchField value={filters.search || ''} onChange={value => setFilter('search', value)} placeholder="Tìm họ tên hoặc email…" />
      <Field label="Vai trò"><select value={filters.role || ''} onChange={e => setFilter('role', e.target.value)}><option value="">Tất cả vai trò</option>{Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
      <Field label="Xác thực email"><select value={filters.verified || ''} onChange={e => setFilter('verified', e.target.value)}><option value="">Tất cả</option><option value="true">Đã xác thực</option><option value="false">Chưa xác thực</option></select></Field>
      {Object.keys(filters).length > 0 && <button className="admin-button" onClick={clearFilters}>Xóa bộ lọc</button>}
    </div>
    <section className="admin-panel">
      {list.error ? <ErrorState message={list.error} onRetry={list.reload} /> : list.loading ? <LoadingState /> : !list.data.length ? <EmptyState title="Không có tài khoản phù hợp" message="Thử thay đổi tên, email hoặc bộ lọc." /> :
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Tài khoản</th><th>Xác thực</th><th>Đã chi tiêu</th><th>Vai trò</th><th>Thao tác</th></tr></thead><tbody>{list.data.map(user => <tr key={user._id}>
        <td><p className="admin-cell-title">{user.name}{user._id === actor?._id && <span className="admin-muted text-xs ml-2">(Bạn)</span>}</p><p className="admin-muted text-xs mt-1">{user.email}</p></td>
        <td><StatusBadge status={String(user.isVerified)}>{user.isVerified ? 'Đã xác thực' : 'Chưa xác thực'}</StatusBadge></td>
        <td>{money(user.totalSpent)}<p className="admin-muted text-xs mt-1">{user.totalOrders || 0} đơn đã giao · {user.tier || 'newbie'}</p></td>
        <td>{protectedUser(user) ? <span className="admin-badge">{ROLE_LABELS[user.role]}</span> : <select aria-label={'Vai trò của ' + user.name} disabled={busy} value={user.role} onChange={e => setAction({ type: 'role', user, role: e.target.value })}>{roles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>}</td>
        <td><button className="admin-button" aria-label={'Xóa tài khoản ' + user.name} disabled={busy || protectedUser(user)} title={protectedUser(user) ? 'Tài khoản được bảo vệ' : 'Xóa tài khoản'} onClick={() => setAction({ type: 'delete', user })}><Trash2 size={16} /></button></td>
      </tr>)}</tbody></table></div>}
      {!list.error && <Pagination page={list.currentPage} pages={list.totalPages} total={list.totalCount} onChange={page => setFilter('page', page)} loading={list.loading} />}
    </section>
    {creating && <AdminModal title="Tạo tài khoản" onClose={() => setCreating(false)} busy={busy}>
      <form className="space-y-4" onSubmit={save}>
        <p className="admin-muted text-sm">Tài khoản do quản trị tạo được xác thực ngay. Chỉ cấp quyền cần thiết cho người sử dụng.</p>
        {formError && <ErrorState message={formError} />}
        <Field label="Họ tên *"><input autoFocus required maxLength={100} autoComplete="name" value={form.name} onChange={e => setForm(previous => ({ ...previous, name: e.target.value }))} /></Field>
        <Field label="Email *"><input type="email" required autoComplete="email" value={form.email} onChange={e => setForm(previous => ({ ...previous, email: e.target.value }))} /></Field>
        <Field label="Mật khẩu *" hint="Tối thiểu 8 ký tự."><input type="password" required minLength={8} autoComplete="new-password" value={form.password} onChange={e => setForm(previous => ({ ...previous, password: e.target.value }))} /></Field>
        <Field label="Vai trò"><select value={form.role} onChange={e => setForm(previous => ({ ...previous, role: e.target.value }))}>{roles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
        <div className="flex justify-end gap-3 pt-4"><button type="button" className="admin-button" disabled={busy} onClick={() => setCreating(false)}>Hủy</button><button className="admin-button admin-button-primary" disabled={busy}>{busy ? 'Đang tạo…' : 'Tạo tài khoản'}</button></div>
      </form>
    </AdminModal>}
    {action && <ConfirmDialog title={action.type === 'delete' ? 'Xóa tài khoản?' : 'Thay đổi quyền truy cập?'} message={action.type === 'delete' ? 'Xóa tài khoản “' + action.user.name + '” (' + action.user.email + '). Thao tác này không thể hoàn tác.' : 'Chuyển “' + action.user.name + '” từ ' + ROLE_LABELS[action.user.role] + ' sang ' + ROLE_LABELS[action.role] + '.'} danger={action.type === 'delete'} label={action.type === 'delete' ? 'Xóa tài khoản' : 'Đổi vai trò'} busy={busy} onClose={() => setAction(null)} onConfirm={confirmAction} />}
  </div>;
}
