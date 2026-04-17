import express from 'express';
import { createCategory,getAllCategory,updateCategory,deleteCategory,getCategoryById } from '../controller/categoryController.js';
import { verifyToken, isAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', getAllCategory);


router.post('/', verifyToken, isAdmin,createCategory);

router.get('/:id', getCategoryById);

router.put('/:id',verifyToken, isAdmin,updateCategory);

router.delete('/:id',verifyToken, isAdmin, deleteCategory);

export default router;