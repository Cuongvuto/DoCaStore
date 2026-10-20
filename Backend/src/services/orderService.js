import mongoose from 'mongoose';
import crypto from 'node:crypto';
import Order from '../models/oderModel.js';
import Product from '../models/productsModel.js';
import Cart from '../models/cartModel.js';
import Coupon from '../models/couponModel.js';
import User from '../models/userModel.js';
import { failure, assertTransition, assertCoupon, priceOrder } from './commercePolicy.js';

// All inventory/coupon/order mutations commit together. MongoDB must support transactions.
export const transaction = async work => {
  try { return await mongoose.connection.transaction(work); }
  catch (error) {
    if (error.code === 20 || error.codeName === 'IllegalOperation') throw failure(503, 'Database cần chạy MongoDB replica set để xử lý đơn hàng an toàn.');
    throw error;
  }
};
const history = (from, to, actor, reason) => ({ from, to, actorId: actor.id || undefined, actorRole: actor.role || actor.kind, reason, at: new Date() });
export async function calculatePrice(userId, items, couponCode, session = null) {
  const user = await User.findById(userId).session(session);
  if (!user) throw failure(404, 'Tài khoản không còn tồn tại.');
  const previous = await Order.exists({ userId, status: { $ne: 'cancelled' } }).session(session);
  let coupon = null;
  if (couponCode) {
    if (typeof couponCode !== 'string' || !/^[A-Za-z0-9_-]{1,40}$/.test(couponCode.trim())) throw failure(400, 'Mã giảm giá không hợp lệ.');
    coupon = await Coupon.findOne({ code: couponCode.trim().toUpperCase() }).session(session);
    assertCoupon(coupon, user);
  }
  return { pricing: priceOrder(items, !previous, coupon), coupon };
}

export async function placeOrder(userId, input, checkoutKey) {
  const method = input.paymentMethod || 'COD';
  if (!['COD', 'VietQR'].includes(method)) throw failure(400, 'Phương thức thanh toán chưa được hỗ trợ.');
  const address = {};
  for (const key of ['receiverName', 'phone', 'street', 'ward', 'district', 'city']) {
    const value = input.shippingAddress?.[key];
    if (typeof value !== 'string' || !value.trim() || value.length > 250) throw failure(400, 'Vui lòng điền đầy đủ địa chỉ giao hàng.');
    address[key] = value.trim();
  }
  if (input.note !== undefined && (typeof input.note !== 'string' || input.note.length > 1000)) throw failure(400, 'Ghi chú tối đa 1000 ký tự.');
  if (checkoutKey && !/^[a-zA-Z0-9-]{16,100}$/.test(checkoutKey)) throw failure(400, 'Mã yêu cầu không hợp lệ.');
  return transaction(async session => {
    if (checkoutKey) {
      const previous = await Order.findOne({ userId, checkoutKey }).session(session);
      if (previous) return { order: previous, pricing: previous.pricing, reused: true };
    }
    // Serialize checkout for each user, including the first-order promotion.
    const user = await User.findByIdAndUpdate(userId, { $inc: { checkoutVersion: 1 } }, { session });
    if (!user) throw failure(404, 'Tài khoản không còn tồn tại.');
    const cart = await Cart.findOne({ user_id: userId }).populate('items.product_id').session(session);
    if (!cart?.items.length) throw failure(400, 'Giỏ hàng đang trống.');
    if (cart.items.some(item => !item.product_id)) throw failure(409, 'Giỏ hàng có sản phẩm đã xóa. Vui lòng cập nhật giỏ hàng.');
    const items = cart.items.map(i => ({ productId: i.product_id._id, name: i.product_id.name, quantity: i.quantity, priceAtPurchase: i.product_id.price }));
    const { pricing, coupon } = await calculatePrice(userId, items.map(i => ({ price: i.priceAtPurchase, quantity: i.quantity })), input.couponCode, session);
    if (method === 'VietQR' && pricing.finalPrice < 2000) throw failure(400, 'VietQR yêu cầu tối thiểu 2.000đ. Vui lòng chọn COD.');
    for (const item of items) {
      const reserved = await Product.updateOne({ _id: item.productId, stock: { $gte: item.quantity } }, { $inc: { stock: -item.quantity } }, { session });
      if (reserved.modifiedCount !== 1) throw failure(409, `Sản phẩm ${item.name} không đủ tồn kho.`);
    }
    if (coupon) {
      const reserved = await Coupon.updateOne({ _id: coupon._id, isActive: true, expiryDate: { $gt: new Date() }, usedCount: { $lt: coupon.usageLimit }, 'usedBy.userId': { $ne: userId } }, { $inc: { usedCount: 1 }, $push: { usedBy: { userId, count: 1 } } }, { session });
      if (reserved.modifiedCount !== 1) throw failure(409, 'Mã giảm giá vừa hết lượt hoặc đã được sử dụng.');
    }
    const [order] = await Order.create([{
      userId, products: items, shippingAddress: address, note: input.note || '', paymentMethod: method,
      totalPrice: pricing.finalPrice, pricing, couponId: coupon?._id, couponCode: coupon?.code,
      checkoutKey, stockReserved: true, couponReserved: Boolean(coupon),
      ...(method === 'VietQR' ? { payosOrderCode: Date.now() * 1000 + crypto.randomInt(1000), paymentExpiresAt: new Date(Date.now() + 15 * 60 * 1000), paymentLinkState: 'creating' } : {}),
      statusHistory: [history(null, 'pending', { id: userId, kind: 'customer' }, 'Đặt hàng')]
    }], { session });
    cart.items = [];
    await cart.save({ session });
    return { order, pricing, reused: false };
  });
}

