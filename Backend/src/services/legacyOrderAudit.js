// Offline analysis only. Never infers stock movements from order status or dates.
const activeStatuses = new Set(['pending', 'processing', 'shipped']);
const statuses = new Set([...activeStatuses, 'completed', 'cancelled']);
const number = value => {
  if (typeof value === 'number') return value;
  if (!value || typeof value !== 'object') return NaN;
  const raw = value.$numberInt ?? value.$numberLong ?? value.$numberDouble ?? value.$numberDecimal;
  return typeof raw === 'string' ? Number(raw) : NaN;
};

export function auditLegacyOrders(orders) {
  if (!Array.isArray(orders)) throw new Error('Expected a JSON array of exported orders.');
  const findings = [];
  const ids = new Set();
  for (const order of orders) {
    const id = typeof order?._id === 'string' ? order._id : order?._id?.$oid;
    if (!/^[a-f\d]{24}$/i.test(id || '') || ids.has(id.toLowerCase())) throw new Error('Each exported order must have a unique MongoDB _id.');
    ids.add(id.toLowerCase());
    const add = (severity, code, action) => findings.push({ orderId: id, severity, code, action });
    const active = activeStatuses.has(order.status);
    if (!statuses.has(order.status)) add('blocker', 'UNKNOWN_STATUS', 'Đối chiếu trạng thái đơn trước khi chuyển phiên bản.');
    if (active && typeof order.stockReserved !== 'boolean') add('blocker', 'INVENTORY_UNKNOWN', 'Đối chiếu xuất/hoàn kho theo từng sản phẩm; không tự gán stockReserved=true theo trạng thái đơn.');
    if (active && order.stockReserved === false) add('blocker', 'INVENTORY_NOT_RESERVED', 'Đơn chưa giữ kho: không tiếp tục giao hoặc yêu cầu khách thanh toán; đối chiếu trước khi hủy/đặt lại.');
    if (active && order.couponCode && typeof order.couponReserved !== 'boolean') add('blocker', 'COUPON_UNKNOWN', 'Xác minh lượt coupon thực sự đã sử dụng trước khi cho phép hoàn lượt.');
    if (order.status === 'pending' && order.paymentMethod === 'VietQR' && order.paymentStatus !== 'paid' && !order.paymentLink?.qrCode) {
      add('blocker', 'LEGACY_PAYMENT_LINK', 'Đối chiếu link PayOS gốc và giao dịch. Không tạo lại link hoặc yêu cầu trả tiền lần hai; xử lý dứt điểm trên bản cũ hoặc chuẩn bị chuyển đổi có kiểm chứng.');
    }
    const total = number(order.totalPrice);
    if (!Number.isFinite(total) || total < 0 || !Number.isSafeInteger(Math.round(total))) add('blocker', 'INVALID_TOTAL', 'Đối chiếu tổng đơn và số tiền tại cổng thanh toán.');
    else if (!Number.isInteger(total)) add('warning', 'FRACTIONAL_VND', 'Bản cũ gửi Math.round(totalPrice) cho PayOS; đối chiếu số tiền đã yêu cầu, không tự sửa giá lịch sử.');
    if (order.paymentMethod === 'VietQR' && !Number.isSafeInteger(number(order.payosOrderCode))) add(active ? 'blocker' : 'warning', 'PAYMENT_CODE_MISSING', 'Thiếu mã PayOS hợp lệ; cần tìm lại giao dịch tại cổng thanh toán.');
    if (order.status === 'completed' && !order.completedAt) add('warning', 'COMPLETION_DATE_UNKNOWN', 'Biểu đồ theo ngày hoàn tất sẽ loại đơn này; có thể xem theo ngày đặt. Không gán createdAt/updatedAt làm ngày hoàn tất.');
    if (order.paymentStatus === 'paid' && !order.paidAt) add('warning', 'PAYMENT_DATE_UNKNOWN', 'Đối chiếu ngày thu tiền nếu cần báo cáo lịch sử; không đoán ngày thanh toán.');
    if (order.paymentReview && order.paymentReview !== 'none') add('blocker', 'PAYMENT_REVIEW', 'Hoàn tất đối soát thanh toán/tồn kho hoặc ghi nhận phương án xử lý từng đơn.');
  }
  return {
    scannedOrders: orders.length,
    blockers: findings.filter(item => item.severity === 'blocker').length,
    warnings: findings.filter(item => item.severity === 'warning').length,
    scope: 'Offline snapshot only; this does not certify deployment readiness or modify data.',
    findings
  };
}
