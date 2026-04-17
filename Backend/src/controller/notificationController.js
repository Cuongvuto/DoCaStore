import mongoose from 'mongoose';
import Notification from '../models/notificationModel.js';
import NotificationRead from '../models/notificationReadModel.js';
import Order from '../models/oderModel.js';
import User from '../models/userModel.js';
import socketUtil from '../utils/socket.js';

// ==========================================
// CÁC HÀM DÀNH CHO USER
// ==========================================

// 1. Lấy danh sách thông báo (Hỗ trợ phân trang + Lấy thông báo cá nhân/nhóm/hệ thống)
export const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // TỐI ƯU QUERY: Lấy thông báo cá nhân HOẶC toàn hệ thống HOẶC thuộc nhóm được gửi
    const query = {
      $or: [
        { userId: userId }, 
        { userId: null, targetAudience: { $in: ['all', undefined] } }, 
        { userId: null, targetAudience: 'group', targetUsers: userId }
      ]
    };

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments(query);

    // Lọc ra các ID thông báo không phải cá nhân (hệ thống/nhóm)
    const systemNotiIds = notifications.filter(n => !n.userId).map(n => n._id);
    
    // Tìm các thông báo hệ thống/nhóm mà user đã đọc
    const readSystemRecords = await NotificationRead.find({ 
      userId, 
      notificationId: { $in: systemNotiIds } 
    });
    
    const readSystemSet = new Set(readSystemRecords.map(r => r.notificationId.toString()));

    // Map lại data: kết hợp trạng thái isRead cho từng loại thông báo
    const mappedData = notifications.map(noti => {
      const isSystem = !noti.userId;
      return {
        ...noti.toObject(),
        isRead: isSystem ? readSystemSet.has(noti._id.toString()) : noti.isRead
      };
    });

    return res.status(200).json({ 
      success: true, 
      currentPage: page, 
      totalPages: Math.ceil(total / limit), 
      data: mappedData 
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi Server!', error: error.message });
  }
};

// 2. Đánh dấu 1 thông báo là "đã đọc"
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id || req.user._id;

    const notification = await Notification.findById(id);
    if (!notification) return res.status(404).json({ success: false, message: 'Không tìm thấy!' });

    if (!notification.userId) {
      // Thông báo hệ thống/nhóm: Lưu vào NotificationRead
      await NotificationRead.updateOne(
        { userId, notificationId: id }, 
        { userId, notificationId: id }, 
        { upsert: true }
      );
    } else {
      // Thông báo cá nhân: Update trực tiếp
      await Notification.findByIdAndUpdate(id, { isRead: true });
    }
    return res.status(200).json({ success: true, message: 'Đã đánh dấu đọc!' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi Server!' });
  }
};

// 3. Đánh dấu TẤT CẢ là "đã đọc"
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;

    // Đánh dấu các thông báo cá nhân là đã đọc
    await Notification.updateMany({ userId: userId, isRead: false }, { isRead: true });

    // Đánh dấu các thông báo hệ thống/nhóm là đã đọc bằng cách bulk insert vào NotificationRead
    const query = {
      $or: [
        { userId: null, targetAudience: { $in: ['all', undefined] } },
        { userId: null, targetAudience: 'group', targetUsers: userId }
      ]
    };
    
    const systemNotis = await Notification.find(query).select('_id');
    const systemNotiIds = systemNotis.map(n => n._id);

    const readRecords = await NotificationRead.find({ userId, notificationId: { $in: systemNotiIds } });
    const readIds = readRecords.map(r => r.notificationId.toString());
    
    const unreadIds = systemNotiIds.filter(id => !readIds.includes(id.toString()));

    if (unreadIds.length > 0) {
      const bulkOps = unreadIds.map(id => ({ userId, notificationId: id }));
      await NotificationRead.insertMany(bulkOps);
    }

    return res.status(200).json({ success: true, message: 'Đã đánh dấu đọc tất cả!' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi Server!', error: error.message });
  }
};

