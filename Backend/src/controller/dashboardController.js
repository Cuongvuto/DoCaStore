import Order from '../models/oderModel.js';
import Review from '../models/reviewModel.js';
import Product from '../models/productsModel.js';

export const getDashboardOverview = async (req, res) => {
    try {
        // 1. STATS
        const totalOrders = await Order.countDocuments();
        const totalDelivered = await Order.countDocuments({ status: 'completed' });
        const totalCancelled = await Order.countDocuments({ status: 'cancelled' });
        
        // Total Revenue: sum of totalPrice for completed orders
        const revenueResult = await Order.aggregate([
            { $match: { status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$totalPrice' } } }
        ]);
        const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

        // 2. RECENT ORDERS (Last 6)
        const recentOrders = await Order.find()
            .sort({ createdAt: -1 })
            .limit(6)
            .populate('userId', 'name avatar') // Ensure avatar field is fetched if it exists
            .select('userId payosOrderCode _id totalPrice status createdAt');
        
        // 3. RECENT FEEDBACK (Last 3)
        const recentReviews = await Review.find()
            .sort({ createdAt: -1 })
            .limit(4)
            .populate('userId', 'name avatar');

        // 4. ACTIVITY CHART DATA (Last 7 days revenue for example)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const activityData = await Order.aggregate([
            { 
                $match: { 
                    createdAt: { $gte: sevenDaysAgo },
                    status: 'completed'
                } 
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    total: { $sum: '$totalPrice' }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const formattedActivityData = activityData.map(item => ({
            name: item._id.split('-')[2], // get just the day part
            value: item.total
        }));

        // Provide fallback dummy data for chart if empty so UI looks good initially
        const finalChartData = formattedActivityData.length > 0 ? formattedActivityData : [
            { name: '10', value: 4000000 },
            { name: '11', value: 3000000 },
            { name: '12', value: 5000000 },
            { name: '13', value: 4500000 },
            { name: '14', value: 6000000 },
            { name: '15', value: 3500000 },
        ];

        // 5. GOAL PROGRESS
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const currentMonthRevenueResult = await Order.aggregate([
            { $match: { status: 'completed', createdAt: { $gte: startOfMonth } } },
            { $group: { _id: null, total: { $sum: '$totalPrice' } } }
        ]);
        const currentMonthRevenue = currentMonthRevenueResult.length > 0 ? currentMonthRevenueResult[0].total : 0;
        const monthlyGoal = 50000000; // 50 million VND
        const goalProgress = Math.min(Math.round((currentMonthRevenue / monthlyGoal) * 100), 100);

        // 6. BEST SELLING PRODUCTS
        const bestSellingProducts = await Product.find()
            .sort({ sold: -1 })
            .limit(5)
            .select('name price imageUrl sold');

        res.status(200).json({
            success: true,
            data: {
                stats: {
                    totalOrders,
                    totalDelivered,
                    totalCancelled,
                    totalRevenue
                },
                goal: {
                    currentMonthRevenue,
                    target: monthlyGoal,
                    progress: goalProgress
                },
                bestSellingProducts,
                recentOrders,
                recentReviews,
                activityData: finalChartData
            }
        });

    } catch (error) {
        console.error("Dashboard error:", error);
        res.status(500).json({ success: false, message: 'Lỗi server khi lấy dữ liệu dashboard' });
    }
};
