
import express from 'express';
import { createUser, createStaffUser, getAllUsers,deleteUser,getUserById, getUserByName,logIn,forgotPassword, resetPassword,verifyEmail,getMe, changeUserRole, resendOTP, googleLogin } from '../controller/userController.js';
import { verifyToken, authorize } from '../middlewares/authMiddleware.js';
import { authRateLimit } from '../middlewares/authRateLimit.js';
import { changePassword } from '../controller/userController.js';
const router = express.Router();
const manageUsers = authorize('admin', 'superadmin');

router.post('/register', authRateLimit('email'), createUser);
router.post('/verify-email', authRateLimit('otp'), verifyEmail);
router.post('/resend-otp', authRateLimit('email'), resendOTP);
router.post('/google-login', authRateLimit('google'), googleLogin);
router.post('/forgot-password', authRateLimit('email'), forgotPassword);
router.put('/reset-password/:token', authRateLimit('reset'), resetPassword);

router.post('/login', authRateLimit('login'), logIn);

router.get('/me', verifyToken, getMe);
router.put('/change-password', verifyToken, authRateLimit('changePassword'), changePassword);
router.get('/admin', verifyToken, manageUsers, getAllUsers);
router.post('/admin/staff', verifyToken, manageUsers, createStaffUser);
router.get('/', verifyToken, manageUsers, getAllUsers);
router.get('/search', verifyToken, manageUsers, getUserByName);
router.get('/:id', verifyToken, manageUsers, getUserById);
router.put('/:id/role', verifyToken, manageUsers, changeUserRole);
router.delete('/:id', verifyToken, manageUsers, deleteUser);

export default router;
