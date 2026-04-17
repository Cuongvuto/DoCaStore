import express from 'express';
import { 
    getAllNews, 
    getNewsById, 
    createNews, 
    updateNews, 
    deleteNews,
    getNewsDetail
     
} from '../controller/newsController.js';
import { isAdmin, verifyToken } from '../middlewares/authMiddleware.js';
import upload from '../config/cloudinaryConfig.js'; 

const router = express.Router();

// Lấy danh sách tin tức
router.get('/', getAllNews);

// Lấy chi tiết tin tức theo ID
// router.get('/:id', getNewsById);

// lay slug
router.get('/:slug', getNewsDetail);

// Thêm bài viết mới (Bắt file ảnh từ form gửi lên qua trường 'thumbnail')
router.post('/create',verifyToken,isAdmin, upload.single('thumbnail'), createNews);

// Sửa bài viết
router.put('/:id',verifyToken,isAdmin, upload.single('thumbnail'), updateNews);

// Xóa bài viết
router.delete('/:id',verifyToken,isAdmin, deleteNews);

export default router;