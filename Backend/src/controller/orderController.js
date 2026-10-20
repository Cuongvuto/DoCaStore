import Order from '../models/oderModel.js';
import Cart from '../models/cartModel.js';
import mongoose from 'mongoose';
import { pagination, queryText, escapeRegex, enumFilter, dateRange } from '../utils/adminQuery.js';
import { pushNotification } from './notificationController.js';
import socketUtil from '../utils/socket.js';
import { placeOrder, transitionOrder, calculatePrice, recordPayment } from '../services/orderService.js';
import { ensurePaymentLink, abortPaymentSetup, cancelPaymentLink, verifyWebhook } from '../services/paymentService.js';
import { failure } from '../services/commercePolicy.js';

const respondError = (res, error) => {
  console.error('Order:', error.message);
  return res.status(error.status || 500).json({ success: false, message: error.status ? error.message : 'Không thể xử lý đơn hàng. Vui lòng thử lại.' });
};
const notify = order => pushNotification(order.userId, 'Cập nhật đơn #' + String(order._id).slice(-6).toUpperCase(), 'Trạng thái đơn hàng của bạn đã được cập nhật.', 'order', '/order-success/' + order._id);

export const createOrder = async (req, res) => {
  try {
    if (req.body.paymentMethod === 'VietQR' && (!process.env.PAYOS_CHECKSUM_KEY || !process.env.PAYOS_CLIENT_ID || !process.env.PAYOS_API_KEY)) throw failure(503, 'Cổng thanh toán chưa được cấu hình.');
    const result = await placeOrder(req.user.id || req.user._id, req.body, req.get('Idempotency-Key'));
    let order = result.order;
    if (result.reused && order.status === 'cancelled') throw failure(409, 'Yêu cầu cũ đã hủy. Vui lòng đặt lại đơn hàng.');
    if (result.reused && order.paymentMethod === 'VietQR' && order.paymentLinkState === 'creating' && !order.paymentLink?.qrCode) throw failure(425, 'Đơn đang tạo mã thanh toán. Vui lòng đợi rồi thử lại.');
    if (order.paymentMethod === 'VietQR' && order.status === 'pending') {
      try { order = await ensurePaymentLink(order); }
      catch (error) {
        order = await abortPaymentSetup(order);
        if (order.paymentStatus !== 'paid') throw error;
      }
    }
    if (!result.reused) await notify(order);
    return res.status(result.reused ? 200 : 201).json({ success: true, data: order, pricingDetails: result.pricing, payosCheckoutUrl: order.paymentLink?.checkoutUrl, payosData: order.paymentLink, qrCode: order.paymentLink?.qrCode });
  } catch (error) { return respondError(res, error); }
};

export const getUserOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const orders = await Order.find({ userId: userId }).populate('products.productId', 'name imageUrl price').sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: orders });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};


export const getAllOrders = async (req, res) => {
  try {
    const { page, limit, skip } = pagination(req.query);
    const status = enumFilter(req.query.status, ['pending', 'processing', 'shipped', 'completed', 'cancelled']);
    const paymentStatus = enumFilter(req.query.paymentStatus, ['pending', 'paid', 'failed']);
    const search = queryText(req.query.search);
    const paymentReview = enumFilter(req.query.paymentReview, ['none', 'refund_required', 'amount_mismatch', 'duplicate_payment', 'inventory_unconfirmed']);
    const dates = dateRange(req.query.from, req.query.to);
    const filter = {};
    if (paymentReview) filter.paymentReview = paymentReview;
    if (status) filter.status = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (Object.keys(dates).length) filter.createdAt = dates;
    if (search) {
      filter.$or = ['shippingAddress.receiverName', 'shippingAddress.phone'].map(field => ({ [field]: { $regex: escapeRegex(search), $options: 'i' } }));
      if (/^[a-f0-9]{24}$/i.test(search)) filter.$or.push({ _id: new mongoose.Types.ObjectId(search) });
      if (/^[a-f0-9]{6}$/i.test(search)) filter.$or.push({ $expr: { $eq: [{ $substrBytes: [{ $toString: '$_id' }, 18, 6] }, search.toLowerCase()] } });
      if (/^\d+$/.test(search) && Number.isSafeInteger(Number(search))) filter.$or.push({ payosOrderCode: Number(search) });
    }
    const [orders, totalCount] = await Promise.all([
      Order.find(filter).populate('userId', 'name email').populate('products.productId', 'name imageUrl').sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).lean(),
      Order.countDocuments(filter)
    ]);
    return res.json({ success: true, data: orders, totalCount, count: orders.length, currentPage: page, totalPages: Math.max(1, Math.ceil(totalCount / limit)) });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.status ? error.message : 'Không thể tải danh sách đơn hàng.' });
  }
};


