import express from 'express';
import { getDashboardOverview, getActivityChartData } from '../controller/dashboardController.js';
import { verifyToken, isAdmin, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/overview', verifyToken, isAdmin, getDashboardOverview);
router.get('/activity', verifyToken, authorize('admin', 'superadmin', 'order_admin'), getActivityChartData);


export default router;
