import { retryUploadCleanup } from '../services/uploadService.js';
import cron from 'node-cron';
import Order from '../models/oderModel.js';
import { transitionOrder, recordPayment } from '../services/orderService.js';
import { readPaymentLink, cancelPaymentLink, abortPaymentSetup } from '../services/paymentService.js';

export async function expireOrders() {
  const cutoff = new Date(Date.now() - 15 * 60 * 1000);
  // Unknown legacy reservations must be reviewed before touching provider links.
  // Filter before limit so legacy rows cannot starve new orders of maintenance.
  const orders = await Order.find({ stockReserved: { $in: [true, false] }, paymentMethod: 'VietQR', status: 'pending', paymentStatus: 'pending', createdAt: { $lte: cutoff } }).sort({ createdAt: 1 }).limit(100);
  for (const order of orders) {
    try {
      if (order.paymentLinkState === 'creating') {
        await abortPaymentSetup(order);
        continue;
      }
      // Reconcile with the provider before releasing stock if the webhook was delayed.
      const remote = await readPaymentLink(order.payosOrderCode);
      if (remote.status === 'PAID') {
        if (remote.amountPaid !== Math.round(order.totalPrice) || remote.amount !== Math.round(order.totalPrice)) {
          await Order.updateOne({ _id: order._id }, { $set: { paymentReview: 'amount_mismatch' } });
          continue;
        }
        const reference = remote.transactions?.[0]?.reference;
        if (!reference) continue;
        await recordPayment({ orderCode: order.payosOrderCode, amount: remote.amountPaid, currency: 'VND', reference });
        continue;
      }
      if (remote.amountPaid > 0) {
        await Order.updateOne({ _id: order._id }, { $set: { paymentReview: 'amount_mismatch' } });
        continue;
      }
      if (!['CANCELLED', 'EXPIRED'].includes(remote.status)) await cancelPaymentLink(order.payosOrderCode, 'Quá hạn thanh toán');
      await transitionOrder(order._id, 'cancelled', { kind: 'system' }, 'Quá hạn thanh toán');
    } catch (error) {
      // A provider outage must not release inventory for a potentially paid order.
      if (error.status !== 409) console.error('Order reconciliation:', String(order._id), error.message);
    }
  }
  const cancelled = await Order.find({ stockReserved: false, paymentMethod: 'VietQR', status: 'cancelled', paymentStatus: 'pending', linkCancelledAt: { $exists: false } }).sort({ createdAt: 1 }).limit(100);
  for (const order of cancelled) {
    try {
      const remote = await readPaymentLink(order.payosOrderCode);
      if (remote.status === 'PAID' && remote.transactions?.[0]?.reference) {
        await recordPayment({ orderCode: order.payosOrderCode, amount: remote.amountPaid, currency: 'VND', reference: remote.transactions[0].reference });
      } else if (!['CANCELLED', 'EXPIRED'].includes(remote.status)) {
        await cancelPaymentLink(order.payosOrderCode, 'Đơn đã hủy');
      }
      await Order.updateOne({ _id: order._id }, { $set: { linkCancelledAt: new Date() } });
    } catch (error) { console.error('Cancel payment link:', String(order._id), error.message); }
  }
}
export const startCronJobs = () => {
  // Explicit opt-in: starting a staging server must not cancel real payment links.
  if (process.env.ENABLE_MAINTENANCE_JOBS !== 'true') {
    console.info('Maintenance disabled. Set ENABLE_MAINTENANCE_JOBS=true after checking database and provider credentials.');
    return null;
  }
  return cron.schedule('*/5 * * * *', async () => { try { await expireOrders(); await retryUploadCleanup(); } catch (error) { console.error('Maintenance:', error.message); } }, { noOverlap: true });
};
