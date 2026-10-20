import mongoose from 'mongoose';
import Notification from '../models/notificationModel.js';
import NotificationRead from '../models/notificationReadModel.js';
import { pagination, queryText, escapeRegex } from '../utils/adminQuery.js';
import { contentError } from '../utils/contentValidation.js';
import { failure } from '../services/commercePolicy.js';
import { deliverNotification } from '../services/notificationService.js';

import socketUtil from '../utils/socket.js';

// ==========================================
// CÁC HÀM DÀNH CHO USER
// ==========================================

// 1. Lấy danh sách thông báo (Hỗ trợ phân trang + Lấy thông báo cá nhân/nhóm/hệ thống)
export const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { page, limit, skip } = pagination(req.query);

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
        ...noti.toObject(), targetUsers: undefined,
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
    return contentError(res, error);
  }
};

// 2. Đánh dấu 1 thông báo là "đã đọc"
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id || req.user._id;

    const notification = await Notification.findById(id);
    if (!notification) return res.status(404).json({ success: false, message: 'Không tìm thấy!' });

    const owns = notification.userId && String(notification.userId) === String(userId);
    const visible = !notification.userId && (notification.targetAudience === 'all' || notification.targetAudience === 'group' && notification.targetUsers.some(id => String(id) === String(userId)));
    if (!owns && !visible) return res.status(403).json({ success: false, message: 'Bạn không có quyền xem thông báo này.' });
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
      const bulkOps = unreadIds.map(id => ({ updateOne: { filter: { userId, notificationId: id }, update: { $setOnInsert: { userId, notificationId: id } }, upsert: true } }));
      await NotificationRead.bulkWrite(bulkOps, { ordered: false });
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
    const { page, limit, skip } = pagination(req.query);
    const search = queryText(req.query.search);
    const filter = search ? { title: { $regex: escapeRegex(search), $options: 'i' } } : {};
    const [data, totalCount] = await Promise.all([Notification.find(filter).select('-targetUsers').sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit), Notification.countDocuments(filter)]);
    return res.json({ success: true, data, totalCount, currentPage: page, totalPages: Math.max(1, Math.ceil(totalCount / limit)) });
  } catch (error) { return contentError(res, error); }
};
export const createNotificationAdmin = async (req, res) => {
  try { return res.status(201).json({ success: true, data: await deliverNotification(req.body, req.user.id || req.user._id, req.get('Idempotency-Key')), message: 'Đã gửi thông báo.' }); }
  catch (error) { return contentError(res, error); }
};
export const deleteNotificationAdmin = async (req, res) => {
  try {
    if (!await Notification.findByIdAndDelete(req.params.id)) throw failure(404, 'Thông báo không còn tồn tại.');
    await NotificationRead.deleteMany({ notificationId: req.params.id });
    return res.json({ success: true, message: 'Đã xóa thông báo.' });
  } catch (error) { return contentError(res, error); }
};