export const updateOrderStatus = async (req, res) => {
  try {
    const result = await transitionOrder(req.params.id, req.body.status, { id: req.user.id || req.user._id, role: req.user.role, kind: 'admin' }, req.body.reason || '');
    if (result.changed) {
      await notify(result.order);
      if (result.order.status === 'cancelled' && result.order.payosOrderCode) {
        try { await cancelPaymentLink(result.order.payosOrderCode, req.body.reason); } catch { /* Reconciled by cron. */ }
      }
    }
    return res.json({ success: true, data: result.order });
  } catch (error) { return respondError(res, error); }
};

export const calculateCheckoutPrice = async (userId, items, code) => (await calculatePrice(userId, items, code)).pricing;

export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id; 
    const order = await Order.findById(id).populate({ path: 'products.productId', select: 'name imageUrl price' }).populate('userId', 'name email'); 

    if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng!' });

    const isAdmin = ['superadmin', 'admin', 'order_admin'].includes(req.user.role);
    const isOwner = order.userId?._id?.toString() === String(userId);

    if (!isAdmin && !isOwner) return res.status(403).json({ success: false, message: 'Không có quyền truy cập!' });
    return res.status(200).json({ success: true, data: order });
  } catch (error) {
    if (error.kind === 'ObjectId') return res.status(400).json({ success: false, message: 'Mã đơn hàng không hợp lệ!' });
    return res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};


export const previewCheckoutPrice = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const cart = await Cart.findOne({ user_id: userId }).populate('items.product_id');
    if (!cart?.items.length || cart.items.some(item => !item.product_id)) throw failure(400, 'Giỏ hàng trống hoặc có sản phẩm không còn tồn tại.');
    const data = await calculateCheckoutPrice(userId, cart.items.map(i => ({ price: i.product_id.price, quantity: i.quantity })), req.body.couponCode);
    return res.json({ success: true, data });
  } catch (error) { return respondError(res, error); }
};

export const payosWebhook = async (req, res) => {
  try {
    const data = verifyWebhook(req.body, process.env.PAYOS_CHECKSUM_KEY);
    // The transaction result code is part of the signed data; outer flags alone are untrusted.
    if (data.code !== '00') return res.json({ error: 0, message: 'Ignored', data: null });
    const result = await recordPayment(data);
    if (result.changed) {
      await notify(result.order);
      try {
        socketUtil.getIo().to('room_user_' + result.order.userId).emit(result.review ? 'payment_review' : 'payment_success', { orderId: String(result.order._id), status: result.order.paymentStatus });
      } catch { /* The persisted payment is authoritative when sockets are unavailable. */ }
    }
    return res.json({ error: 0, message: 'Ok', data: null });
  } catch (error) {
    console.error('Payment webhook:', error.message);
    return res.status(error.status || 500).json({ error: -1, message: error.status ? error.message : 'Internal error', data: null });
  }
};

export const cancelOrder = async (req, res) => {
  try {
    const result = await transitionOrder(req.params.id, 'cancelled', { id: req.user.id || req.user._id, kind: 'customer' }, req.body?.reason || 'Khách hàng yêu cầu hủy');
    if (result.changed) {
      await notify(result.order);
      if (result.order.payosOrderCode) {
        try { await cancelPaymentLink(result.order.payosOrderCode, 'Khách hàng hủy'); } catch { /* Reconciled by cron. */ }
      }
    }
    return res.json({ success: true, data: result.order, message: 'Đã hủy đơn hàng.' });
  } catch (error) { return respondError(res, error); }
};
