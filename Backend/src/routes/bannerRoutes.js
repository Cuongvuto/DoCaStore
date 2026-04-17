import express from 'express';
import { getActiveBanners, getAllBanners, createBanner, updateBanner, deleteBanner } from '../controller/bannerController.js';
import { verifyToken, isAdmin } from '../middlewares/authMiddleware.js';
import upload from '../config/cloudinaryConfig.js';

const router = express.Router();

// Public route (Ai cũng xem được)
router.get('/active', getActiveBanners);

// Admin routes (Phải đăng nhập + Quyền Admin)
router.get('/', getAllBanners);
router.post('/', verifyToken, isAdmin, upload.single('image'), createBanner);
router.put('/:id', verifyToken, isAdmin, upload.single('image'), updateBanner);
router.delete('/:id', verifyToken, isAdmin, deleteBanner);

export default router;