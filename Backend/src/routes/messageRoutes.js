import express from 'express';
import { getConversations, getChatHistory } from '../controller/messageController.js';
import { verifyToken, isAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/conversations', verifyToken, isAdmin, getConversations);
router.get('/:customerId', verifyToken, getChatHistory);

export default router;
