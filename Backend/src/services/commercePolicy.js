export const failure = (status, message) => Object.assign(new Error(message), { status });
export const transitions = Object.freeze({ pending: ['processing', 'cancelled'], processing: ['shipped', 'cancelled'], shipped: ['completed'], completed: [], cancelled: [] });

export function assertTransition(order, next, actor) {
  if (actor.kind === 'customer' && String(order.userId) !== String(actor.id)) throw failure(403, 'Bạn không sở hữu đơn hàng này.');
  if (order.status === next) return false;
  if (!transitions[order.status]?.includes(next)) throw failure(409, 'Không thể chuyển trạng thái đơn hàng theo yêu cầu.');
  if (actor.kind === 'customer' && (order.status !== 'pending' || next !== 'cancelled')) throw failure(409, 'Chỉ có thể hủy đơn đang chờ xác nhận.');
  if (actor.kind === 'system' && (order.status !== 'pending' || next !== 'cancelled' || order.paymentStatus === 'paid')) throw failure(409, 'Đơn không còn đủ điều kiện tự động hủy.');
  if (next !== 'cancelled' && order.paymentMethod !== 'COD' && order.paymentStatus !== 'paid') throw failure(409, 'Cần xác nhận thanh toán trước khi xử lý đơn.');
  return true;
}

export const groups = ['premium', 'newbie', 'normal', 'silver', 'gold', 'vip', 'inactive'];
export function audienceQuery(group, now = new Date()) {
  if (!groups.includes(group)) throw failure(400, 'Nhóm khách hàng không hợp lệ.');
  if (group === 'premium') return { 'membership.isPremium': true, 'membership.expireAt': { $gt: now } };
  return { tier: group === 'inactive' ? 'newbie' : group };
}
export function assertCoupon(coupon, user, now = new Date()) {
  if (!coupon || !coupon.isActive || new Date(coupon.expiryDate) <= now || coupon.usedCount >= coupon.usageLimit) throw failure(400, 'Mã giảm giá không tồn tại, đã khóa, hết hạn hoặc hết lượt.');
  if (coupon.usedBy?.some(entry => String(entry.userId) === String(user._id) && entry.count > 0)) throw failure(400, 'Bạn đã sử dụng mã này.');
  if (coupon.targetAudience === 'group') {
    audienceQuery(coupon.groupType, now);
    const matches = coupon.groupType === 'premium' ? user.membership?.isPremium && new Date(user.membership.expireAt) > now : user.tier === (coupon.groupType === 'inactive' ? 'newbie' : coupon.groupType);
    if (!matches) throw failure(400, 'Mã giảm giá không dành cho tài khoản của bạn.');
  }
}
export function priceOrder(items, firstOrder, coupon) {
  if (!items.length || items.some(i => !Number.isSafeInteger(i.price) || i.price <= 0 || !Number.isSafeInteger(i.quantity) || i.quantity < 1)) throw failure(400, 'Sản phẩm hoặc số lượng không hợp lệ.');
  const originalPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  if (!Number.isSafeInteger(originalPrice)) throw failure(400, 'Giá trị đơn hàng vượt giới hạn.');
  const percent = Math.min(100, (firstOrder ? 15 : 0) + (coupon?.discountPercent || 0));
  const totalDiscount = Math.round(originalPrice * percent / 100);
  return { originalPrice, totalDiscount, finalPrice: originalPrice - totalDiscount, appliedCouponId: coupon?._id || null, messages: [...(firstOrder ? ['Giảm 15% ưu đãi đơn hàng đầu tiên'] : []), ...(coupon ? [`Áp dụng mã ${coupon.code} (Giảm ${coupon.discountPercent}%)`] : [])] };
}
