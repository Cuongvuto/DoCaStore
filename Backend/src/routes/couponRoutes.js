import express from 'express';
import { 
  createCoupon, 
  getAllCoupons, 
  toggleCouponStatus, 
  validateCoupon 
} from '../controller/couponController.js';
import { verifyToken, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();
const manageOrders = authorize('superadmin', 'admin', 'order_admin');

// Route cho Khách hàng (Chỉ cần đăng nhập là được kiểm tra mã)
router.post('/validate', verifyToken, validateCoupon);

// Route cho Admin (Bắt buộc phải qua 2 chốt kiểm tra: Đăng nhập + Là Admin)
router.post('/', verifyToken, manageOrders, createCoupon);
router.get('/', verifyToken, manageOrders, getAllCoupons);
router.put('/:id/toggle', verifyToken, manageOrders, toggleCouponStatus);

export default router;
