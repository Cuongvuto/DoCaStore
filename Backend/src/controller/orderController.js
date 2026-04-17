import Order from '../models/oderModel.js'; 
import Cart from '../models/cartModel.js';
import Product from '../models/productsModel.js';
import Coupon from '../models/couponModel.js';
import User from '../models/userModel.js';
import { pushNotification } from './notificationController.js';
import crypto from 'crypto'; 
import socketUtil from '../utils/socket.js';


// ==========================================
// HÀM TẠO CHỮ KÝ BẢO MẬT CHO PAYOS (Thay thế SDK)
// ==========================================
export const generatePayOSSignature = (data, checksumKey) => {
  const signData = {
    amount: data.amount,
    cancelUrl: data.cancelUrl,
    description: data.description,
    orderCode: data.orderCode,
    returnUrl: data.returnUrl
  };

  const sortedKeys = Object.keys(signData).sort();

  const signString = sortedKeys
    .filter(key => signData[key] !== undefined && signData[key] !== null)
    .map(key => `${key}=${String(signData[key])}`)
    .join('&');

  console.log("👉 SIGN STRING CREATE:", signString);

  return crypto
    .createHmac('sha256', checksumKey)
    .update(signString)
    .digest('hex');
};
// ==========================================
// HÀM HELPER: KIỂM TRA VÀ THĂNG CẤP USER TIER
// ==========================================
const checkAndUpgradeTier = async (userId, currentTier, totalSpent, totalOrders) => {
  let newTier = currentTier;
  let upgradeMessage = '';

  if (totalSpent >= 20000000 || totalOrders >= 20) {
    newTier = 'vip';
  } else if (totalSpent >= 10000000 || totalOrders >= 10) {
    newTier = 'gold';
  } else if (totalSpent >= 5000000 || totalOrders >= 5) {
    newTier = 'silver';
  } else if (totalSpent > 0 || totalOrders >= 1) {
    newTier = 'normal';
  }

  if (newTier !== currentTier && getTierWeight(newTier) > getTierWeight(currentTier)) {
    await User.findByIdAndUpdate(userId, { tier: newTier });
    const tierNames = { normal: 'Khách Hàng Thân Thiết', silver: 'Thành Viên Bạc', gold: 'Thành Viên Vàng', vip: 'Thành Viên VIP' };
    upgradeMessage = `🎉 Chúc mừng! Tài khoản của bạn đã được thăng hạng lên ${tierNames[newTier]}. Hãy tận hưởng những ưu đãi mới nhé!`;
    await pushNotification(userId, 'Thăng hạng thành công!', upgradeMessage, 'system', '/profile');
  }
};

const getTierWeight = (tier) => {
  const weights = { newbie: 0, normal: 1, silver: 2, gold: 3, vip: 4 };
  return weights[tier] || 0;
};


