import crypto from 'node:crypto';
import Order from '../models/oderModel.js';
import { failure } from './commercePolicy.js';
import { transitionOrder } from './orderService.js';

export function signatureFor(data, key) {
  const text = Object.keys(data).sort().map(k => `${k}=${data[k] == null ? '' : typeof data[k] === 'object' ? JSON.stringify(data[k]) : String(data[k])}`).join('&');
  return crypto.createHmac('sha256', key).update(text).digest('hex');
}
export function verifyWebhook(body, key) {
  if (!key) throw failure(503, 'Cổng thanh toán chưa được cấu hình.');
  if (!body?.data || typeof body.data !== 'object' || Array.isArray(body.data) || !/^[a-f\d]{64}$/i.test(body.signature || '')) throw failure(400, 'Webhook không hợp lệ.');
  if (!crypto.timingSafeEqual(Buffer.from(signatureFor(body.data, key), 'hex'), Buffer.from(body.signature, 'hex'))) throw failure(401, 'Chữ ký không hợp lệ.');
  return body.data;
}
async function request(path = '', options = {}) {
  const response = await fetch(`https://api-merchant.payos.vn/v2/payment-requests${path}`, {
    ...options, signal: AbortSignal.timeout(12000),
    headers: { 'Content-Type': 'application/json', 'x-client-id': process.env.PAYOS_CLIENT_ID, 'x-api-key': process.env.PAYOS_API_KEY }
  });
  const result = await response.json();
  if (!response.ok || result.code !== '00') throw failure(502, 'Không thể kết nối cổng thanh toán. Vui lòng thử lại.');
  return result.data;
}
export const readPaymentLink = code => request('/' + code);
export const cancelPaymentLink = (code, reason) => request(`/${code}/cancel`, { method: 'POST', body: JSON.stringify({ cancellationReason: reason }) });

export async function ensurePaymentLink(order) {
  if (order.paymentMethod !== 'VietQR' || order.paymentLink?.qrCode || order.status !== 'pending') return order;
  if (!process.env.PAYOS_CHECKSUM_KEY || !process.env.PAYOS_CLIENT_ID || !process.env.PAYOS_API_KEY) throw failure(503, 'Cổng thanh toán chưa được cấu hình.');
  const client = (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim();
  const data = { orderCode: order.payosOrderCode, amount: order.totalPrice, description: 'DH ' + String(order._id).slice(-6), returnUrl: `${client}/order-success/${order._id}`, cancelUrl: `${client}/payment/${order._id}` };
  data.signature = signatureFor(data, process.env.PAYOS_CHECKSUM_KEY);
  data.expiredAt = Math.floor(new Date(order.paymentExpiresAt || Date.now() + 900000).getTime() / 1000);
  const link = await request('', { method: 'POST', body: JSON.stringify(data) });
  if (Number(link.orderCode) !== order.payosOrderCode || Number(link.amount) !== order.totalPrice || !link.qrCode) throw failure(502, 'Thông tin mã thanh toán không khớp đơn hàng.');
  return await Order.findByIdAndUpdate(order._id, { $set: { paymentLink: { checkoutUrl: link.checkoutUrl, qrCode: link.qrCode, amount: link.amount, orderCode: link.orderCode }, paymentLinkState: 'ready' } }, { new: true });
}

// Failed or timed-out creation may already have reached PayOS. Cancel locally first;
// a late verified payment will be retained for reconciliation, never revive the order.
export async function abortPaymentSetup(order) {
  try {
    const result = await transitionOrder(order._id, 'cancelled', { kind: 'system' }, 'Không tạo được mã thanh toán', { restoreCart: true });
    await Order.updateOne({ _id: order._id }, { $set: { paymentLinkState: 'failed' } });
    try { await cancelPaymentLink(order.payosOrderCode, 'Không tạo được mã thanh toán'); } catch { /* Cron retries cancellation for cancelled links. */ }
    return result.order;
  } catch (error) {
    if (error.status === 409) return Order.findById(order._id); // Payment won the transaction race.
    throw error;
  }
}
