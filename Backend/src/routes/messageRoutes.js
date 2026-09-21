import express from 'express';
import { getConversations, getChatHistory,getCustomerTicket,getCustomerAllTickets } from '../controller/messageController.js';
import { verifyToken, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();
const manageSupport = authorize('superadmin', 'admin', 'support_admin');

router.get('/conversations', verifyToken, manageSupport, getConversations);
router.get('/:conversationId', verifyToken, getChatHistory);
router.get('/customer/:customerId', verifyToken, getCustomerTicket);
router.get('/customer-tickets/:customerId', verifyToken, getCustomerAllTickets);

export default router;