// ==========================================
// 1. TẠO ĐƠN HÀNG (POST)
// ==========================================
export const createOrder = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id; 
    const { shippingAddress, paymentMethod, note, couponCode } = req.body;

    if (!shippingAddress || !shippingAddress.phone || !shippingAddress.receiverName || !shippingAddress.street) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ thông tin giao hàng!' });
    }

    const cart = await Cart.findOne({ user_id: userId }).populate('items.product_id');
    
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: 'Giỏ hàng của bạn đang trống!' });
    }

    let totalPrice = 0;
    const orderItems = [];
    const itemsForPricing = [];

    for (const item of cart.items) {
      const product = item.product_id; 
      if (!product) continue; 

      if (product.stock < item.quantity) {
        return res.status(400).json({ 
          success: false, 
          message: `Sản phẩm "${product.name}" chỉ còn ${product.stock} cái, không đủ số lượng!` 
        });
      }

      orderItems.push({
        productId: product._id, 
        quantity: item.quantity,
        priceAtPurchase: product.price 
      });

      itemsForPricing.push({ price: product.price, quantity: item.quantity });
      totalPrice += product.price * item.quantity;
    }

    if (orderItems.length === 0) {
      return res.status(400).json({ success: false, message: 'Không có sản phẩm hợp lệ để thanh toán.' });
    }

    let validCoupon = null;
    if (couponCode) {
      validCoupon = await Coupon.findOne({ 
        code: couponCode.toUpperCase(),
        isActive: true,
        expiryDate: { $gt: new Date() },
        "usedBy.userId": { $ne: userId }
      });

      if (!validCoupon || validCoupon.usedCount >= validCoupon.usageLimit) {
        return res.status(400).json({ 
          success: false, 
          message: 'Mã giảm giá không hợp lệ, đã hết hạn, hết lượt dùng hoặc bạn đã sử dụng rồi!' 
        });
      }
    }

    const pricingInfo = await calculateCheckoutPrice(userId, itemsForPricing, couponCode);
    const payosOrderCode = paymentMethod === 'VietQR' 
      ? Number(String(Date.now()).slice(-6) + Math.floor(Math.random() * 100)) 
      : undefined;

    const newOrder = new Order({
      userId: userId, 
      products: orderItems,
      totalPrice: pricingInfo.finalPrice,
      shippingAddress: shippingAddress, 
      note: note || '',
      paymentMethod: paymentMethod || 'COD',
      payosOrderCode: payosOrderCode,
      couponCode: validCoupon ? validCoupon.code : null
    });
    
    // LƯU ĐƠN HÀNG NHÁP TRƯỚC
    const savedOrder = await newOrder.save();

    let payosCheckoutUrl = null;
    let payosFullData = null;

    if (paymentMethod === 'VietQR') {
      if (pricingInfo.finalPrice < 2000) {
        return res.status(400).json({ 
          success: false, 
          message: 'Số tiền thanh toán qua VietQR phải lớn hơn 2.000đ. Vui lòng chọn Thanh toán khi nhận hàng (COD).' 
        });
      }

      try {
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
        
        // 1. Chuẩn bị data gửi lên PayOS
        const requestData = {
          orderCode: payosOrderCode,
          amount: Math.round(pricingInfo.finalPrice),
          description: `DH ST${savedOrder._id.toString().slice(-4)}`,
          returnUrl: `${clientUrl}/order-success/${savedOrder._id}`,
          cancelUrl: `${clientUrl}/checkout` 
        };

        // 2. Ký tên bảo mật dữ liệu
        requestData.signature = generatePayOSSignature(requestData, process.env.PAYOS_CHECKSUM_KEY);

        // 3. GỌI API THUẦN BẰNG FETCH (Bypass hoàn toàn SDK lỗi)
        const payosResponse = await fetch('https://api-merchant.payos.vn/v2/payment-requests', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-client-id': process.env.PAYOS_CLIENT_ID,
            'x-api-key': process.env.PAYOS_API_KEY
          },
          body: JSON.stringify(requestData)
        });

        const payosResult = await payosResponse.json();

        // 4. Xử lý kết quả trả về
        if (payosResult.code === '00') {
          payosCheckoutUrl = payosResult.data.checkoutUrl;
          payosFullData = {
            qrCode: payosResult.data.qrCode, // CHUỖI VẼ QR
            amount: payosResult.data.amount,
            orderCode: payosResult.data.orderCode
          };
        } else {
          throw new Error(payosResult.desc || 'Lỗi không xác định từ PayOS');
        }

      } catch (payerr) {
        console.error("🚨 Lỗi tạo link PayOS:", payerr);
        return res.status(400).json({ 
          success: false, 
          message: 'Lỗi từ cổng thanh toán PayOS: ' + (payerr.message || 'Không thể tạo mã QR') 
        });
      }
    }

    // XÓA GIỎ HÀNG
    await Cart.findByIdAndUpdate(cart._id, { items: [] });

    await pushNotification(
      userId,
      `Đặt hàng thành công #${savedOrder._id.toString().slice(-6).toUpperCase()}`,
      paymentMethod === 'VietQR' ? `Đơn hàng đã lên hệ thống, vui lòng thanh toán QR để hoàn tất.` : `Đơn hàng chờ cửa hàng xác nhận.`,
      'order',
      `/order-success/${savedOrder._id}`
    );

    // TRỪ TỒN KHO VÀ COUPON
    if (validCoupon) {
      validCoupon.usedCount += 1;
      validCoupon.usedBy.push({ userId: userId, count: 1 });
      await validCoupon.save();
    }

    for (const item of orderItems) {
      await Product.findByIdAndUpdate(item.productId, { $inc: { stock: -item.quantity } });
    }

    return res.status(201).json({
      success: true,
      message: 'Tạo đơn thành công!',
      data: savedOrder,
      payosCheckoutUrl: payosCheckoutUrl, 
      payosData: payosFullData,
      qrCode: payosFullData?.qrCode, // Để Frontend vẽ QR
      pricingDetails: pricingInfo
    });
  } catch (error) {
    console.error("❌ Lỗi createOrder:", error);
    return res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};


// ==========================================
// CÁC HÀM GET ĐƠN HÀNG, UPDATE, TÍNH TIỀN
// ==========================================
export const getUserOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const orders = await Order.find({ userId: userId }).populate('products.productId', 'name imageUrl price').sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: orders });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};

