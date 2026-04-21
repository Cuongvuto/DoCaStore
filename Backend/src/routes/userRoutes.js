
import express from 'express';
import { createUser, getAllUsers,deleteUser,getUserById, getUserByName,logIn,forgotPassword, resetPassword,verifyEmail,getMe, changeUserRole } from '../controller/userController.js'; 
import { verifyToken, isAdmin } from '../middlewares/authMiddleware.js';
const router = express.Router();

// 1. Route kiểm tra dữ liệu: Lấy danh sách tất cả người dùng
router.get('/admin', verifyToken, isAdmin, getAllUsers);

// 2. Route tạo dữ liệu: Đăng ký người dùng mới

router.post('/register', createUser); 
router.post('/verify-email', verifyEmail);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:token', resetPassword);

router.post('/login',logIn);

router.get('/',verifyToken,isAdmin,getAllUsers);

router.get('/search',verifyToken, isAdmin ,getUserByName, );

router.delete('/:id',verifyToken,isAdmin,deleteUser,);

router.get('/me', verifyToken, getMe);

router.get('/:id',verifyToken,isAdmin,getUserById);

router.put('/:id/role', verifyToken, isAdmin, changeUserRole);

export default router;