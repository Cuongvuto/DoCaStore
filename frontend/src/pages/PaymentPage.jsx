import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  LoaderCircle,
  QrCode,
  ShieldCheck,
  WalletCards
} from 'lucide-react';
import { toast } from 'sonner';
import axiosClient from '../api/axiosClient';
import { useNotification } from '../context/NotificationContext';

const formatCurrency = (value) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value) || 0);

const PaymentPage = () => {
  const { orderId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { socket } = useNotification();
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [isCancelling, setIsCancelling] = useState(false);
  const [copiedValue, setCopiedValue] = useState('');

  const { qrCode, amount, orderCode } = state || {};

  useEffect(() => {
    if (!qrCode) {
      navigate('/', { replace: true });
      return undefined;
    }
    if (!socket) return undefined;

    const handlePaymentSuccess = (data) => {
      if (String(data.orderId) === String(orderId) || String(data.orderCode) === String(orderCode)) {
        setPaymentStatus('success');
        toast.success('Thanh toán thành công!');
        window.setTimeout(() => navigate(`/order-success/${orderId}`, { replace: true }), 1800);
      }
    };

    socket.on('payment_success', handlePaymentSuccess);
    return () => socket.off('payment_success', handlePaymentSuccess);
  }, [navigate, orderCode, orderId, qrCode, socket]);

  const copyValue = async (value, label) => {
    try {
      await navigator.clipboard.writeText(String(value));
      setCopiedValue(label);
      toast.success(`Đã sao chép ${label.toLowerCase()}`);
      window.setTimeout(() => setCopiedValue(''), 1600);
    } catch {
      toast.error('Không thể sao chép. Vui lòng thử lại.');
    }
  };

  const cancelPayment = async () => {
    if (paymentStatus === 'success') return;
    if (!window.confirm('Đơn hàng chưa được thanh toán. Bạn có chắc muốn hủy giao dịch?')) return;

    setIsCancelling(true);
    try {
      await axiosClient.put(`/orders/${orderId}/cancel`);
      toast.info('Đơn hàng đã được hủy.');
      navigate('/', { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể hủy đơn hàng lúc này.');
    } finally {
      setIsCancelling(false);
    }
  };

  if (!qrCode) return null;

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-950 via-[#315744] to-[#eef5f1] px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <button
          type="button"
          onClick={cancelPayment}
          disabled={isCancelling || paymentStatus === 'success'}
          className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-bold text-white/90 transition hover:bg-white/10 disabled:opacity-50"
        >
          <ArrowLeft size={18} />
          {isCancelling ? 'Đang hủy đơn...' : 'Hủy giao dịch và quay lại'}
        </button>

        <section className="overflow-hidden rounded-3xl border border-white/30 bg-white shadow-2xl shadow-emerald-950/20">
          <header className="flex flex-col gap-4 bg-[#3d6b56] px-6 py-6 text-white sm:flex-row sm:items-center sm:justify-between sm:px-9">
            <div className="flex items-center gap-4">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15">
                <WalletCards size={26} aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-100">Thanh toán an toàn</p>
                <h1 className="mt-1 text-2xl font-black">Quét mã để hoàn tất đơn hàng</h1>
              </div>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-bold">
              <ShieldCheck size={18} />
              Bảo mật giao dịch
            </span>
          </header>

          <div className="grid lg:grid-cols-[1fr_0.9fr]">
            <div className="flex flex-col items-center justify-center border-b border-slate-200 bg-[#f7faf8] p-6 sm:p-10 lg:border-b-0 lg:border-r">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-sm font-bold text-emerald-900">
                <QrCode size={18} />
                Mở ứng dụng ngân hàng và quét mã
              </div>
              <div className="rounded-3xl border border-emerald-200 bg-white p-4 shadow-xl shadow-emerald-900/10">
                <QRCodeCanvas
                  value={qrCode}
                  size={260}
                  level="H"
                  includeMargin
                  className="h-auto w-full max-w-[260px]"
                  aria-label="Mã QR thanh toán"
                />
              </div>
              <p className="mt-5 max-w-sm text-center text-sm leading-6 text-slate-600">
                Nội dung và số tiền đã được điền sẵn. Vui lòng không thay đổi thông tin khi chuyển khoản.
              </p>
            </div>

            <div className="flex flex-col p-6 sm:p-10">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#3d6b56]">Thông tin giao dịch</p>
              <div className="mt-5 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-slate-50 px-5">
                <PaymentRow
                  label="Mã đơn hàng"
                  value={orderCode || orderId}
                  copied={copiedValue === 'Mã đơn hàng'}
                  onCopy={() => copyValue(orderCode || orderId, 'Mã đơn hàng')}
                />
                <PaymentRow
                  label="Số tiền"
                  value={formatCurrency(amount)}
                  copied={copiedValue === 'Số tiền'}
                  onCopy={() => copyValue(amount, 'Số tiền')}
                  emphasized
                />
              </div>

              <div
                className={`mt-6 flex min-h-16 items-center justify-center gap-3 rounded-2xl px-5 text-center font-bold ${
                  paymentStatus === 'success'
                    ? 'bg-emerald-100 text-emerald-900'
                    : 'bg-amber-50 text-amber-900'
                }`}
                role="status"
                aria-live="polite"
              >
                {paymentStatus === 'success' ? (
                  <>
                    <CheckCircle2 size={24} />
                    Thanh toán thành công, đang chuyển hướng...
                  </>
                ) : (
                  <>
                    <LoaderCircle className="animate-spin" size={23} />
                    Hệ thống đang chờ xác nhận thanh toán
                  </>
                )}
              </div>

              <div className="mt-auto pt-8 text-sm leading-6 text-slate-500">
                <p className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 shrink-0 text-[#3d6b56]" size={18} />
                  Đơn hàng chỉ được xác nhận sau khi hệ thống nhận thông báo thành công từ cổng thanh toán.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

const PaymentRow = ({ label, value, onCopy, copied, emphasized = false }) => (
  <div className="flex items-center justify-between gap-4 py-5">
    <div className="min-w-0">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-1 break-all font-black ${emphasized ? 'text-2xl text-red-600' : 'text-base text-slate-900'}`}>
        {value}
      </p>
    </div>
    <button
      type="button"
      onClick={onCopy}
      aria-label={`Sao chép ${label.toLowerCase()}`}
      className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-[#3d6b56] transition hover:border-[#3d6b56] hover:bg-emerald-50"
    >
      {copied ? <Check size={18} /> : <Copy size={18} />}
    </button>
  </div>
);

export default PaymentPage;