export const getAllOrders = async (req, res) => {
  try {
    const { page, limit } = req.query;
    let query = Order.find().populate('userId', 'name email phone').populate('products.productId', 'name images imageUrl').sort({ createdAt: -1 });
    let totalPages = 1, currentPage = 1, totalItems = 0;

    if (page) {
        currentPage = parseInt(page) || 1;
        const parsedLimit = parseInt(limit) || 10;
        const skip = (currentPage - 1) * parsedLimit;
        totalItems = await Order.countDocuments();
        totalPages = Math.ceil(totalItems / parsedLimit) || 1;
        query = query.skip(skip).limit(parsedLimit);
    }
    const orders = await query;
    if (!page) totalItems = orders.length;

    return res.status(200).json({ success: true, totalPages, currentPage, totalCount: totalItems, count: orders.length, data: orders });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ['pending', 'processing', 'shipped', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ!' });

    const orderBeforeUpdate = await Order.findById(id);
    if (!orderBeforeUpdate) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng!' });

    const updatedOrder = await Order.findByIdAndUpdate(id, { status: status }, { new: true });

    if (status === 'completed' && orderBeforeUpdate.status !== 'completed' && updatedOrder.userId) {
      const user = await User.findById(updatedOrder.userId);
      if (user) {
        const newTotalSpent = user.totalSpent + updatedOrder.totalPrice;
        const newTotalOrders = user.totalOrders + 1;
        await User.findByIdAndUpdate(user._id, { totalSpent: newTotalSpent, totalOrders: newTotalOrders });
        await checkAndUpgradeTier(user._id, user.tier, newTotalSpent, newTotalOrders);
      }
    }

    if (status === 'cancelled' && orderBeforeUpdate.status === 'completed' && updatedOrder.userId) {
       const user = await User.findById(updatedOrder.userId);
       if (user) {
         const revertedSpent = Math.max(0, user.totalSpent - orderBeforeUpdate.totalPrice);
         const revertedOrders = Math.max(0, user.totalOrders - 1);
         await User.findByIdAndUpdate(user._id, { totalSpent: revertedSpent, totalOrders: revertedOrders });
       }
    }

    let notiMessage = '';
    if (status === 'processing') notiMessage = 'Đơn hàng của bạn đã được xác nhận và đang đóng gói.';
    if (status === 'shipped') notiMessage = 'Đơn hàng của bạn đang trên đường giao trực tiếp đến bạn!';
    if (status === 'completed') notiMessage = 'Đơn hàng đã được giao thành công!';
    if (status === 'cancelled') notiMessage = 'Rất tiếc! Đơn hàng của bạn đã bị hủy.';

    if (notiMessage && updatedOrder.userId) {
      await pushNotification(
        updatedOrder.userId, 
        `Cập nhật đơn hàng #${updatedOrder._id.toString().slice(-6).toUpperCase()}`, 
        notiMessage, 'order', `/order/${updatedOrder._id}`
      );
    }
    return res.status(200).json({ success: true, message: 'Cập nhật trạng thái thành công!', data: updatedOrder });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};

export const calculateCheckoutPrice = async (userId, cartItems, couponCode = null) => {
  let subTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  let discountAmount = 0;
  let appliedDiscounts = []; 
  let appliedCouponId = null; 

  const existingOrder = await Order.findOne({ userId: userId, status: { $ne: 'cancelled' } });

  if (!existingOrder) {
    const firstOrderDiscount = subTotal * 0.15;
    discountAmount += firstOrderDiscount;
    appliedDiscounts.push("Giảm 15% ưu đãi đơn hàng đầu tiên");
  }

  if (couponCode) {
    const coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });
    const user = await User.findById(userId); 

    if (!coupon) appliedDiscounts.push("❌ Mã giảm giá không tồn tại");
    else if (!coupon.isActive) appliedDiscounts.push("❌ Mã giảm giá đã bị khóa");
    else if (new Date(coupon.expiryDate) < new Date()) appliedDiscounts.push("❌ Mã giảm giá đã hết hạn");
    else if (coupon.usedCount >= coupon.usageLimit) appliedDiscounts.push("❌ Mã giảm giá đã hết lượt sử dụng");
    else {
      let isEligible = true;
      if (coupon.targetAudience === 'group') {
        isEligible = false;
        if (coupon.groupType === 'premium') {
          if (user.membership?.isPremium && new Date(user.membership?.expireAt) > new Date()) isEligible = true;
        } else if (['newbie', 'normal', 'silver', 'gold', 'vip'].includes(coupon.groupType)) {
          if (user.tier === coupon.groupType) isEligible = true;
        } else if (coupon.groupType === 'inactive') {
          if (user.tier === 'newbie') isEligible = true; 
        }
      }

      if (!isEligible) {
        appliedDiscounts.push("❌ Mã này chỉ dành cho nhóm đặc quyền!");
      } else {
        const couponDiscount = subTotal * (coupon.discountPercent / 100);
        discountAmount += couponDiscount;
        appliedDiscounts.push(`Áp dụng mã ${coupon.code} (Giảm ${coupon.discountPercent}%)`);
        appliedCouponId = coupon._id; 
      }
    }
  }

  let finalPrice = Math.max(0, subTotal - discountAmount);
  return { originalPrice: subTotal, totalDiscount: discountAmount, finalPrice: finalPrice, messages: appliedDiscounts, appliedCouponId: appliedCouponId };
};

