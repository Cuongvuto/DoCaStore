import express from 'express';
import {
  getUserAddresses,
  addAddress,
  updateAddress,
  deleteAddress
} from '../controller/addressController.js';
import { verifyToken } from '../middlewares/authMiddleware.js'; 

const router = express.Router();

// Áp dụng middleware verifyToken cho tất cả các route ở dưới (vì phải đăng nhập mới có Sổ địa chỉ)
router.use(verifyToken);

router.get('/', getUserAddresses);          // Lấy danh sách địa chỉ
router.post('/', addAddress);               // Thêm địa chỉ mới
router.put('/:id', updateAddress);          // Cập nhật địa chỉ (sửa thông tin, set mặc định)
router.delete('/:id', deleteAddress);       // Xóa địa chỉ

export default router;