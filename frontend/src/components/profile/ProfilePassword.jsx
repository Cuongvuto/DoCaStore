import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { toast } from 'sonner';
import axiosClient from '../../api/axiosClient';
import { useAuth } from '../../context/AuthContext';
import { PurchaseAlert, PurchaseCard } from '../purchase/PurchaseUI';

const fields = [
  { name: 'currentPassword', label: 'Mật khẩu hiện tại', autoComplete: 'current-password' },
  { name: 'newPassword', label: 'Mật khẩu mới', autoComplete: 'new-password' },
  { name: 'confirmPassword', label: 'Xác nhận mật khẩu mới', autoComplete: 'new-password' },
];

export default function ProfilePassword() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [visible, setVisible] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);

  const submit = async event => {
    event.preventDefault();
    if (lock.current) return;
    if (!form.currentPassword || form.newPassword.length < 8) { setError('Nhập mật khẩu hiện tại và mật khẩu mới từ 8 ký tự.'); return; }
    if (new TextEncoder().encode(form.newPassword).length > 72) { setError('Mật khẩu mới quá dài. Vui lòng rút ngắn mật khẩu.'); return; }
    if (form.newPassword !== form.confirmPassword) { setError('Xác nhận mật khẩu mới chưa khớp.'); return; }
    if (form.newPassword === form.currentPassword) { setError('Mật khẩu mới phải khác mật khẩu hiện tại.'); return; }
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      await axiosClient.put('/user/change-password', form);
      logout();
      toast.success('Đổi mật khẩu thành công. Vui lòng đăng nhập lại bằng mật khẩu mới.');
      navigate('/login', { replace: true });
    } catch (failure) {
      setError(failure.response?.data?.message || 'Chưa thể đổi mật khẩu. Vui lòng kiểm tra kết nối và thử lại.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  return <div className="purchase-stack">
    <div className="profile-section-title"><div><h2>Đổi mật khẩu</h2><p>Cập nhật mật khẩu để bảo vệ tài khoản của bạn.</p></div></div>
    <PurchaseCard title="Bảo mật tài khoản" icon={LockKeyhole}>
      <form className="profile-password-form" onSubmit={submit} aria-busy={busy}>
        <p className="profile-password-note" id="password-guidance">Mật khẩu mới cần ít nhất 8 ký tự. Sau khi đổi thành công, bạn sẽ đăng xuất khỏi các phiên hiện tại và cần đăng nhập lại.</p>
        <input className="sr-only" tabIndex={-1} aria-label="Email tài khoản" name="username" autoComplete="username" value={user.email || ''} readOnly />
        <fieldset disabled={busy}>
          <legend className="sr-only">Thông tin đổi mật khẩu</legend>
          {fields.map(field => <div className="profile-password-field" key={field.name}>
            <label htmlFor={`profile-${field.name}`}>{field.label}</label>
            <div className="profile-password-input">
              <input id={`profile-${field.name}`} name={field.name} type={visible[field.name] ? 'text' : 'password'}
                autoComplete={field.autoComplete} required minLength={field.name === 'currentPassword' ? undefined : 8}
                maxLength={field.name === 'currentPassword' ? 1024 : 72} aria-describedby="password-guidance"
                value={form[field.name]} onChange={event => setForm(previous => ({ ...previous, [field.name]: event.target.value }))} />
              <button type="button" aria-label={`${visible[field.name] ? 'Ẩn' : 'Hiện'} ${field.label.toLowerCase()}`}
                aria-pressed={Boolean(visible[field.name])} onClick={() => setVisible(previous => ({ ...previous, [field.name]: !previous[field.name] }))}>
                {visible[field.name] ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              </button>
            </div>
          </div>)}
          {error && <PurchaseAlert>{error}</PurchaseAlert>}
          <div className="profile-password-actions">
            <button type="submit" className="cart-button cart-button-primary">{busy ? 'Đang cập nhật…' : 'Lưu mật khẩu mới'}</button>
            <Link className="purchase-text-button" to="/profile">Hủy</Link>
          </div>
        </fieldset>
        <p className="profile-password-help">Quên mật khẩu hiện tại hoặc đăng nhập bằng Google và chưa đặt mật khẩu? <Link to="/auth?view=forgot">Đặt lại mật khẩu qua email</Link>.</p>
      </form>
    </PurchaseCard>
  </div>;
}
