import express from 'express';
import { toggleWishlist, getUserWishlist } from '../controller/wishlistController.js';
import { verifyToken } from '../middlewares/authMiddleware.js'; 

const router = express.Router();

// Tất cả các route liên quan đến Wishlist đều yêu cầu đăng nhập
router.use(verifyToken); 

router.get('/',verifyToken, getUserWishlist); // Lấy danh sách
router.post('/toggle',verifyToken, toggleWishlist); // Thả tim / Bỏ tim

export default router;