export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id; 
    const order = await Order.findById(id).populate({ path: 'products.productId', select: 'name imageUrl price' }).populate('userId', 'name email'); 

    if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng!' });

    const isAdmin = req.user.role === 'admin';
    const isOwner = order.userId._id.toString() === userId;

    if (!isAdmin && !isOwner) return res.status(403).json({ success: false, message: 'Không có quyền truy cập!' });
    return res.status(200).json({ success: true, data: order });
  } catch (error) {
    if (error.kind === 'ObjectId') return res.status(400).json({ success: false, message: 'Mã đơn hàng không hợp lệ!' });
    return res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};

export const previewCheckoutPrice = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { couponCode } = req.body;
    const cart = await Cart.findOne({ user_id: userId }).populate('items.product_id');
    if (!cart || cart.items.length === 0) return res.status(400).json({ success: false, message: 'Giỏ hàng trống!' });

    const itemsForPricing = cart.items.map(item => ({ price: item.product_id.price, quantity: item.quantity }));
    const pricingInfo = await calculateCheckoutPrice(userId, itemsForPricing, couponCode);

    if (couponCode && !pricingInfo.appliedCouponId) {
      return res.status(400).json({ success: false, message: pricingInfo.messages[pricingInfo.messages.length - 1] });
    }
    return res.status(200).json({ success: true, data: pricingInfo });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};

// ==========================================
// WEBHOOK HỨNG THANH TOÁN (TỰ ĐỘNG XỬ LÝ)
// ==========================================
export const payosWebhook = async (req, res) => {
  try {
    const webhookBody = req.body;
    const { data, signature } = webhookBody;

    if (!data || !signature) {
      console.error("❌ Webhook thiếu data hoặc signature");
      return res.json({ error: -1, message: "Thiếu dữ liệu", data: null });
    }

    const checksumKey = process.env.PAYOS_CHECKSUM_KEY;

    if (!checksumKey) {
      console.error("❌ Thiếu PAYOS_CHECKSUM_KEY");
      return res.json({ error: -1, message: "Server config lỗi", data: null });
    }

    // -------------------------------------------------------
    // ✅ BĂM CHUẨN PAYOS: LẤY ĐỘNG TOÀN BỘ TRƯỜNG TRONG `data`
    // Tuyệt đối không gõ cứng các trường vì PayOS có thể gửi thêm/bớt
    // -------------------------------------------------------
    const sortedKeys = Object.keys(data).sort();

    const signString = sortedKeys
      .map(key => {
        const value = data[key];
        // Ép kiểu an toàn: null/undefined -> "", còn lại -> String
        const strValue = (value === null || value === undefined) ? "" : String(value);
        return `${key}=${strValue}`;
      })
      .join('&');

    const mySignature = crypto
      .createHmac('sha256', checksumKey)
      .update(signString)
      .digest('hex');

    console.log("👉 SIGN STRING WEBHOOK:", signString);
    console.log("👉 PayOS Signature:", signature);
    console.log("👉 My Signature:", mySignature);

    if (mySignature !== signature) {
      console.warn("⚠️ Sai chữ ký Webhook!");
      return res.json({ error: -1, message: "Invalid signature", data: null });
    }

    // -------------------------------------------------------
    // ✅ XỬ LÝ THANH TOÁN THÀNH CÔNG
    // SỬA QUAN TRỌNG: code nằm ở webhookBody chứ KHÔNG PHẢI trong data
    // -------------------------------------------------------
    if (webhookBody.code === "00") {
      const actualOrderCode = data.orderCode;

      const order = await Order.findOne({
        $or: [
          { payosOrderCode: actualOrderCode },
          { payosOrderCode: Number(actualOrderCode) }
        ]
      });

      if (order && order.paymentStatus !== "paid") {
        // 1. Update trạng thái
        order.paymentStatus = "paid";
        order.status = "processing";
        await order.save();

        // 2. Trừ kho (làm bên trên)
        // for (const item of order.products) {
        //   await Product.findByIdAndUpdate(item.productId, {
        //     $inc: { stock: -item.quantity }
        //   });
        // }

        // 3. Socket notify
        try {
          const io = socketUtil.getIo();
          const userSocketId = socketUtil.getUserSocket(order.userId.toString());

          if (userSocketId) {
            io.to(userSocketId).emit('payment_success', {
              orderId: order._id.toString(),
              orderCode: actualOrderCode,
              status: 'paid'
            });
            console.log(`🚀 Đã bắn Socket cho User: ${order.userId}`);
          }
        } catch (err) {
          console.error("🚨 Socket error:", err.message);
        }

        console.log(`✅ Đơn hàng ${actualOrderCode} đã thanh toán thành công`);
      }
    }

    // ❗ LUÔN trả error:0 để báo cho PayOS biết đã nhận thành công
    return res.json({ error: 0, message: "Ok", data: null });

  } catch (error) {
    console.error("❌ Webhook error:", error);
    return res.json({ error: -1, message: "Internal Error", data: null });
  }
};


