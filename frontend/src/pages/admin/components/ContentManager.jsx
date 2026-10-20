import { useEffect, useRef, useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import axiosClient from '../../../api/axiosClient';
import useAdminList, { useAdminFilters } from '../hooks/useAdminList';
import { PageHeading, SearchField, Field, EmptyState, ErrorState, LoadingState, Pagination, AdminModal, ConfirmDialog, StatusBadge } from './AdminUI';
import { dateTime } from '../adminConfig';

const configs = {
  banner: { title: 'Banner', endpoint: '/banners', description: 'Quản lý ảnh, vị trí hiển thị và liên kết chiến dịch.', initial: { title: '', linkUrl: '', position: 'home_main', sortOrder: 0, isActive: true } },
  coupon: { title: 'Mã giảm giá', endpoint: '/coupons', description: 'Giới hạn lượt sử dụng, thời hạn và nhóm khách hàng.', initial: { code: '', discountPercent: 10, usageLimit: 100, expiryDate: '', targetAudience: 'all', groupType: 'vip' } },
  notification: { title: 'Thông báo', endpoint: '/notifications/admin', description: 'Gửi thông tin tới toàn bộ khách hàng, một nhóm hoặc một tài khoản.', initial: { title: '', message: '', type: 'promotion', linkUrl: '', targetAudience: 'all', groupType: 'vip', userId: '' } }
};
const groupLabels = { premium: 'Hội viên Premium', newbie: 'Khách mới', normal: 'Thân thiết', silver: 'Bạc', gold: 'Vàng', vip: 'VIP', inactive: 'Chưa mua hàng (khách mới)' };

function Editor({ kind, item, onClose, onSaved }) {
  const config = configs[kind];
  const [form, setForm] = useState(() => ({ ...config.initial, ...item }));
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(item?.imageUrl || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmSend, setConfirmSend] = useState(false);
  const pending = useRef(false);
  const requestKey = useRef(crypto.randomUUID());
  useEffect(() => {
    if (!image) {
      setPreview(item?.imageUrl || '');
      return;
    }
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image, item?.imageUrl]);
  const set = key => event => setForm(previous => ({ ...previous, [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }));
  const save = async () => {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError('');
    try {
      let body = form;
      if (kind === 'banner') {
        body = new FormData();
        Object.keys(config.initial).forEach(key => body.append(key, form[key]));
        if (image) body.append('image', image);
      }
      if (item?._id) await axiosClient.put(config.endpoint + '/' + item._id, body);
      else await axiosClient.post(config.endpoint, body, kind === 'notification' ? { headers: { 'Idempotency-Key': requestKey.current } } : undefined);
      toast.success(kind === 'notification' ? 'Đã gửi thông báo.' : 'Đã lưu dữ liệu.');
      onSaved();
    } catch (error) { setError(error.response?.data?.message || 'Không thể lưu. Vui lòng thử lại.'); setConfirmSend(false); }
    finally { pending.current = false; setBusy(false); }
  };
  return <AdminModal title={(item ? 'Sửa ' : 'Tạo ') + config.title.toLowerCase()} busy={busy} onClose={onClose}>
    <form onSubmit={event => { event.preventDefault(); if (kind === 'notification') setConfirmSend(true); else void save(); }} className="space-y-4">
      {error && <ErrorState message={error} />}
      <fieldset disabled={busy} className="space-y-4">
        {kind === 'coupon' ? <>
          <Field label="Mã giảm giá"><input required maxLength={40} pattern="[A-Za-z0-9_-]+" value={form.code} onChange={set('code')} /></Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><Field label="Phần trăm giảm"><input required type="number" min="1" max="100" step="1" value={form.discountPercent} onChange={set('discountPercent')} /></Field><Field label="Tổng lượt sử dụng"><input required type="number" min="1" max="1000000" step="1" value={form.usageLimit} onChange={set('usageLimit')} /></Field></div>
          <Field label="Ngày hết hạn" hint="Có hiệu lực đến hết ngày đã chọn, theo giờ Việt Nam."><input required type="date" value={form.expiryDate} onChange={set('expiryDate')} /></Field>
        </> : <Field label="Tiêu đề"><input required maxLength={150} value={form.title} onChange={set('title')} /></Field>}
        {kind === 'notification' && <>
          <Field label="Nội dung"><textarea required rows={4} maxLength={2000} value={form.message} onChange={set('message')} /></Field>
          <Field label="Loại thông báo"><select value={form.type} onChange={set('type')}><option value="promotion">Khuyến mãi</option><option value="system">Hệ thống</option><option value="order">Đơn hàng</option></select></Field>
        </>}
        {kind !== 'coupon' && <Field label="Liên kết" hint="Đường dẫn nội bộ /products hoặc URL bắt đầu bằng https://"><input maxLength={1000} value={form.linkUrl} onChange={set('linkUrl')} /></Field>}
        {kind === 'banner' ? <>
          <Field label="Ảnh banner" hint="JPG, PNG, WebP; tối đa 5 MB."><input type="file" accept="image/jpeg,image/png,image/webp" required={!item} onChange={event => { const file = event.target.files[0]; if (!file) { setImage(null); return; } if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { event.target.value = ''; setImage(null); setError('Ảnh phải là JPG, PNG hoặc WebP và không quá 5 MB.'); return; } setError(''); setImage(file); }} /></Field>
          {preview && <img src={preview} alt="Xem trước banner" className="w-full max-h-48 object-contain rounded-lg" />}
          <Field label="Vị trí"><select value={form.position} onChange={set('position')}><option value="home_main">Trang chủ — chính</option><option value="home_sidebar">Trang chủ — bên cạnh</option><option value="category_top">Đầu danh mục</option></select></Field>
          <Field label="Thứ tự"><input required type="number" min="0" max="10000" step="1" value={form.sortOrder} onChange={set('sortOrder')} /></Field>
          <label className="flex gap-2 items-center"><input type="checkbox" checked={form.isActive} onChange={set('isActive')} />Hiển thị banner</label>
        </> : <>
          <Field label="Đối tượng nhận"><select value={form.targetAudience} onChange={set('targetAudience')}><option value="all">Tất cả khách hàng</option><option value="group">Nhóm khách hàng</option>{kind === 'notification' && <option value="specific">Một tài khoản</option>}</select></Field>
          {form.targetAudience === 'group' && <Field label="Nhóm"><select value={form.groupType} onChange={set('groupType')}>{Object.entries(groupLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field>}
          {form.targetAudience === 'specific' && <Field label="ID tài khoản"><input required pattern="[a-fA-F0-9]{24}" value={form.userId} onChange={set('userId')} /></Field>}
        </>}
      </fieldset>
      <div className="flex justify-end gap-3"><button type="button" className="admin-button" disabled={busy} onClick={onClose}>Quay lại</button><button type="submit" className="admin-button admin-button-primary" disabled={busy}>{busy ? 'Đang lưu…' : kind === 'notification' ? 'Kiểm tra và gửi' : 'Lưu'}</button></div>
    </form>
    {confirmSend && <ConfirmDialog title="Gửi thông báo?" message={'Thông báo “' + form.title + '” sẽ được gửi tới ' + (form.targetAudience === 'all' ? 'toàn bộ khách hàng' : form.targetAudience === 'group' ? 'nhóm ' + groupLabels[form.groupType] : 'tài khoản ' + form.userId) + '.'} busy={busy} onClose={() => setConfirmSend(false)} onConfirm={save} />}
  </AdminModal>;
}

export default function ContentManager({ kind }) {
  const config = configs[kind];
  const { filters, setFilter } = useAdminFilters();
  const list = useAdminList(config.endpoint, filters);
  const [editor, setEditor] = useState(null);
  const [action, setAction] = useState(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const mutate = async () => {
    if (pending.current) return;
    pending.current = true; setBusy(true);
    try {
      if (kind === 'coupon') await axiosClient.put(config.endpoint + '/' + action._id + '/toggle', { isActive: !action.isActive });
      else await axiosClient.delete(config.endpoint + '/' + action._id);
      toast.success('Đã cập nhật.'); setAction(null);
      if (kind !== 'coupon' && list.data.length === 1 && list.currentPage > 1) setFilter('page', list.currentPage - 1); else list.reload();
    } catch (error) { toast.error(error.response?.data?.message || 'Thao tác thất bại.'); }
    finally { pending.current = false; setBusy(false); }
  };
  return <div>
    <PageHeading title={config.title} description={config.description}><button className="admin-button" onClick={list.reload} disabled={list.loading}><RefreshCw size={16} />Làm mới</button><button className="admin-button admin-button-primary" onClick={() => setEditor({})}><Plus size={16} />Tạo mới</button></PageHeading>
    <div className="admin-toolbar"><SearchField value={filters.search || ''} onChange={value => setFilter('search', value)} placeholder={kind === 'coupon' ? 'Tìm mã giảm giá…' : 'Tìm tiêu đề…'} />{kind !== 'notification' && <Field label="Trạng thái"><select value={filters.active || ''} onChange={event => setFilter('active', event.target.value)}><option value="">Tất cả</option><option value="true">Đang bật</option><option value="false">Đang tắt</option></select></Field>}</div>
    <section className="admin-panel">
      {list.error ? <ErrorState message={list.error} onRetry={list.reload} /> : list.loading ? <LoadingState /> : !list.data.length ? <EmptyState title="Không có dữ liệu phù hợp" /> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>{kind === 'coupon' ? 'Mã giảm giá' : 'Nội dung'}</th><th>Thông tin</th><th>{kind === 'notification' ? 'Người nhận' : 'Trạng thái'}</th><th>Thao tác</th></tr></thead><tbody>{list.data.map(item => <tr key={item._id}>
        <td className="admin-cell-title">{kind === 'banner' && <img src={item.imageUrl} alt="" className="w-32 h-16 object-cover rounded mb-2" />}{item.code || item.title}<p className="admin-muted text-xs mt-1 break-words max-w-sm">{kind === 'notification' ? item.message : item.linkUrl}</p></td>
        <td>{kind === 'coupon' ? <><strong>{item.discountPercent}%</strong><p>{item.usedCount}/{item.usageLimit} lượt</p><p className="admin-muted text-xs">Hết hạn: {dateTime(item.expiryDate)}</p></> : kind === 'banner' ? <><p>{({ home_main: 'Trang chủ — chính', home_sidebar: 'Trang chủ — bên cạnh', category_top: 'Đầu danh mục' })[item.position]}</p><p className="admin-muted">Thứ tự: {item.sortOrder}</p></> : dateTime(item.createdAt)}</td>
        <td>{kind === 'notification' ? item.targetAudience === 'group' ? groupLabels[item.groupType] : item.userId ? String(item.userId) : 'Tất cả khách hàng' : <StatusBadge status={item.isActive ? 'active' : 'cancelled'}>{kind === 'coupon' && new Date(item.expiryDate) < new Date() ? 'Hết hạn' : item.isActive ? 'Đang bật' : 'Đang tắt'}</StatusBadge>}</td>
        <td><div className="flex gap-2">{kind === 'banner' && <button className="admin-button" onClick={() => setEditor(item)}>Sửa</button>}<button className={'admin-button ' + (kind === 'coupon' ? '' : 'admin-button-danger')} disabled={busy} onClick={() => setAction(item)}>{kind === 'coupon' ? item.isActive ? 'Khóa' : 'Kích hoạt' : 'Xóa'}</button></div></td>
      </tr>)}</tbody></table></div>}
      {!list.error && <Pagination page={list.currentPage} pages={list.totalPages} total={list.totalCount} loading={list.loading} onChange={page => setFilter('page', page)} />}
    </section>
    {editor && <Editor kind={kind} item={editor._id ? editor : null} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); list.reload(); }} />}
    {action && <ConfirmDialog title={kind === 'coupon' ? 'Đổi trạng thái mã?' : 'Xóa nội dung?'} message={kind === 'coupon' ? 'Trạng thái mới sẽ áp dụng cho các lượt dùng tiếp theo.' : 'Nội dung này sẽ được xóa khỏi hệ thống.'} danger={kind !== 'coupon'} busy={busy} onClose={() => setAction(null)} onConfirm={mutate} />}
  </div>;
}
