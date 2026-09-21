import express from 'express';
import { 
    createOrder,
    getAllOrders,
    getUserOrders,
    updateOrderStatus,
    getOrderById,
    previewCheckoutPrice,
    payosWebhook,
    cancelOrder
} from '../controller/orderController.js';
import { verifyToken, authorize } from '../middlewares/authMiddleware.js';


const router = express.Router();
const manageOrders = authorize('superadmin', 'admin', 'order_admin');

router.post('/', verifyToken, createOrder);

router.post('/preview', verifyToken, previewCheckoutPrice); // API mới kiểm tra giá giỏ hàng
router.post('/payos-webhook', payosWebhook); // Hứng tín hiệu từ PayOS

router.get('/my-orders',verifyToken,getUserOrders);

router.get('/', verifyToken, manageOrders, getAllOrders);

router.get('/:id', verifyToken, getOrderById);

router.put('/:id/status', verifyToken, manageOrders, updateOrderStatus);

router.put('/:id/cancel', verifyToken, cancelOrder);

export default router;
