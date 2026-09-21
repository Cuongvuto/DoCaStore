import express from 'express';
import { createCategory,getAllCategory,updateCategory,deleteCategory,getCategoryById } from '../controller/categoryController.js';
import { verifyToken, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();
const manageProducts = authorize('superadmin', 'admin', 'product_admin');

router.get('/', getAllCategory);


router.post('/', verifyToken, manageProducts, createCategory);

router.get('/:id', getCategoryById);

router.put('/:id', verifyToken, manageProducts, updateCategory);

router.delete('/:id', verifyToken, manageProducts, deleteCategory);

export default router;
