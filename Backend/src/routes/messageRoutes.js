import express from 'express';
import { getConversations, getChatHistory,getCustomerTicket,getCustomerAllTickets } from '../controller/messageController.js';
import { verifyToken, isAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/conversations', verifyToken, isAdmin, getConversations);
router.get('/:conversationId', verifyToken, getChatHistory);
router.get('/customer/:customerId', verifyToken, getCustomerTicket);
router.get('/customer-tickets/:customerId', verifyToken, getCustomerAllTickets);

export default router;
