import { LayoutDashboard, Package, FolderTree, ShoppingCart, Users, Image, Newspaper, Ticket, Bell, MessagesSquare } from 'lucide-react';

export const ROLE_LABELS = { superadmin: 'Quản trị cấp cao', admin: 'Quản trị viên', product_admin: 'Quản lý sản phẩm', order_admin: 'Quản lý đơn hàng', support_admin: 'Chăm sóc khách hàng', customer: 'Khách hàng' };
const full = ['admin', 'superadmin'];
export const ADMIN_MENU = [
  { path: '/admin', name: 'Tổng quan', icon: LayoutDashboard, group: 'Không gian làm việc', roles: [...full, 'product_admin', 'order_admin', 'support_admin'] },
  { path: '/admin/orders', name: 'Đơn hàng', icon: ShoppingCart, group: 'Kinh doanh', roles: [...full, 'order_admin'] },
  { path: '/admin/products', name: 'Sản phẩm', icon: Package, group: 'Kinh doanh', roles: [...full, 'product_admin'] },
  { path: '/admin/categories', name: 'Danh mục', icon: FolderTree, group: 'Kinh doanh', roles: [...full, 'product_admin'] },
  { path: '/admin/coupons', name: 'Mã giảm giá', icon: Ticket, group: 'Kinh doanh', roles: [...full, 'order_admin'] },
  { path: '/admin/users', name: 'Người dùng', icon: Users, group: 'Khách hàng', roles: full },
  { path: '/admin/messages', name: 'Hỗ trợ khách hàng', icon: MessagesSquare, group: 'Khách hàng', roles: [...full, 'support_admin'] },
  { path: '/admin/notifications', name: 'Thông báo', icon: Bell, group: 'Khách hàng', roles: [...full, 'support_admin'] },
  { path: '/admin/news', name: 'Bài viết', icon: Newspaper, group: 'Nội dung', roles: [...full, 'product_admin'] },
  { path: '/admin/banners', name: 'Banner', icon: Image, group: 'Nội dung', roles: [...full, 'product_admin'] }
];
export const ORDER_LABELS = { pending: 'Chờ xác nhận', processing: 'Đang chuẩn bị', shipped: 'Đang giao', completed: 'Đã giao', cancelled: 'Đã hủy' };
export const PAYMENT_LABELS = { pending: 'Chưa thanh toán', paid: 'Đã thanh toán', failed: 'Thanh toán lỗi' };
export const money = value => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value) || 0);
export const dateTime = value => value ? new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' }) : '—';
