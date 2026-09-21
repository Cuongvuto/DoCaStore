import express from 'express';
import { getActiveBanners, getAllBanners, createBanner, updateBanner, deleteBanner } from '../controller/bannerController.js';
import { verifyToken, authorize } from '../middlewares/authMiddleware.js';
import upload from '../config/cloudinaryConfig.js';

const router = express.Router();
const manageProducts = authorize('superadmin', 'admin', 'product_admin');

// Public route (Ai cũng xem được)
router.get('/active', getActiveBanners);

// Admin routes (Phải đăng nhập + Quyền Admin)
router.get('/', verifyToken, manageProducts, getAllBanners);
router.post('/', verifyToken, manageProducts, upload.single('image'), createBanner);
router.put('/:id', verifyToken, manageProducts, upload.single('image'), updateBanner);
router.delete('/:id', verifyToken, manageProducts, deleteBanner);

export default router;
