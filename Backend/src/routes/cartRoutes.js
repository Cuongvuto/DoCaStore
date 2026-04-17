import express, { Router } from 'express';
import { getCart,updateCartItem,addToCart,removeFromCart } from '../controller/cartController.js';
import { verifyToken, isAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/',verifyToken,addToCart);

router.get('/',verifyToken,getCart);

router.put('/:id',verifyToken,updateCartItem);

router.delete('/:id',verifyToken,removeFromCart);

export default router;