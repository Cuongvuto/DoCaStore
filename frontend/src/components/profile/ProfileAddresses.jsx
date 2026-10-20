import { useRef, useState } from 'react';
import { Check, MapPin, Pencil, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import axiosClient from '../../api/axiosClient';
import ShippingFields from '../purchase/ShippingFields';
import { PurchaseAlert, PurchaseCard, PurchaseLoading } from '../purchase/PurchaseUI';
import { addressText } from '../purchase/purchaseFormat';
import { ProfileEmpty, ProfileRefresh } from './ProfileUI';

function AddressEditor({ address, onClose, onSaved }) {
  const [form, setForm] = useState(() => ({ receiverName: address?.receiverName || '', phone: address?.phone || '', street: address?.street || '', city: address?.city || '', district: address?.district || '', ward: address?.ward || '', isDefault: Boolean(address?.isDefault) }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const save = async event => {
    event.preventDefault();
    if (lock.current) return;
    const payload = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value]));
    if (Object.entries(payload).some(([key, value]) => key !== 'isDefault' && !value)) { setError('Vui lòng điền đầy đủ thông tin người nhận và địa chỉ.'); return; }
    lock.current = true; setBusy(true); setError('');
    try {
      if (address?._id) await axiosClient.put('/address/' + address._id, payload);
      else await axiosClient.post('/address', payload);
      toast.success(address?._id ? 'Đã cập nhật địa chỉ.' : 'Đã thêm địa chỉ.');
      onSaved();
    } catch (failure) {
      setError(failure.response?.data?.message || 'Chưa thể lưu địa chỉ. Vui lòng thử lại.');
    } finally { lock.current = false; setBusy(false); }
  };
  return <PurchaseCard title={address?._id ? 'Chỉnh sửa địa chỉ' : 'Thêm địa chỉ mới'} icon={MapPin} action={<button type="button" className="profile-icon-button" aria-label="Đóng biểu mẫu địa chỉ" disabled={busy} onClick={onClose}><X size={18} /></button>}>
    <form className="purchase-form" onSubmit={save}><fieldset disabled={busy}>
      <ShippingFields value={form} onChange={setForm} initialManual={Boolean(address?._id)} description="Lưu địa chỉ để chọn nhanh ở lần thanh toán tiếp theo." />
      <label className="profile-checkbox"><input type="checkbox" checked={form.isDefault} disabled={Boolean(address?.isDefault)} onChange={event => setForm(previous => ({ ...previous, isDefault: event.target.checked }))} />Đặt làm địa chỉ mặc định</label>
      {error && <PurchaseAlert tone="error">{error}</PurchaseAlert>}
      <div className="purchase-actions"><button type="submit" className="cart-button cart-button-primary">{busy ? 'Đang lưu…' : 'Lưu địa chỉ'}<Check size={16} /></button><button type="button" className="cart-button cart-button-outline" onClick={onClose}>Hủy thay đổi</button></div>
    </fieldset></form>
  </PurchaseCard>;
}

export default function ProfileAddresses({ resource }) {
  const { data, error, loading, refresh } = resource;
  const addresses = data?.data || [];
  const [editor, setEditor] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const lock = useRef(false);
  const mutate = async (address, remove) => {
    if (lock.current) return;
    lock.current = true; setBusyId(address._id);
    try {
      if (remove) await axiosClient.delete('/address/' + address._id);
      else await axiosClient.put('/address/' + address._id, { isDefault: true });
      setConfirmId(null); refresh();
      toast.success(remove ? 'Đã xóa địa chỉ.' : 'Đã đổi địa chỉ mặc định.');
    } catch (failure) { toast.error(failure.response?.data?.message || 'Chưa thể cập nhật địa chỉ. Vui lòng thử lại.'); }
    finally { lock.current = false; setBusyId(null); }
  };
  return <div className="purchase-stack"><div className="profile-section-title"><div><h2>Sổ địa chỉ</h2><p>Lưu nơi nhận hàng để mỗi lần đặt hàng thuận tiện hơn.</p></div><ProfileRefresh busy={loading || Boolean(busyId) || Boolean(editor)} onClick={refresh} /></div>
    {editor && <AddressEditor key={editor._id || 'new'} address={editor} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); refresh(); }} />}
    {loading ? <PurchaseLoading /> : error ? <PurchaseAlert onRetry={refresh}>{error}</PurchaseAlert> : <>
      {!editor && <button type="button" className="profile-add-address" onClick={() => { setEditor({}); setConfirmId(null); }} disabled={Boolean(busyId)}><Plus size={19} />Thêm địa chỉ mới</button>}
      {!addresses.length ? !editor && <ProfileEmpty icon={MapPin} title="Chưa có địa chỉ đã lưu" description="Thêm địa chỉ đầu tiên để điền thông tin giao hàng nhanh hơn." /> : <div className="profile-address-grid">{addresses.map((address, index) => <article key={address._id} className={'profile-address-card' + (address.isDefault ? ' profile-address-default' : '')}>
        <div className="profile-address-top"><span><MapPin size={16} />Địa chỉ {String(index + 1).padStart(2, '0')}</span>{address.isDefault && <span className="purchase-badge"><Check size={12} /> Mặc định</span>}</div>
        <h3>{address.receiverName}</h3><p className="profile-address-phone">{address.phone}</p><p className="profile-address-text">{addressText(address)}</p>
        <div className="profile-address-actions"><button type="button" disabled={Boolean(busyId) || Boolean(editor)} onClick={() => { setEditor(address); setConfirmId(null); }}><Pencil size={14} />Sửa</button><button type="button" disabled={Boolean(busyId) || Boolean(editor)} onClick={() => setConfirmId(address._id)}><Trash2 size={14} />Xóa</button>{!address.isDefault && <button type="button" disabled={Boolean(busyId) || Boolean(editor)} onClick={() => mutate(address, false)}>{busyId === address._id ? 'Đang lưu…' : 'Đặt mặc định'}</button>}</div>
        {confirmId === address._id && <div className="profile-confirm" role="alert"><p>Xóa địa chỉ của {address.receiverName} khỏi sổ địa chỉ?</p><div><button type="button" disabled={Boolean(busyId)} onClick={() => setConfirmId(null)}>Giữ lại</button><button type="button" className="profile-danger" disabled={Boolean(busyId)} onClick={() => mutate(address, true)}>{busyId === address._id ? 'Đang xóa…' : 'Xác nhận xóa'}</button></div></div>}
      </article>)}</div>}
    </>}
  </div>;
}
