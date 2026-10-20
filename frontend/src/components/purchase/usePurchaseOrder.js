import { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import { useNotification } from '../../context/NotificationContext';

export default function usePurchaseOrder(orderId) {
  const { socket } = useNotification();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let inFlight = false;
    let poll = true;
    const load = async () => {
      if (inFlight || controller.signal.aborted) return;
      inFlight = true;
      setRefreshing(true);
      try {
        const response = await axiosClient.get('/orders/' + orderId, { signal: controller.signal });
        if (controller.signal.aborted) return;
        const current = response.data?.data;
        if (!current?._id) throw new Error('Missing order');
        setOrder(current); setError('');
        poll = current.paymentMethod === 'VietQR' && current.paymentStatus !== 'paid' && current.status !== 'cancelled';
      } catch (failure) {
        if (!controller.signal.aborted) setError(failure.response?.data?.message || 'Không thể cập nhật đơn hàng. Vui lòng thử lại.');
      } finally {
        inFlight = false;
        if (!controller.signal.aborted) { setLoading(false); setRefreshing(false); }
      }
    };
    const onPayment = data => { if (String(data.orderId) === String(orderId)) void load(); };
    void load();
    const timer = setInterval(() => { if (poll) void load(); }, 10000);
    socket?.on('payment_success', onPayment);
    socket?.on('payment_review', onPayment);
    return () => { controller.abort(); clearInterval(timer); socket?.off('payment_success', onPayment); socket?.off('payment_review', onPayment); };
  }, [orderId, version, socket]);
  return { order, error, loading, refreshing, refresh: () => setVersion(value => value + 1) };
}
