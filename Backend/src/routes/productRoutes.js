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
import { isAdmin, verifyToken } from '../middlewares/authMiddleware.js';
import upload from '../config/cloudinaryConfig.js';


const router = express.Router();

router.get('/',getAllProduct);

router.get('/trending', getTrendingProducts);

router.get('/category/:identifier', getProductsByCategory);

router.get('/:id',getProductById);

router.post('/',verifyToken,isAdmin,upload.array('images', 5) ,createProduct);

router.put('/:id',verifyToken,isAdmin,upload.array('images', 5) ,updateProduct);

router.delete('/:id',verifyToken,isAdmin,deleteProduct);

export default router;

