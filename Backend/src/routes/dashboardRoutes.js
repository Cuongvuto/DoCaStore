import express from 'express';
import { getDashboardOverview, getActivityChartData } from '../controller/dashboardController.js';
import { verifyToken, isAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/overview', verifyToken, isAdmin, getDashboardOverview);
router.get('/activity', verifyToken, isAdmin, getActivityChartData);


export default router;
