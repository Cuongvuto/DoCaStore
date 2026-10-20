import Order from '../models/oderModel.js';
import Product from '../models/productsModel.js';
import User from '../models/userModel.js';
import Conversation from '../models/conversationModel.js';
import { chartWindow, enumFilter } from '../utils/adminQuery.js';

export const getDashboardOverview = async (req, res) => {
  try {
    const role = req.user.role;
    const full = ['admin', 'superadmin'].includes(role);
    const permissions = { orders: full || role === 'order_admin', products: full || role === 'product_admin', support: full || role === 'support_admin', users: full };
    const data = { permissions, stats: {}, recentOrders: [], lowStock: [], bestSellingProducts: [] };
    const tasks = [];
    if (permissions.orders) tasks.push((async () => {
      const [groups, recentOrders, bestSelling] = await Promise.all([
        Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$totalPrice' } } }]),
        Order.find().sort({ createdAt: -1, _id: -1 }).limit(6).select('shippingAddress.receiverName totalPrice status paymentStatus paymentMethod createdAt').lean(),
        Order.aggregate([
          { $match: { status: 'completed' } }, { $unwind: '$products' },
          { $group: { _id: '$products.productId', sold: { $sum: '$products.quantity' } } },
          { $sort: { sold: -1, _id: 1 } }, { $limit: 5 },
          { $lookup: { from: Product.collection.name, localField: '_id', foreignField: '_id', as: 'product' } },
          { $project: { sold: 1, name: { $ifNull: [{ $arrayElemAt: ['$product.name', 0] }, 'Sản phẩm đã xóa'] } } }
        ])
      ]);
      Object.assign(data.stats, {
        totalOrders: groups.reduce((sum, row) => sum + row.count, 0),
        pendingOrders: groups.find(row => row._id === 'pending')?.count || 0,
        processingOrders: groups.find(row => row._id === 'processing')?.count || 0,
        totalDelivered: groups.find(row => row._id === 'completed')?.count || 0,
        totalRevenue: groups.find(row => row._id === 'completed')?.amount || 0
      });
      data.recentOrders = recentOrders;
      data.bestSellingProducts = bestSelling;
    })());
    if (permissions.products) tasks.push((async () => {
      const [totalProducts, outOfStock, lowStockCount, lowStock] = await Promise.all([
        Product.countDocuments(), Product.countDocuments({ stock: { $lte: 0 } }),
        Product.countDocuments({ stock: { $gt: 0, $lte: 5 } }),
        Product.find({ stock: { $lte: 5 } }).sort({ stock: 1, _id: 1 }).limit(6).select('name stock imageUrl').lean()
      ]);
      Object.assign(data.stats, { totalProducts, outOfStock, lowStockCount });
      data.lowStock = lowStock;
    })());
    if (permissions.users) tasks.push((async () => { data.stats.totalUsers = await User.countDocuments(); })());
    if (permissions.support) tasks.push((async () => {
      const [waitingTickets, activeTickets] = await Promise.all([Conversation.countDocuments({ status: 'pending' }), Conversation.countDocuments({ status: 'active' })]);
      Object.assign(data.stats, { waitingTickets, activeTickets });
    })());
    await Promise.all(tasks);
    return res.json({ success: true, data });
  } catch (error) {
    console.error('Dashboard overview:', error.message);
    return res.status(500).json({ success: false, message: 'Không thể tải tổng quan. Vui lòng thử lại.' });
  }
};

export const getActivityChartData = async (req, res) => {
  try {
    const { buckets, start, unit } = chartWindow(req.query.period ?? 'daily');
    const basis = enumFilter(req.query.basis, ['createdAt', 'completedAt', 'paidAt']) || 'completedAt';
    const raw = await Order.aggregate([
      { $match: { ...(basis === 'paidAt' ? { paymentStatus: 'paid', status: { $ne: 'cancelled' } } : { status: 'completed' }), [basis]: { $gte: start, $lte: new Date() } } },
      { $group: { _id: { $dateTrunc: { date: '$' + basis, unit, timezone: 'Asia/Ho_Chi_Minh', ...(unit === 'week' ? { startOfWeek: 'monday' } : {}) } }, total: { $sum: '$totalPrice' } } },
      { $project: { _id: 0, key: { $dateToString: { date: '$_id', format: '%Y-%m-%d', timezone: 'Asia/Ho_Chi_Minh' } }, total: 1 } }
    ]);
    const totals = new Map(raw.map(row => [row.key, row.total]));
    return res.json({ success: true, data: buckets.map(row => ({ ...row, value: totals.get(row.key) || 0 })) });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.status ? error.message : 'Không thể tải biểu đồ doanh thu.' });
  }
};