export async function transitionOrder(id, next, actor, reason = '', { restoreCart = false } = {}) {
  if (!mongoose.isValidObjectId(id)) throw failure(400, 'Mã đơn không hợp lệ.');
  if (typeof reason !== 'string' || reason.length > 500) throw failure(400, 'Lý do tối đa 500 ký tự.');
  if (next === 'cancelled' && !reason.trim()) throw failure(400, 'Vui lòng nhập lý do hủy đơn.');
  return transaction(async session => {
    const order = await Order.findById(id).session(session);
    if (!order) throw failure(404, 'Không tìm thấy đơn hàng.');
    if (!assertTransition(order, next, actor)) return { order, changed: false };
    if (typeof order.stockReserved !== 'boolean') throw failure(409, 'Đơn cũ chưa xác nhận tình trạng giữ kho. Cần đối chiếu tồn kho trước khi xử lý.');
    if (next !== 'cancelled' && !order.stockReserved) throw failure(409, 'Đơn chưa giữ kho, không thể tiếp tục giao hàng.');
    const from = order.status;
    if (next === 'cancelled') {
      if (order.couponCode && typeof order.couponReserved !== 'boolean') throw failure(409, 'Đơn cũ chưa xác nhận lượt dùng mã giảm giá. Cần đối chiếu trước khi hủy.');
      if (order.stockReserved) {
        for (const item of order.products) await Product.updateOne({ _id: item.productId }, { $inc: { stock: item.quantity } }, { session });
        order.stockReserved = false;
      }
      if (order.couponCode && order.couponReserved === true) {
        await Coupon.updateOne({ ...(order.couponId ? { _id: order.couponId } : { code: order.couponCode }), usedCount: { $gt: 0 }, 'usedBy.userId': order.userId }, { $inc: { usedCount: -1 }, $pull: { usedBy: { userId: order.userId } } }, { session });
        order.couponReserved = false;
      }
      if (order.paymentStatus === 'paid') order.paymentReview = 'refund_required';
      if (restoreCart) {
        let cart = await Cart.findOne({ user_id: order.userId }).session(session);
        if (!cart) cart = new Cart({ user_id: order.userId, items: [] });
        for (const item of order.products) {
          const existing = cart.items.find(i => String(i.product_id) === String(item.productId));
          if (existing) existing.quantity += item.quantity;
          else cart.items.push({ product_id: item.productId, quantity: item.quantity });
        }
        await cart.save({ session });
      }
    }
    if (next === 'completed') {
      order.completedAt = new Date();
      if (order.paymentMethod === 'COD') { order.paymentStatus = 'paid'; order.paidAt = new Date(); }
      for (const item of order.products) await Product.updateOne({ _id: item.productId }, { $inc: { sold: item.quantity } }, { session });
      const user = await User.findByIdAndUpdate(order.userId, { $inc: { totalSpent: order.totalPrice, totalOrders: 1 } }, { new: true, session });
      if (user) {
        const tier = user.totalSpent >= 20000000 || user.totalOrders >= 20 ? 'vip' : user.totalSpent >= 10000000 || user.totalOrders >= 10 ? 'gold' : user.totalSpent >= 5000000 || user.totalOrders >= 5 ? 'silver' : 'normal';
        const weights = ['newbie', 'normal', 'silver', 'gold', 'vip'];
        if (weights.indexOf(tier) > weights.indexOf(user.tier)) { user.tier = tier; await user.save({ session }); }
      }
    }
    order.status = next;
    order.statusHistory.push(history(from, next, actor, reason.trim()));
    await order.save({ session });
    return { order, changed: true };
  });
}

export async function recordPayment(data) {
  if (!Number.isSafeInteger(data.orderCode) || !Number.isSafeInteger(data.amount) || data.amount <= 0 || data.currency !== 'VND' || typeof data.reference !== 'string' || !data.reference.trim()) throw failure(400, 'Dữ liệu thanh toán không hợp lệ.');
  return transaction(async session => {
    const order = await Order.findOne({ payosOrderCode: data.orderCode }).session(session);
    if (!order) return { unknown: true }; // Includes the provider's signed webhook setup sample.
    if (order.paymentMethod !== 'VietQR') throw failure(409, 'Sai phương thức thanh toán.');
    if (order.paymentReference === data.reference || order.paymentEvents.some(event => event.reference === data.reference)) return { order, changed: false };
    // The deployed checkout sent Math.round(totalPrice) to PayOS, even when
    // legacy totals contained fractional VND. Match the amount actually requested.
    const expectedAmount = Math.round(order.totalPrice);
    if (order.paymentStatus === 'paid' || data.amount !== expectedAmount) {
      const duplicate = order.paymentEvents.some(event => event.reference === data.reference);
      if (!duplicate) order.paymentEvents.push({ reference: data.reference, amount: data.amount, at: new Date() });
      order.paymentReview = data.amount !== expectedAmount ? 'amount_mismatch' : 'duplicate_payment';
      await order.save({ session });
      return { order, changed: !duplicate, review: true };
    }
    order.paymentStatus = 'paid'; order.paidAt = new Date(); order.paymentReference = data.reference;
    order.paymentEvents.push({ reference: data.reference, amount: data.amount, at: new Date() });
    if (order.status === 'cancelled') order.paymentReview = 'refund_required';
    else if (order.stockReserved !== true) order.paymentReview = 'inventory_unconfirmed';
    else if (order.status === 'pending') {
      order.statusHistory.push(history('pending', 'processing', { kind: 'payment' }, 'PayOS xác nhận thanh toán'));
      order.status = 'processing';
    }
    await order.save({ session });
    return { order, changed: true, review: order.paymentReview !== 'none' };
  });
}