// 4. Đếm số lượng thông báo chưa đọc
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    
    // Đếm thông báo cá nhân chưa đọc
    const unreadPersonal = await Notification.countDocuments({ userId, isRead: false });

    // Lấy danh sách ID thông báo hệ thống/nhóm dành cho user này
    const systemQuery = {
      $or: [
        { userId: null, targetAudience: { $in: ['all', undefined] } },
        { userId: null, targetAudience: 'group', targetUsers: userId }
      ]
    };
    
    const systemNotis = await Notification.find(systemQuery).select('_id');
    const systemNotiIds = systemNotis.map(n => n._id);

    // Đếm số lượng hệ thống/nhóm ĐÃ ĐỌC
    const readSystem = await NotificationRead.countDocuments({ 
      userId, 
      notificationId: { $in: systemNotiIds } 
    });
    
    const unreadSystem = Math.max(0, systemNotiIds.length - readSystem);
    
    return res.status(200).json({ success: true, unreadCount: unreadPersonal + unreadSystem });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi Server!' });
  }
};

// 5. Hàm helper dùng để gọi nội bộ (khi có event mới như tạo đơn hàng, thanh toán)
export const pushNotification = async (userId, title, message, type = 'system', linkUrl = '') => {
  try {
    const newNoti = new Notification({ 
      userId: userId || null, 
      title, 
      message, 
      type, 
      linkUrl 
    });
    await newNoti.save();

    // SOCKET BÁO THÔNG BÁO NỘI BỘ (Chỉ gửi 1 người)
    if (userId) {
      const io = socketUtil.getIo();
      const userSocketId = socketUtil.getUserSocket(userId.toString());
      if (userSocketId) {
        io.to(userSocketId).emit('NEW_NOTIFICATION', { message: title, noti: newNoti });
      }
    }

    return true;
  } catch (error) {
    console.error("❌ Lỗi khi bắn thông báo nội bộ:", error);
    return false;
  }
};

// ==========================================
// CÁC HÀM DÀNH CHO ADMIN
// ==========================================

// 1. Admin lấy toàn bộ thông báo (Giữ nguyên)
export const getAllNotificationsAdmin = async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: notifications });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi Server!' });
  }
};

// 2. Admin tạo thông báo mới (ĐÃ ĐỘ THÊM SOCKET Ở CUỐI)
export const createNotificationAdmin = async (req, res) => {
  try {
    const { title, message, type, linkUrl, targetAudience = 'all', userId, groupType } = req.body;
    let targetUsersArray = [];

    // XỬ LÝ LỌC NHÓM KHÁCH HÀNG 
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

      if (targetUsersArray.length === 0) {
        return res.status(400).json({ success: false, message: 'Nhóm khách hàng này hiện tại không có ai!' });
      }
    }

    // Tạo bản ghi 
    const newNoti = new Notification({
      userId: targetAudience === 'specific' ? userId : null,
      title,
      message,
      type: type || 'system',
      linkUrl,
      targetAudience,
      groupType: targetAudience === 'group' ? groupType : null,
      targetUsers: targetUsersArray
    });

    await newNoti.save();

    // ==================================================
    // PHẦN SOCKET.IO: HÉT LÊN THEO ĐÚNG LOẠI ĐỐI TƯỢNG
    // ==================================================
    const io = socketUtil.getIo();

    if (targetAudience === 'all') {
      // 1. Báo cho toàn mạng (Ai đang online nhận hết)
      io.emit('NEW_NOTIFICATION', { message: title, noti: newNoti });
      
    } else if (targetAudience === 'specific' && userId) {
      // 2. Báo cho 1 ông cụ thể
      const userSocketId = socketUtil.getUserSocket(userId.toString());
      if (userSocketId) {
        io.to(userSocketId).emit('NEW_NOTIFICATION', { message: title, noti: newNoti });
      }
      
    } else if (targetAudience === 'group') {
      // 3. Báo cho 1 nhóm (Duyệt qua mảng ID để gửi cho những ai đang online trong nhóm đó)
      targetUsersArray.forEach(id => {
        const userSocketId = socketUtil.getUserSocket(id.toString());
        if (userSocketId) {
          io.to(userSocketId).emit('NEW_NOTIFICATION', { message: title, noti: newNoti });
        }
      });
    }

    return res.status(201).json({ success: true, message: "Gửi thông báo thành công", data: newNoti });
  } catch (error) {
    console.error("Lỗi gửi thông báo admin:", error);
    return res.status(500).json({ success: false, message: 'Lỗi Server!' });
  }
};

// 3. Admin xóa thông báo (Giữ nguyên)
export const deleteNotificationAdmin = async (req, res) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    return res.status(200).json({ success: true, message: "Đã xóa thông báo" });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi Server!' });
  }
};