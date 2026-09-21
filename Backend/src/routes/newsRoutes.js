import express from 'express';
import { 
    getAllNews, 
    getNewsById, 
    createNews, 
    updateNews, 
    deleteNews,
    getNewsDetail
     
} from '../controller/newsController.js';
import { authorize, verifyToken } from '../middlewares/authMiddleware.js';
import upload from '../config/cloudinaryConfig.js'; 

const router = express.Router();
const manageContent = authorize('superadmin', 'admin', 'product_admin');

// Lấy danh sách tin tức
router.get('/', getAllNews);

// Lấy chi tiết tin tức theo ID
// router.get('/:id', getNewsById);

// lay slug
router.get('/:slug', getNewsDetail);

// Thêm bài viết mới (Bắt file ảnh từ form gửi lên qua trường 'thumbnail')
router.post('/create', verifyToken, manageContent, upload.single('thumbnail'), createNews);

// Sửa bài viết
router.put('/:id', verifyToken, manageContent, upload.single('thumbnail'), updateNews);

// Xóa bài viết
router.delete('/:id', verifyToken, manageContent, deleteNews);

export default router;
