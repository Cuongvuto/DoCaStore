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
import { verifyToken, isAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

// 1. ROUTES DÀNH CHO KHÁCH HÀNG (USER)
router.get('/unread-count', verifyToken, getUnreadCount);
router.put('/read-all', verifyToken, markAllAsRead); 
router.get('/', verifyToken, getUserNotifications);
router.put('/:id/read', verifyToken, markAsRead);


// 2. ROUTES DÀNH CHO QUẢN TRỊ VIÊN (ADMIN)
router.get('/admin', verifyToken, isAdmin, getAllNotificationsAdmin);
router.post('/admin', verifyToken, isAdmin, createNotificationAdmin);
router.delete('/admin/:id', verifyToken, isAdmin, deleteNotificationAdmin);

export default router;