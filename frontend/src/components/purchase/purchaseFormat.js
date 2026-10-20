export const money = value => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(value) || 0);
export const dateTime = value => value && Number.isFinite(new Date(value).getTime()) ? new Date(value).toLocaleString('vi-VN') : 'Chưa có thông tin';
export const orderLabels = { pending: 'Chờ xác nhận', processing: 'Đang xử lý', shipped: 'Đang giao hàng', completed: 'Đã hoàn tất', cancelled: 'Đã hủy' };
export const paymentLabels = { pending: 'Chưa thanh toán', unpaid: 'Chưa thanh toán', paid: 'Đã thanh toán', failed: 'Thanh toán thất bại' };
export const addressText = address => [address?.street, address?.ward, address?.district, address?.city].filter(Boolean).join(', ');
