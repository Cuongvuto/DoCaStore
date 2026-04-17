import express from 'express';
import { addReview, getProductReviews,deleteReview,addNewsReview,getNewsReviews,deleteNewsReview } from '../controller/reviewController.js';
import { verifyToken } from '../middlewares/authMiddleware.js'; 

const router = express.Router();

// Khách truy cập bình thường cũng xem được đánh giá
router.get('/product/:productId', getProductReviews);

// Bắt buộc đăng nhập mới được viết đánh giá
router.post('/add', verifyToken, addReview);

router.delete('/:productId', verifyToken,deleteReview);


// router newsReview
router.get('/news/:newsId', getNewsReviews);

router.post('/news/add', verifyToken, addNewsReview);

router.delete('/news/:id', verifyToken, deleteNewsReview);

export default router;