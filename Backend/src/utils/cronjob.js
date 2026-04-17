import cron from 'node-cron';
import Order from '../models/oderModel.js';
import Product from '../models/productsModel.js';
import Coupon from '../models/couponModel.js';

export const startCronJobs = () => {
  // Chạy tự động mỗi 5 phút một lần
  cron.schedule('*/5 * * * *', async () => {
    console.log("⏰ [CRONJOB] Đang quét dọn các đơn hàng VietQR quá hạn...");
    try {
      // Tính mốc thời gian cách đây 15 phút
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      
      // Tìm các đơn VietQR đang pending và đã tạo quá 15 phút
      const expiredOrders = await Order.find({
        paymentMethod: 'VietQR',
        status: 'pending',
        createdAt: { $lt: fifteenMinutesAgo }
      });

      if(expiredOrders.length === 0) return;

      for (const order of expiredOrders) {
        // 1. Chuyển trạng thái thành Hủy
        order.status = 'cancelled';
        await order.save();

        // 2. Hoàn lại tồn kho
        for (const item of order.products) {
          await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity } });
        }

        // 3. Hoàn lại mã giảm giá (Nếu có)
        if (order.couponCode) {
          const coupon = await Coupon.findOne({ code: order.couponCode });
          if (coupon) {
            coupon.usedCount = Math.max(0, coupon.usedCount - 1);
            coupon.usedBy = coupon.usedBy.filter(u => u.userId.toString() !== order.userId.toString());
            await coupon.save();
          }
        }
        
        console.log(`♻️ Đã tự động hủy và hoàn kho đơn hàng hết hạn: ${order.payosOrderCode}`);
      }
    } catch (error) {
      console.error("❌ Lỗi khi chạy cronjob hủy đơn:", error);
    }
  });
};