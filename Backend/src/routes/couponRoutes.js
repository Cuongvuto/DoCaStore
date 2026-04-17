import express from 'express';
import { 
  createCoupon, 
  getAllCoupons, 
  toggleCouponStatus, 
  validateCoupon 
} from '../controller/couponController.js';
import { verifyToken, isAdmin } from '../middlewares/authMiddleware.js'; 

const router = express.Router();

// Route cho Khách hàng (Chỉ cần đăng nhập là được kiểm tra mã)
router.post('/validate', verifyToken, validateCoupon);

// Route cho Admin (Bắt buộc phải qua 2 chốt kiểm tra: Đăng nhập + Là Admin)
router.post('/', verifyToken, isAdmin, createCoupon);
router.get('/', verifyToken, isAdmin, getAllCoupons);
router.put('/:id/toggle', verifyToken, isAdmin, toggleCouponStatus);

export default router;