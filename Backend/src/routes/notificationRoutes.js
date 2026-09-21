import express from 'express';
import { 
  getUserNotifications, 
  markAsRead, 
  markAllAsRead,
  // Bổ sung các hàm Admin đã tạo ở Controller
  getAllNotificationsAdmin,
  createNotificationAdmin,
  deleteNotificationAdmin,
  getUnreadCount 
} from '../controller/notificationController.js'; 
import { verifyToken, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();
const manageSupport = authorize('superadmin', 'admin', 'support_admin');

// 1. ROUTES DÀNH CHO KHÁCH HÀNG (USER)
router.get('/unread-count', verifyToken, getUnreadCount);
router.put('/read-all', verifyToken, markAllAsRead); 
router.get('/', verifyToken, getUserNotifications);
router.put('/:id/read', verifyToken, markAsRead);


// 2. ROUTES DÀNH CHO QUẢN TRỊ VIÊN (ADMIN)
router.get('/admin', verifyToken, manageSupport, getAllNotificationsAdmin);
router.post('/admin', verifyToken, manageSupport, createNotificationAdmin);
router.delete('/admin/:id', verifyToken, manageSupport, deleteNotificationAdmin);

export default router;
