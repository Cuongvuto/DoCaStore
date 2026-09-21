
import express from 'express';
import { createUser, createStaffUser, getAllUsers,deleteUser,getUserById, getUserByName,logIn,forgotPassword, resetPassword,verifyEmail,getMe, changeUserRole, resendOTP, googleLogin } from '../controller/userController.js';
import { verifyToken, authorize } from '../middlewares/authMiddleware.js';
const router = express.Router();
const manageUsers = authorize('admin', 'superadmin');

router.post('/register', createUser); 
router.post('/verify-email', verifyEmail);
router.post('/resend-otp', resendOTP);
router.post('/google-login', googleLogin);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:token', resetPassword);

router.post('/login',logIn);

router.get('/me', verifyToken, getMe);
router.get('/admin', verifyToken, manageUsers, getAllUsers);
router.post('/admin/staff', verifyToken, manageUsers, createStaffUser);
router.get('/', verifyToken, manageUsers, getAllUsers);
router.get('/search', verifyToken, manageUsers, getUserByName);
router.get('/:id', verifyToken, manageUsers, getUserById);
router.put('/:id/role', verifyToken, manageUsers, changeUserRole);
router.delete('/:id', verifyToken, manageUsers, deleteUser);

export default router;
