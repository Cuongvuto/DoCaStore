import mongoose from 'mongoose';
import Coupon from '../models/couponModel.js';
import User from '../models/userModel.js';
import Notification from '../models/notificationModel.js';
import socketUtil from '../utils/socket.js';

// ================= ADMIN KÝ =================

// 1. Tạo mã giảm giá mới (Chỉ Admin)
export const createCoupon = async (req, res) => {
  try {
    const { code, discountPercent, expiryDate, usageLimit, targetAudience, groupType } = req.body;

    // Kiểm tra xem mã đã tồn tại chưa (tránh trùng lặp)
    const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (existingCoupon) {
      return res.status(400).json({
        success: false,
        message: 'Mã giảm giá này đã tồn tại!'
      });
    }

    const newCoupon = new Coupon({
      code: code.toUpperCase(), // Luôn lưu in hoa cho dễ nhìn
      discountPercent,
      expiryDate,
      usageLimit,
      targetAudience: targetAudience || 'all',
      groupType: targetAudience === 'group' ? groupType : null
    });

    await newCoupon.save();

    // ==========================================
    // GỬI THÔNG BÁO TỰ ĐỘNG SAU KHI TẠO MÃ
    // ==========================================
    try {
      let targetUsersArray = [];
      if (targetAudience === 'group') {
        let query = {};
        if (groupType === 'premium') {
          const now = new Date();
          query = { 'membership.isPremium': true, 'membership.expireAt': { $gt: now } };
        } 
        else if (['newbie', 'normal', 'silver', 'gold', 'vip'].includes(groupType)) {
          query = { tier: groupType };
        } 
        else if (groupType === 'inactive') {
          query = { tier: 'newbie' };
        }

        const usersInGroup = await User.find(query).select('_id');
        targetUsersArray = usersInGroup.map(u => u._id);
      }

      const titleMsg = `🎟 MÃ GIẢM GIÁ MỚI: ${newCoupon.code}`;
      const descMsg = `Tặng ngay ${newCoupon.discountPercent}% cho tài khoản của bạn. Nhanh tay kẻo lỡ!`;

      const newNoti = new Notification({
        userId: null, 
        title: titleMsg,
        message: descMsg,
        type: 'promotion',
        linkUrl: '/cart',
        targetAudience: targetAudience || 'all',
        groupType: targetAudience === 'group' ? groupType : null,
        targetUsers: targetUsersArray
      });
      await newNoti.save();

      const io = socketUtil.getIo();
      if (!targetAudience || targetAudience === 'all') {
        io.emit('NEW_NOTIFICATION', { message: titleMsg, noti: newNoti });
      } else if (targetAudience === 'group') {
        targetUsersArray.forEach(id => {
          const userSocketId = socketUtil.getUserSocket(id.toString());
          if (userSocketId) {
            io.to(userSocketId).emit('NEW_NOTIFICATION', { message: titleMsg, noti: newNoti });
          }
        });
      }
    } catch (pushNotiErr) {
      console.error("Lỗi tự động gửi thông báo khi tạo Coupon:", pushNotiErr);
      // Tiếp tục trả về API coupon thành công cho dù báo lỗi socket nha
    }

    return res.status(201).json({
      success: true,
      message: 'Tạo mã giảm giá thành công!',
      data: newCoupon
    });

  } catch (error) {
    console.error("❌ Lỗi createCoupon:", error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi Server!',
      error: error.message
    });
  }
};

// 2. Lấy danh sách tất cả mã giảm giá (Chỉ Admin)
export const getAllCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách mã giảm giá thành công!',
      data: coupons
    });
  } catch (error) {
    console.error("❌ Lỗi getAllCoupons:", error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi Server!',
      error: error.message
    });
  }
};

// 3. Bật/Tắt một mã giảm giá (Chỉ Admin)
export const toggleCouponStatus = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'ID không hợp lệ!' });
    }

    const coupon = await Coupon.findById(id);
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy mã giảm giá!' });
    }

    // Đảo ngược trạng thái (Đang true thành false, false thành true)
    coupon.isActive = !coupon.isActive;
    await coupon.save();

    return res.status(200).json({
      success: true,
      message: coupon.isActive ? 'Đã kích hoạt mã!' : 'Đã vô hiệu hóa mã!',
      data: coupon
    });
  } catch (error) {
    console.error("❌ Lỗi toggleCouponStatus:", error);
    return res.status(500).json({ success: false, message: 'Lỗi Server!' });
  }
};



// 4. Khách hàng kiểm tra mã giảm giá trong Giỏ hàng
export const validateCoupon = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập mã giảm giá!' });
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase() });

    // Kiểm tra các điều kiện: Có tồn tại? Có đang bật? Đã hết hạn chưa?
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Mã giảm giá không tồn tại!' });
    }
    if (!coupon.isActive) {
      return res.status(400).json({ success: false, message: 'Mã giảm giá này đã bị khóa!' });
    }
    if (new Date(coupon.expiryDate) < new Date()) {
      return res.status(400).json({ success: false, message: 'Mã giảm giá đã hết hạn!' });
    }
    if (coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({ success: false, message: 'Mã giảm giá đã hết lượt sử dụng!' });
    }
    const userId = req.user.id;
    const userUsage = coupon.usedBy.find(u => u.userId.toString() === userId.toString());
    if (userUsage && userUsage.count >= 1) {
      return res.status(400).json({
        success: false,
        message: 'Bạn đã dùng mã này rồi! Mỗi tài khoản chỉ được dùng 1 lần.'
      });
    }

    // Kiểm tra nhóm khách hàng hợp lệ (Target Audience)
    if (coupon.targetAudience === 'group') {
      const user = await User.findById(userId);
      let matches = false;
      
      if (coupon.groupType === 'premium') {
        if (user.membership?.isPremium && new Date(user.membership?.expireAt) > new Date()) matches = true;
      } else if (['newbie', 'normal', 'silver', 'gold', 'vip'].includes(coupon.groupType)) {
        if (user.tier === coupon.groupType) matches = true;
      } else if (coupon.groupType === 'inactive') {
        if (user.tier === 'newbie') matches = true; 
      }
      
      if (!matches) {
        return res.status(400).json({
          success: false,
          message: 'Mã giảm giá này đã được chỉ định cho một nhóm khách hàng đặc biệt và không tương thích với tài khoản của bạn.'
        });
      }
    }

    // Nếu mọi thứ OK, trả về phần trăm giảm giá để Frontend tính toán
    return res.status(200).json({
      success: true,
      message: 'Áp dụng mã thành công!',
      data: {
        code: coupon.code,
        discountPercent: coupon.discountPercent
      }
    });

  } catch (error) {
    console.error("❌ Lỗi validateCoupon:", error);
    return res.status(500).json({ success: false, message: 'Lỗi Server!' });
  }
};