// ==========================================
// HỦY ĐƠN HÀNG TỪ PHÍA NGƯỜI DÙNG (USER)
// ==========================================
export const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params; // Lấy ID đơn hàng từ URL
    const userId = req.user._id || req.user.id; // Lấy ID người dùng đang đăng nhập

    // 1. Tìm đơn hàng
    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng!' });
    }

    // 2. Kiểm tra quyền sở hữu (Tránh User này hủy đơn của User khác)
    if (order.userId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền hủy đơn hàng này!' });
    }

    // 3. Kiểm tra trạng thái (Chỉ được hủy khi đang pending)
    if (order.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: 'Không thể hủy! Đơn hàng này đang được xử lý hoặc đã giao.' 
      });
    }

    //4
    for (const item of order.products) {
      await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity } });
    }
    // 5. HOÀN LẠI MÃ GIẢM GIÁ (Nếu có áp dụng)
    // Giả sử model Order của bạn có lưu lại couponCode đã dùng
    if (order.couponCode) {
      const coupon = await Coupon.findOne({ code: order.couponCode });
      if (coupon) {
        // Trừ đi 1 lượt sử dụng
        coupon.usedCount = Math.max(0, coupon.usedCount - 1);
        
        // Xóa User khỏi danh sách đã sử dụng (Để họ có thể dùng lại cho đơn khác)
        coupon.usedBy = coupon.usedBy.filter(u => u.userId.toString() !== userId.toString());
        await coupon.save();
      }
    }

    // 6. XÓA LINK THANH TOÁN TRÊN PAYOS (Nếu là đơn VietQR)
    if (order.paymentMethod === 'VietQR' && order.payosOrderCode) {
      try {
        const cancelData = { cancellationReason: "Khách hàng tự hủy đơn" };
        
        await fetch(`https://api-merchant.payos.vn/v2/payment-requests/${order.payosOrderCode}/cancel`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-client-id': process.env.PAYOS_CLIENT_ID,
            'x-api-key': process.env.PAYOS_API_KEY
          },
          body: JSON.stringify(cancelData)
        });
        console.log(`[PAYOS] Đã hủy mã QR của đơn hàng ${order.payosOrderCode}`);
      } catch (payosErr) {
        // Dù PayOS lỗi thì vẫn cứ cho khách hủy trong DB của mình
        console.error("Lỗi khi hủy đơn trên PayOS:", payosErr.message);
      }
    }

    // 7. CẬP NHẬT TRẠNG THÁI ĐƠN HÀNG THÀNH 'CANCELLED'
    order.status = 'cancelled';
    await order.save();

    // 8. BẮN THÔNG BÁO CHO USER
    await pushNotification(
      userId,
      `Đơn hàng #${order._id.toString().slice(-6).toUpperCase()} đã hủy`,
      `Bạn đã hủy đơn hàng thành công.`,
      'order',
      `/order/${order._id}`
    );

    return res.status(200).json({ 
      success: true, 
      message: 'Hủy đơn hàng thành công!',
      data: order 
    });

  } catch (error) {
    console.error("❌ Lỗi cancelOrder:", error);
    return res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};