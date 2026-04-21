import express from 'express';
import { getDashboardOverview } from '../controller/dashboardController.js';
import { verifyToken, isAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/overview', verifyToken, isAdmin, getDashboardOverview);

export default router;
