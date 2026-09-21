import express from 'express';

import { 
  createProduct, 
  getAllProduct, 
  getProductById, 
  updateProduct, 
  deleteProduct,
  getTrendingProducts,
  getProductsByCategory 
} from '../controller/productController.js';
import { authorize, verifyToken } from '../middlewares/authMiddleware.js';
import upload from '../config/cloudinaryConfig.js';


const router = express.Router();
const manageProducts = authorize('superadmin', 'admin', 'product_admin');

router.get('/',getAllProduct);

router.get('/trending', getTrendingProducts);

router.get('/category/:identifier', getProductsByCategory);

router.get('/:id',getProductById);

router.post('/', verifyToken, manageProducts, upload.array('images', 5), createProduct);

router.put('/:id', verifyToken, manageProducts, upload.array('images', 5), updateProduct);

router.delete('/:id', verifyToken, manageProducts, deleteProduct);

export default router;

